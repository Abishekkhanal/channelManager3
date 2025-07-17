const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { sendBookingConfirmation } = require('../utils/email');

const router = express.Router();

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Public
router.post('/', [
  body('room').isMongoId().withMessage('Valid room ID is required'),
  body('guest.name').notEmpty().withMessage('Guest name is required'),
  body('guest.email').isEmail().withMessage('Valid guest email is required'),
  body('guest.phone').notEmpty().withMessage('Guest phone is required'),
  body('guest.address.country').notEmpty().withMessage('Guest country is required'),
  body('dates.checkIn').isISO8601().withMessage('Valid check-in date is required'),
  body('dates.checkOut').isISO8601().withMessage('Valid check-out date is required'),
  body('occupancy.adults').isInt({ min: 1 }).withMessage('At least 1 adult required'),
  body('occupancy.children').optional().isInt({ min: 0 }).withMessage('Children count cannot be negative'),
  body('payment.method').isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash', 'crypto']).withMessage('Valid payment method is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { room: roomId, guest, dates, occupancy, payment } = req.body;

    // Validate dates
    const checkIn = new Date(dates.checkIn);
    const checkOut = new Date(dates.checkOut);
    const now = new Date();

    if (checkIn < now) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date cannot be in the past'
      });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
      });
    }

    // Get room details
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check room availability
    const isAvailable = room.isAvailableForDates(checkIn, checkOut);
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Room is not available for the selected dates'
      });
    }

    // Check occupancy limits
    const totalGuests = occupancy.adults + (occupancy.children || 0);
    if (totalGuests > room.capacity.maxOccupancy) {
      return res.status(400).json({
        success: false,
        message: `Room capacity exceeded. Maximum occupancy: ${room.capacity.maxOccupancy}`
      });
    }

    // Check for existing bookings
    const existingBookings = await Booking.find({
      room: roomId,
      'dates.checkIn': { $lt: checkOut },
      'dates.checkOut': { $gt: checkIn },
      status: { $in: ['confirmed', 'checked_in'] }
    });

    if (existingBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Room is already booked for the selected dates'
      });
    }

    // Calculate pricing
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24));
    const roomRate = room.currentPrice;
    const subtotal = roomRate * nights;
    const taxPercentage = 10; // 10% tax
    const taxAmount = subtotal * (taxPercentage / 100);
    const total = subtotal + taxAmount;

    // Create booking
    const booking = await Booking.create({
      room: roomId,
      guest,
      dates: {
        checkIn,
        checkOut,
        nights
      },
      occupancy: {
        adults: occupancy.adults,
        children: occupancy.children || 0,
        total: totalGuests
      },
      pricing: {
        roomRate,
        subtotal,
        taxes: {
          amount: taxAmount,
          percentage: taxPercentage
        },
        total,
        currency: room.price.currency
      },
      payment: {
        method: payment.method,
        status: 'pending'
      },
      source: 'direct',
      createdBy: req.user ? req.user.id : null
    });

    // Populate room details
    await booking.populate('room', 'name roomNumber category type');

    // Send confirmation email (in a real app, this would be queued)
    try {
      await sendBookingConfirmation(booking);
      booking.notifications.confirmationSent = true;
      await booking.save();
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get all bookings with filters
// @route   GET /api/bookings
// @access  Private (Admin only)
router.get('/', protect, authorize('admin', 'super_admin'), [
  query('status').optional().isIn(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show']),
  query('source').optional().isIn(['direct', 'booking_com', 'agoda', 'airbnb', 'expedia', 'phone', 'walk_in']),
  query('checkIn').optional().isISO8601(),
  query('checkOut').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      status,
      source,
      checkIn,
      checkOut,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    // Build query
    let query = {};

    if (status) query.status = status;
    if (source) query.source = source;

    // Date filters
    if (checkIn) {
      query['dates.checkIn'] = { $gte: new Date(checkIn) };
    }
    if (checkOut) {
      query['dates.checkOut'] = { $lte: new Date(checkOut) };
    }

    // Pagination
    const skip = (page - 1) * limit;
    const total = await Booking.countDocuments(query);

    const bookings = await Booking.find(query)
      .populate('room', 'name roomNumber category type')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: bookings.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: bookings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Public (with booking ID) or Private (Admin)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('room', 'name roomNumber category type images amenities')
      .populate('createdBy', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is authorized to view this booking
    if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
      // Admin can view any booking
    } else {
      // For public access, we might want to add additional security
      // For now, anyone with the booking ID can view it
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get booking by booking ID
// @route   GET /api/bookings/booking/:bookingId
// @access  Public
router.get('/booking/:bookingId', async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId })
      .populate('room', 'name roomNumber category type images amenities')
      .populate('createdBy', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private (Admin only)
router.put('/:id/status', protect, authorize('admin', 'super_admin'), [
  body('status').isIn(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show']).withMessage('Valid status is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await booking.updateStatus(status, req.user.id);

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Public (with booking ID) or Private (Admin)
router.put('/:id/cancel', optionalAuth, [
  body('reason').optional().notEmpty().withMessage('Cancellation reason cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be cancelled
    if (!booking.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be cancelled at this time'
      });
    }

    // Calculate cancellation fee
    const cancellationFee = booking.calculateCancellationFee();
    const refundAmount = booking.pricing.total - cancellationFee;

    // Update booking
    booking.status = 'cancelled';
    booking.cancellation = {
      isCancelled: true,
      cancelledAt: new Date(),
      cancelledBy: req.user ? 'admin' : 'guest',
      reason: reason || 'Cancelled by guest',
      refundAmount,
      cancellationFee
    };

    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        booking,
        cancellationFee,
        refundAmount
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update booking details
// @route   PUT /api/bookings/:id
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin', 'super_admin'), [
  body('guest.name').optional().notEmpty().withMessage('Guest name cannot be empty'),
  body('guest.email').optional().isEmail().withMessage('Valid guest email is required'),
  body('guest.phone').optional().notEmpty().withMessage('Guest phone cannot be empty'),
  body('dates.checkIn').optional().isISO8601().withMessage('Valid check-in date is required'),
  body('dates.checkOut').optional().isISO8601().withMessage('Valid check-out date is required'),
  body('occupancy.adults').optional().isInt({ min: 1 }).withMessage('At least 1 adult required'),
  body('occupancy.children').optional().isInt({ min: 0 }).withMessage('Children count cannot be negative')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Validate date changes if provided
    if (req.body.dates) {
      const { checkIn, checkOut } = req.body.dates;
      if (checkIn && checkOut) {
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        if (checkOutDate <= checkInDate) {
          return res.status(400).json({
            success: false,
            message: 'Check-out date must be after check-in date'
          });
        }

        // Check room availability for new dates
        const room = await Room.findById(booking.room);
        const isAvailable = room.isAvailableForDates(checkInDate, checkOutDate);
        
        if (!isAvailable) {
          return res.status(400).json({
            success: false,
            message: 'Room is not available for the new dates'
          });
        }
      }
    }

    // Update booking
    booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { ...req.body, modifiedBy: req.user.id },
      { new: true, runValidators: true }
    ).populate('room', 'name roomNumber category type');

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete booking
// @route   DELETE /api/bookings/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Only allow deletion of cancelled bookings
    if (booking.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Only cancelled bookings can be deleted'
      });
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get booking statistics
// @route   GET /api/bookings/stats/overview
// @access  Private (Admin only)
router.get('/stats/overview', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Total bookings
    const totalBookings = await Booking.countDocuments();
    
    // Bookings this month
    const monthlyBookings = await Booking.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Revenue this month
    const monthlyRevenue = await Booking.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: { $in: ['confirmed', 'checked_out'] } } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } }
    ]);

    // Yearly revenue
    const yearlyRevenue = await Booking.aggregate([
      { $match: { createdAt: { $gte: startOfYear }, status: { $in: ['confirmed', 'checked_out'] } } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } }
    ]);

    // Booking status distribution
    const statusDistribution = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Source distribution
    const sourceDistribution = await Booking.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalBookings,
        monthlyBookings,
        monthlyRevenue: monthlyRevenue.length > 0 ? monthlyRevenue[0].total : 0,
        yearlyRevenue: yearlyRevenue.length > 0 ? yearlyRevenue[0].total : 0,
        statusDistribution,
        sourceDistribution
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
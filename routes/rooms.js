const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all rooms with filters
// @route   GET /api/rooms
// @access  Public
router.get('/', [
  query('category').optional().isIn(['Single', 'Double', 'Deluxe', 'Suite', 'Presidential', 'Family', 'Twin']),
  query('type').optional().isIn(['Standard', 'Superior', 'Deluxe', 'Executive', 'Premium']),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('maxOccupancy').optional().isInt({ min: 1 }),
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
      category,
      type,
      minPrice,
      maxPrice,
      maxOccupancy,
      checkIn,
      checkOut,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    // Build query
    let query = { 'availability.isActive': true };

    if (category) query.category = category;
    if (type) query.type = type;
    if (maxOccupancy) query['capacity.maxOccupancy'] = { $gte: parseInt(maxOccupancy) };

    // Price range filter
    if (minPrice || maxPrice) {
      query['price.basePrice'] = {};
      if (minPrice) query['price.basePrice'].$gte = parseFloat(minPrice);
      if (maxPrice) query['price.basePrice'].$lte = parseFloat(maxPrice);
    }

    // Date availability filter
    if (checkIn && checkOut) {
      const startDate = new Date(checkIn);
      const endDate = new Date(checkOut);

      // Find rooms that are not booked during the requested period
      const bookedRooms = await Booking.find({
        'dates.checkIn': { $lt: endDate },
        'dates.checkOut': { $gt: startDate },
        status: { $in: ['confirmed', 'checked_in'] }
      }).distinct('room');

      query._id = { $nin: bookedRooms };

      // Also check blocked dates
      query.$and = [
        {
          $or: [
            { 'availability.blockedDates': { $size: 0 } },
            {
              'availability.blockedDates': {
                $not: {
                  $elemMatch: {
                    startDate: { $lt: endDate },
                    endDate: { $gt: startDate }
                  }
                }
              }
            }
          ]
        }
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;
    const total = await Room.countDocuments(query);

    const rooms = await Room.find(query)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: rooms.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: rooms
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate('createdBy', 'name email');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create room
// @route   POST /api/rooms
// @access  Private (Admin only)
router.post('/', protect, authorize('admin', 'super_admin'), [
  body('name').notEmpty().withMessage('Room name is required'),
  body('description').notEmpty().withMessage('Room description is required'),
  body('roomNumber').notEmpty().withMessage('Room number is required'),
  body('category').isIn(['Single', 'Double', 'Deluxe', 'Suite', 'Presidential', 'Family', 'Twin']),
  body('type').isIn(['Standard', 'Superior', 'Deluxe', 'Executive', 'Premium']),
  body('price.basePrice').isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
  body('capacity.maxOccupancy').isInt({ min: 1 }).withMessage('Max occupancy must be at least 1'),
  body('capacity.adults').isInt({ min: 1 }).withMessage('Adult capacity must be at least 1'),
  body('bedConfiguration.bedType').isIn(['Single', 'Double', 'Queen', 'King', 'Twin', 'Sofa Bed']),
  body('bedConfiguration.bedCount').isInt({ min: 1 }).withMessage('Bed count must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Check if room number already exists
    const existingRoom = await Room.findOne({ roomNumber: req.body.roomNumber });
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'Room number already exists'
      });
    }

    const room = await Room.create({
      ...req.body,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin', 'super_admin'), [
  body('name').optional().notEmpty().withMessage('Room name cannot be empty'),
  body('description').optional().notEmpty().withMessage('Room description cannot be empty'),
  body('roomNumber').optional().notEmpty().withMessage('Room number cannot be empty'),
  body('category').optional().isIn(['Single', 'Double', 'Deluxe', 'Suite', 'Presidential', 'Family', 'Twin']),
  body('type').optional().isIn(['Standard', 'Superior', 'Deluxe', 'Executive', 'Premium']),
  body('price.basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
  body('capacity.maxOccupancy').optional().isInt({ min: 1 }).withMessage('Max occupancy must be at least 1'),
  body('capacity.adults').optional().isInt({ min: 1 }).withMessage('Adult capacity must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    let room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if room number already exists (if being updated)
    if (req.body.roomNumber && req.body.roomNumber !== room.roomNumber) {
      const existingRoom = await Room.findOne({ roomNumber: req.body.roomNumber });
      if (existingRoom) {
        return res.status(400).json({
          success: false,
          message: 'Room number already exists'
        });
      }
    }

    room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if room has active bookings
    const activeBookings = await Booking.find({
      room: req.params.id,
      status: { $in: ['confirmed', 'checked_in'] }
    });

    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete room with active bookings'
      });
    }

    await Room.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Check room availability
// @route   POST /api/rooms/:id/availability
// @access  Public
router.post('/:id/availability', [
  body('checkIn').isISO8601().withMessage('Valid check-in date is required'),
  body('checkOut').isISO8601().withMessage('Valid check-out date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { checkIn, checkOut } = req.body;
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const isAvailable = room.isAvailableForDates(checkIn, checkOut);

    if (!isAvailable) {
      return res.json({
        success: true,
        available: false,
        message: 'Room is not available for the selected dates'
      });
    }

    // Check for existing bookings
    const existingBookings = await Booking.find({
      room: req.params.id,
      'dates.checkIn': { $lt: new Date(checkOut) },
      'dates.checkOut': { $gt: new Date(checkIn) },
      status: { $in: ['confirmed', 'checked_in'] }
    });

    if (existingBookings.length > 0) {
      return res.json({
        success: true,
        available: false,
        message: 'Room is already booked for the selected dates'
      });
    }

    // Calculate price for the period
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    const currentPrice = room.currentPrice;
    const totalPrice = currentPrice * nights;

    res.json({
      success: true,
      available: true,
      pricing: {
        pricePerNight: currentPrice,
        nights,
        totalPrice,
        currency: room.price.currency
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

// @desc    Get room statistics
// @route   GET /api/rooms/:id/stats
// @access  Private (Admin only)
router.get('/:id/stats', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Get booking statistics
    const totalBookings = await Booking.countDocuments({ room: req.params.id });
    const confirmedBookings = await Booking.countDocuments({ 
      room: req.params.id, 
      status: 'confirmed' 
    });
    const cancelledBookings = await Booking.countDocuments({ 
      room: req.params.id, 
      status: 'cancelled' 
    });

    // Calculate revenue
    const revenueData = await Booking.aggregate([
      { $match: { room: room._id, status: { $in: ['confirmed', 'checked_out'] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$pricing.total' } } }
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    res.json({
      success: true,
      data: {
        room: room.name,
        statistics: {
          totalBookings,
          confirmedBookings,
          cancelledBookings,
          totalRevenue,
          occupancyRate: room.statistics.occupancyRate,
          averageRating: room.statistics.averageRating
        }
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
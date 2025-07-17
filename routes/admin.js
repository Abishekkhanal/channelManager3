const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply admin protection to all routes
router.use(protect);
router.use(authorize('admin', 'super_admin'));

// @desc    Get admin dashboard data
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));

    // Basic counts
    const totalRooms = await Room.countDocuments();
    const activeRooms = await Room.countDocuments({ 'availability.isActive': true });
    const totalBookings = await Booking.countDocuments();
    const totalUsers = await User.countDocuments();

    // Recent bookings
    const recentBookings = await Booking.find()
      .populate('room', 'name roomNumber category')
      .sort('-createdAt')
      .limit(10);

    // Booking statistics
    const bookingStats = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.total' }
        }
      }
    ]);

    // Monthly revenue
    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          status: { $in: ['confirmed', 'checked_out'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.total' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Weekly bookings
    const weeklyBookings = await Booking.countDocuments({
      createdAt: { $gte: startOfWeek }
    });

    // Top performing rooms
    const topRooms = await Booking.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'checked_out'] }
        }
      },
      {
        $group: {
          _id: '$room',
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.total' }
        }
      },
      {
        $lookup: {
          from: 'rooms',
          localField: '_id',
          foreignField: '_id',
          as: 'room'
        }
      },
      {
        $unwind: '$room'
      },
      {
        $sort: { revenue: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Occupancy rate calculation
    const occupancyData = await Booking.aggregate([
      {
        $match: {
          'dates.checkIn': { $gte: startOfMonth },
          status: { $in: ['confirmed', 'checked_in', 'checked_out'] }
        }
      },
      {
        $group: {
          _id: null,
          totalNights: { $sum: '$dates.nights' }
        }
      }
    ]);

    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const totalAvailableNights = activeRooms * daysInMonth;
    const occupancyRate = occupancyData.length > 0 
      ? (occupancyData[0].totalNights / totalAvailableNights) * 100 
      : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalRooms,
          activeRooms,
          totalBookings,
          totalUsers,
          weeklyBookings,
          occupancyRate: Math.round(occupancyRate * 100) / 100
        },
        revenue: {
          monthly: monthlyRevenue.length > 0 ? monthlyRevenue[0].total : 0,
          monthlyBookings: monthlyRevenue.length > 0 ? monthlyRevenue[0].count : 0
        },
        bookingStats,
        recentBookings,
        topRooms
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

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
router.get('/users', [
  query('role').optional().isIn(['user', 'admin', 'super_admin']),
  query('isActive').optional().isBoolean(),
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
      role,
      isActive,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    // Build query
    let query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // Pagination
    const skip = (page - 1) * limit;
    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: users.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's booking history
    const bookings = await Booking.find({ 'guest.email': user.email })
      .populate('room', 'name roomNumber category')
      .sort('-createdAt')
      .limit(10);

    res.json({
      success: true,
      data: {
        user,
        bookings
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

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private (Admin only)
router.put('/users/:id', [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['user', 'admin', 'super_admin']).withMessage('Valid role is required'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent self-deactivation
    if (req.body.isActive === false && user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    // Prevent role change for super_admin unless done by super_admin
    if (req.body.role && user.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can modify super admin accounts'
      });
    }

    user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Super Admin only)
router.delete('/users/:id', authorize('super_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get system statistics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
router.get('/stats', [
  query('period').optional().isIn(['week', 'month', 'year']).withMessage('Valid period is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { period = 'month' } = req.query;
    const today = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(today.setDate(today.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    // Revenue statistics
    const revenueStats = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['confirmed', 'checked_out'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$pricing.total' },
          bookings: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Room performance
    const roomPerformance = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['confirmed', 'checked_out'] }
        }
      },
      {
        $group: {
          _id: '$room',
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.total' },
          averageStay: { $avg: '$dates.nights' }
        }
      },
      {
        $lookup: {
          from: 'rooms',
          localField: '_id',
          foreignField: '_id',
          as: 'room'
        }
      },
      {
        $unwind: '$room'
      },
      {
        $sort: { revenue: -1 }
      }
    ]);

    // Booking source statistics
    const sourceStats = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.total' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        revenueStats,
        roomPerformance,
        sourceStats
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

// @desc    Update room availability
// @route   PUT /api/admin/rooms/:id/availability
// @access  Private (Admin only)
router.put('/rooms/:id/availability', [
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('maintenanceMode').optional().isBoolean().withMessage('maintenanceMode must be a boolean'),
  body('blockedDates').optional().isArray().withMessage('blockedDates must be an array'),
  body('inventory').optional().isInt({ min: 0 }).withMessage('inventory must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Update availability fields
    const updateFields = {};
    if (req.body.isActive !== undefined) {
      updateFields['availability.isActive'] = req.body.isActive;
    }
    if (req.body.maintenanceMode !== undefined) {
      updateFields['availability.maintenanceMode'] = req.body.maintenanceMode;
    }
    if (req.body.blockedDates !== undefined) {
      updateFields['availability.blockedDates'] = req.body.blockedDates;
    }
    if (req.body.inventory !== undefined) {
      updateFields['availability.inventory'] = req.body.inventory;
    }

    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedRoom
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update room pricing
// @route   PUT /api/admin/rooms/:id/pricing
// @access  Private (Admin only)
router.put('/rooms/:id/pricing', [
  body('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']).withMessage('Valid currency is required'),
  body('seasonalPricing').optional().isArray().withMessage('seasonalPricing must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Update pricing fields
    const updateFields = {};
    if (req.body.basePrice !== undefined) {
      updateFields['price.basePrice'] = req.body.basePrice;
    }
    if (req.body.currency !== undefined) {
      updateFields['price.currency'] = req.body.currency;
    }
    if (req.body.seasonalPricing !== undefined) {
      updateFields['price.seasonalPricing'] = req.body.seasonalPricing;
    }

    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedRoom
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get occupancy report
// @route   GET /api/admin/reports/occupancy
// @access  Private (Admin only)
router.get('/reports/occupancy', [
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    // Get all rooms
    const totalRooms = await Room.countDocuments({ 'availability.isActive': true });

    // Get bookings in the date range
    const bookings = await Booking.find({
      $or: [
        {
          'dates.checkIn': { $gte: start, $lte: end }
        },
        {
          'dates.checkOut': { $gte: start, $lte: end }
        },
        {
          'dates.checkIn': { $lte: start },
          'dates.checkOut': { $gte: end }
        }
      ],
      status: { $in: ['confirmed', 'checked_in', 'checked_out'] }
    }).populate('room', 'name roomNumber category');

    // Calculate occupancy by day
    const occupancyByDay = {};
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const occupiedRooms = bookings.filter(booking => {
        const checkIn = new Date(booking.dates.checkIn);
        const checkOut = new Date(booking.dates.checkOut);
        return checkIn <= currentDate && checkOut > currentDate;
      }).length;

      occupancyByDay[dateStr] = {
        date: dateStr,
        occupiedRooms,
        totalRooms,
        occupancyRate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0
      };

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate average occupancy
    const occupancyRates = Object.values(occupancyByDay).map(day => day.occupancyRate);
    const averageOccupancy = occupancyRates.reduce((sum, rate) => sum + rate, 0) / occupancyRates.length;

    res.json({
      success: true,
      data: {
        period: {
          startDate: start,
          endDate: end
        },
        totalRooms,
        averageOccupancy: Math.round(averageOccupancy * 100) / 100,
        occupancyByDay: Object.values(occupancyByDay)
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
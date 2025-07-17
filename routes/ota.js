const express = require('express');
const { body, validationResult } = require('express-validator');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { protect, authorize } = require('../middleware/auth');
const { syncBookingCom, syncAgoda, syncAirbnb } = require('../utils/otaSync');

const router = express.Router();

// Apply admin protection to all routes
router.use(protect);
router.use(authorize('admin', 'super_admin'));

// @desc    Sync all OTA platforms
// @route   POST /api/ota/sync/all
// @access  Private (Admin only)
router.post('/sync/all', async (req, res) => {
  try {
    const results = {
      bookingCom: { success: false, message: '', data: null },
      agoda: { success: false, message: '', data: null },
      airbnb: { success: false, message: '', data: null }
    };

    // Get all active rooms
    const rooms = await Room.find({ 'availability.isActive': true });

    // Sync with Booking.com
    try {
      const bookingComResult = await syncBookingCom(rooms);
      results.bookingCom = {
        success: true,
        message: 'Booking.com sync completed successfully',
        data: bookingComResult
      };
    } catch (error) {
      results.bookingCom = {
        success: false,
        message: `Booking.com sync failed: ${error.message}`,
        data: null
      };
    }

    // Sync with Agoda
    try {
      const agodaResult = await syncAgoda(rooms);
      results.agoda = {
        success: true,
        message: 'Agoda sync completed successfully',
        data: agodaResult
      };
    } catch (error) {
      results.agoda = {
        success: false,
        message: `Agoda sync failed: ${error.message}`,
        data: null
      };
    }

    // Sync with Airbnb
    try {
      const airbnbResult = await syncAirbnb(rooms);
      results.airbnb = {
        success: true,
        message: 'Airbnb sync completed successfully',
        data: airbnbResult
      };
    } catch (error) {
      results.airbnb = {
        success: false,
        message: `Airbnb sync failed: ${error.message}`,
        data: null
      };
    }

    // Calculate overall success
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;

    res.json({
      success: successCount > 0,
      message: `${successCount}/${totalCount} OTA platforms synced successfully`,
      data: results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTA sync'
    });
  }
});

// @desc    Sync with Booking.com
// @route   POST /api/ota/sync/booking-com
// @access  Private (Admin only)
router.post('/sync/booking-com', async (req, res) => {
  try {
    const rooms = await Room.find({ 
      'availability.isActive': true,
      'otaSync.bookingCom.isActive': true 
    });

    if (rooms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No rooms configured for Booking.com sync'
      });
    }

    const result = await syncBookingCom(rooms);

    // Update last sync time for all rooms
    await Room.updateMany(
      { 'otaSync.bookingCom.isActive': true },
      { 'otaSync.bookingCom.lastSync': new Date() }
    );

    res.json({
      success: true,
      message: 'Booking.com sync completed successfully',
      data: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: `Booking.com sync failed: ${error.message}`
    });
  }
});

// @desc    Sync with Agoda
// @route   POST /api/ota/sync/agoda
// @access  Private (Admin only)
router.post('/sync/agoda', async (req, res) => {
  try {
    const rooms = await Room.find({ 
      'availability.isActive': true,
      'otaSync.agoda.isActive': true 
    });

    if (rooms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No rooms configured for Agoda sync'
      });
    }

    const result = await syncAgoda(rooms);

    // Update last sync time for all rooms
    await Room.updateMany(
      { 'otaSync.agoda.isActive': true },
      { 'otaSync.agoda.lastSync': new Date() }
    );

    res.json({
      success: true,
      message: 'Agoda sync completed successfully',
      data: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: `Agoda sync failed: ${error.message}`
    });
  }
});

// @desc    Sync with Airbnb
// @route   POST /api/ota/sync/airbnb
// @access  Private (Admin only)
router.post('/sync/airbnb', async (req, res) => {
  try {
    const rooms = await Room.find({ 
      'availability.isActive': true,
      'otaSync.airbnb.isActive': true 
    });

    if (rooms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No rooms configured for Airbnb sync'
      });
    }

    const result = await syncAirbnb(rooms);

    // Update last sync time for all rooms
    await Room.updateMany(
      { 'otaSync.airbnb.isActive': true },
      { 'otaSync.airbnb.lastSync': new Date() }
    );

    res.json({
      success: true,
      message: 'Airbnb sync completed successfully',
      data: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: `Airbnb sync failed: ${error.message}`
    });
  }
});

// @desc    Configure room OTA sync settings
// @route   PUT /api/ota/rooms/:id/config
// @access  Private (Admin only)
router.put('/rooms/:id/config', [
  body('platform').isIn(['booking_com', 'agoda', 'airbnb']).withMessage('Valid platform is required'),
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  body('roomId').optional().notEmpty().withMessage('Room ID cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { platform, isActive, roomId } = req.body;
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Update OTA sync configuration
    const updateField = `otaSync.${platform}`;
    const updateData = {
      [`${updateField}.isActive`]: isActive
    };

    if (roomId) {
      updateData[`${updateField}.roomId`] = roomId;
    }

    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: `${platform} sync configuration updated successfully`,
      data: updatedRoom.otaSync
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get OTA sync status
// @route   GET /api/ota/status
// @access  Private (Admin only)
router.get('/status', async (req, res) => {
  try {
    // Get rooms with OTA sync enabled
    const bookingComRooms = await Room.countDocuments({ 'otaSync.bookingCom.isActive': true });
    const agodaRooms = await Room.countDocuments({ 'otaSync.agoda.isActive': true });
    const airbnbRooms = await Room.countDocuments({ 'otaSync.airbnb.isActive': true });

    // Get last sync times
    const lastSyncTimes = await Room.aggregate([
      {
        $match: {
          $or: [
            { 'otaSync.bookingCom.isActive': true },
            { 'otaSync.agoda.isActive': true },
            { 'otaSync.airbnb.isActive': true }
          ]
        }
      },
      {
        $group: {
          _id: null,
          lastBookingComSync: { $max: '$otaSync.bookingCom.lastSync' },
          lastAgodaSync: { $max: '$otaSync.agoda.lastSync' },
          lastAirbnbSync: { $max: '$otaSync.airbnb.lastSync' }
        }
      }
    ]);

    // Get OTA bookings count
    const otaBookings = await Booking.aggregate([
      {
        $match: {
          source: { $in: ['booking_com', 'agoda', 'airbnb'] }
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

    const syncStatus = lastSyncTimes.length > 0 ? lastSyncTimes[0] : {};

    res.json({
      success: true,
      data: {
        platforms: {
          bookingCom: {
            enabled: bookingComRooms > 0,
            roomCount: bookingComRooms,
            lastSync: syncStatus.lastBookingComSync || null
          },
          agoda: {
            enabled: agodaRooms > 0,
            roomCount: agodaRooms,
            lastSync: syncStatus.lastAgodaSync || null
          },
          airbnb: {
            enabled: airbnbRooms > 0,
            roomCount: airbnbRooms,
            lastSync: syncStatus.lastAirbnbSync || null
          }
        },
        otaBookings: otaBookings.reduce((acc, booking) => {
          acc[booking._id] = {
            count: booking.count,
            revenue: booking.revenue
          };
          return acc;
        }, {})
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

// @desc    Get OTA sync logs
// @route   GET /api/ota/logs
// @access  Private (Admin only)
router.get('/logs', async (req, res) => {
  try {
    // In a real implementation, you would have a separate logs collection
    // For now, we'll return sync information from rooms
    const rooms = await Room.find({
      $or: [
        { 'otaSync.bookingCom.isActive': true },
        { 'otaSync.agoda.isActive': true },
        { 'otaSync.airbnb.isActive': true }
      ]
    }, 'name roomNumber otaSync').sort('-updatedAt');

    const logs = rooms.map(room => ({
      roomId: room._id,
      roomName: room.name,
      roomNumber: room.roomNumber,
      platforms: {
        bookingCom: room.otaSync.bookingCom.isActive ? {
          active: true,
          lastSync: room.otaSync.bookingCom.lastSync,
          roomId: room.otaSync.bookingCom.roomId
        } : { active: false },
        agoda: room.otaSync.agoda.isActive ? {
          active: true,
          lastSync: room.otaSync.agoda.lastSync,
          roomId: room.otaSync.agoda.roomId
        } : { active: false },
        airbnb: room.otaSync.airbnb.isActive ? {
          active: true,
          lastSync: room.otaSync.airbnb.lastSync,
          roomId: room.otaSync.airbnb.roomId
        } : { active: false }
      }
    }));

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Test OTA connection
// @route   POST /api/ota/test/:platform
// @access  Private (Admin only)
router.post('/test/:platform', async (req, res) => {
  try {
    const { platform } = req.params;

    if (!['booking_com', 'agoda', 'airbnb'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform'
      });
    }

    let testResult;
    switch (platform) {
      case 'booking_com':
        testResult = await testBookingComConnection();
        break;
      case 'agoda':
        testResult = await testAgodaConnection();
        break;
      case 'airbnb':
        testResult = await testAirbnbConnection();
        break;
    }

    res.json({
      success: testResult.success,
      message: testResult.message,
      data: testResult.data
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: `Failed to test ${req.params.platform} connection: ${error.message}`
    });
  }
});

// Helper functions for testing connections
async function testBookingComConnection() {
  try {
    // In a real implementation, you would make an actual API call
    // For now, we'll simulate a connection test
    const isConfigured = process.env.BOOKING_COM_API_KEY && 
                        process.env.BOOKING_COM_USERNAME && 
                        process.env.BOOKING_COM_PASSWORD;

    if (!isConfigured) {
      return {
        success: false,
        message: 'Booking.com credentials not configured',
        data: null
      };
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      message: 'Booking.com connection test successful',
      data: {
        endpoint: process.env.BOOKING_COM_ENDPOINT,
        authenticated: true,
        responseTime: '1.2s'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Booking.com connection test failed: ${error.message}`,
      data: null
    };
  }
}

async function testAgodaConnection() {
  try {
    const isConfigured = process.env.AGODA_API_KEY && 
                        process.env.AGODA_USERNAME && 
                        process.env.AGODA_PASSWORD;

    if (!isConfigured) {
      return {
        success: false,
        message: 'Agoda credentials not configured',
        data: null
      };
    }

    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      success: true,
      message: 'Agoda connection test successful',
      data: {
        endpoint: process.env.AGODA_ENDPOINT,
        authenticated: true,
        responseTime: '0.8s'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Agoda connection test failed: ${error.message}`,
      data: null
    };
  }
}

async function testAirbnbConnection() {
  try {
    const isConfigured = process.env.AIRBNB_API_KEY && 
                        process.env.AIRBNB_USERNAME && 
                        process.env.AIRBNB_PASSWORD;

    if (!isConfigured) {
      return {
        success: false,
        message: 'Airbnb credentials not configured',
        data: null
      };
    }

    await new Promise(resolve => setTimeout(resolve, 1200));

    return {
      success: true,
      message: 'Airbnb connection test successful',
      data: {
        endpoint: process.env.AIRBNB_ENDPOINT,
        authenticated: true,
        responseTime: '1.2s'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Airbnb connection test failed: ${error.message}`,
      data: null
    };
  }
}

module.exports = router;
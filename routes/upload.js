const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, authorize } = require('../middleware/auth');
const Room = require('../models/Room');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/rooms');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `room-${uniqueSuffix}${ext}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5000000, // 5MB default
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: fileFilter
});

// @desc    Upload room images
// @route   POST /api/upload/rooms/:id/images
// @access  Private (Admin only)
router.post('/rooms/:id/images', protect, authorize('admin', 'super_admin'), upload.array('images', 10), async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Process uploaded files
    const uploadedImages = req.files.map((file, index) => ({
      url: `/uploads/rooms/${file.filename}`,
      caption: req.body.captions ? req.body.captions[index] : '',
      isPrimary: index === 0 && room.images.length === 0, // First image is primary if no images exist
      uploadedAt: new Date()
    }));

    // Add images to room
    room.images.push(...uploadedImages);
    await room.save();

    res.json({
      success: true,
      message: `${uploadedImages.length} images uploaded successfully`,
      data: {
        room: room._id,
        uploadedImages,
        totalImages: room.images.length
      }
    });
  } catch (error) {
    console.error(error);
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error during file upload'
    });
  }
});

// @desc    Update room image
// @route   PUT /api/upload/rooms/:id/images/:imageId
// @access  Private (Admin only)
router.put('/rooms/:id/images/:imageId', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { caption, isPrimary } = req.body;
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const imageIndex = room.images.findIndex(img => img._id.toString() === req.params.imageId);

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Update image properties
    if (caption !== undefined) {
      room.images[imageIndex].caption = caption;
    }

    if (isPrimary === true) {
      // Set all other images as non-primary
      room.images.forEach((img, index) => {
        img.isPrimary = index === imageIndex;
      });
    }

    await room.save();

    res.json({
      success: true,
      message: 'Image updated successfully',
      data: room.images[imageIndex]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete room image
// @route   DELETE /api/upload/rooms/:id/images/:imageId
// @access  Private (Admin only)
router.delete('/rooms/:id/images/:imageId', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const imageIndex = room.images.findIndex(img => img._id.toString() === req.params.imageId);

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    const image = room.images[imageIndex];
    
    // Delete physical file
    try {
      const filePath = path.join(__dirname, '..', image.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error('Error deleting physical file:', fileError);
    }

    // Remove image from room
    room.images.splice(imageIndex, 1);

    // If deleted image was primary and there are other images, make the first one primary
    if (image.isPrimary && room.images.length > 0) {
      room.images[0].isPrimary = true;
    }

    await room.save();

    res.json({
      success: true,
      message: 'Image deleted successfully',
      data: {
        deletedImage: image,
        remainingImages: room.images.length
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

// @desc    Upload single file (general purpose)
// @route   POST /api/upload/file
// @access  Private (Admin only)
router.post('/file', protect, authorize('admin', 'super_admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: `/uploads/rooms/${req.file.filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error(error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error during file upload'
    });
  }
});

// @desc    Get uploaded files list
// @route   GET /api/upload/files
// @access  Private (Admin only)
router.get('/files', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const uploadsPath = path.join(__dirname, '../uploads/rooms');
    
    if (!fs.existsSync(uploadsPath)) {
      return res.json({
        success: true,
        data: []
      });
    }

    const files = fs.readdirSync(uploadsPath);
    const fileList = files.map(filename => {
      const filePath = path.join(uploadsPath, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        url: `/uploads/rooms/${filename}`,
        size: stats.size,
        uploadedAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    });

    res.json({
      success: true,
      data: fileList
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete uploaded file
// @route   DELETE /api/upload/files/:filename
// @access  Private (Admin only)
router.delete('/files/:filename', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/rooms', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if file is being used by any room
    const roomsUsingFile = await Room.find({
      'images.url': `/uploads/rooms/${filename}`
    });

    if (roomsUsingFile.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'File is being used by rooms and cannot be deleted',
        data: {
          roomsUsing: roomsUsingFile.map(room => ({
            id: room._id,
            name: room.name,
            roomNumber: room.roomNumber
          }))
        }
      });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files per upload.'
      });
    }
  }
  
  res.status(400).json({
    success: false,
    message: error.message || 'File upload error'
  });
});

module.exports = router;
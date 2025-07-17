const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a room name'],
    trim: true,
    maxlength: [100, 'Room name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a room description'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  roomNumber: {
    type: String,
    required: [true, 'Please add a room number'],
    unique: true,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Please add a room category'],
    enum: ['Single', 'Double', 'Deluxe', 'Suite', 'Presidential', 'Family', 'Twin'],
    default: 'Single'
  },
  type: {
    type: String,
    required: [true, 'Please add a room type'],
    enum: ['Standard', 'Superior', 'Deluxe', 'Executive', 'Premium'],
    default: 'Standard'
  },
  price: {
    basePrice: {
      type: Number,
      required: [true, 'Please add a base price'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']
    },
    seasonalPricing: [{
      startDate: Date,
      endDate: Date,
      price: Number,
      name: String // e.g., "Summer Season", "Holiday Season"
    }]
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  amenities: [{
    name: {
      type: String,
      required: true
    },
    icon: String,
    category: {
      type: String,
      enum: ['comfort', 'technology', 'bathroom', 'food', 'entertainment', 'accessibility'],
      default: 'comfort'
    }
  }],
  capacity: {
    maxOccupancy: {
      type: Number,
      required: [true, 'Please add maximum occupancy'],
      min: [1, 'Maximum occupancy must be at least 1']
    },
    adults: {
      type: Number,
      required: [true, 'Please add adult capacity'],
      min: [1, 'Adult capacity must be at least 1']
    },
    children: {
      type: Number,
      default: 0,
      min: [0, 'Children capacity cannot be negative']
    }
  },
  bedConfiguration: {
    bedType: {
      type: String,
      enum: ['Single', 'Double', 'Queen', 'King', 'Twin', 'Sofa Bed'],
      required: true
    },
    bedCount: {
      type: Number,
      required: true,
      min: [1, 'Bed count must be at least 1']
    }
  },
  roomSize: {
    area: Number, // in square meters
    unit: {
      type: String,
      enum: ['sqm', 'sqft'],
      default: 'sqm'
    }
  },
  availability: {
    isActive: {
      type: Boolean,
      default: true
    },
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    blockedDates: [{
      startDate: Date,
      endDate: Date,
      reason: String
    }],
    inventory: {
      type: Number,
      default: 1,
      min: [0, 'Inventory cannot be negative']
    }
  },
  policies: {
    cancellation: {
      type: String,
      required: [true, 'Please add cancellation policy'],
      enum: ['flexible', 'moderate', 'strict', 'super_strict'],
      default: 'moderate'
    },
    checkIn: {
      type: String,
      default: '15:00'
    },
    checkOut: {
      type: String,
      default: '11:00'
    },
    smokingAllowed: {
      type: Boolean,
      default: false
    },
    petsAllowed: {
      type: Boolean,
      default: false
    }
  },
  location: {
    floor: Number,
    building: String,
    view: {
      type: String,
      enum: ['city', 'sea', 'mountain', 'garden', 'pool', 'courtyard'],
      default: 'city'
    }
  },
  otaSync: {
    bookingCom: {
      roomId: String,
      lastSync: Date,
      isActive: {
        type: Boolean,
        default: false
      }
    },
    agoda: {
      roomId: String,
      lastSync: Date,
      isActive: {
        type: Boolean,
        default: false
      }
    },
    airbnb: {
      roomId: String,
      lastSync: Date,
      isActive: {
        type: Boolean,
        default: false
      }
    }
  },
  statistics: {
    totalBookings: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    occupancyRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create indexes for better performance
roomSchema.index({ category: 1, type: 1 });
roomSchema.index({ 'price.basePrice': 1 });
roomSchema.index({ 'capacity.maxOccupancy': 1 });
roomSchema.index({ 'availability.isActive': 1 });
roomSchema.index({ roomNumber: 1 });

// Virtual for primary image
roomSchema.virtual('primaryImage').get(function() {
  const primaryImg = this.images.find(img => img.isPrimary);
  return primaryImg || (this.images.length > 0 ? this.images[0] : null);
});

// Virtual for current price (considering seasonal pricing)
roomSchema.virtual('currentPrice').get(function() {
  const today = new Date();
  const seasonalPrice = this.price.seasonalPricing.find(season => 
    season.startDate <= today && season.endDate >= today
  );
  return seasonalPrice ? seasonalPrice.price : this.price.basePrice;
});

// Method to check availability for specific dates
roomSchema.methods.isAvailableForDates = function(startDate, endDate) {
  if (!this.availability.isActive || this.availability.maintenanceMode) {
    return false;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Check if dates conflict with blocked dates
  const hasConflict = this.availability.blockedDates.some(blocked => {
    const blockedStart = new Date(blocked.startDate);
    const blockedEnd = new Date(blocked.endDate);
    return (start <= blockedEnd && end >= blockedStart);
  });
  
  return !hasConflict;
};

// Method to update statistics
roomSchema.methods.updateStatistics = function(bookingRevenue) {
  this.statistics.totalBookings += 1;
  this.statistics.totalRevenue += bookingRevenue;
  return this.save();
};

module.exports = mongoose.model('Room', roomSchema);
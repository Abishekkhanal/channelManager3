const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    default: () => 'BK' + uuidv4().substring(0, 8).toUpperCase()
  },
  room: {
    type: mongoose.Schema.ObjectId,
    ref: 'Room',
    required: [true, 'Booking must belong to a room']
  },
  guest: {
    name: {
      type: String,
      required: [true, 'Please add guest name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please add guest email'],
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
      ]
    },
    phone: {
      type: String,
      required: [true, 'Please add guest phone number'],
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        required: [true, 'Please add guest country']
      }
    },
    dateOfBirth: Date,
    nationality: String,
    passportNumber: String,
    specialRequests: String
  },
  dates: {
    checkIn: {
      type: Date,
      required: [true, 'Please add check-in date']
    },
    checkOut: {
      type: Date,
      required: [true, 'Please add check-out date']
    },
    nights: {
      type: Number,
      required: true
    }
  },
  occupancy: {
    adults: {
      type: Number,
      required: [true, 'Please add number of adults'],
      min: [1, 'At least 1 adult required']
    },
    children: {
      type: Number,
      default: 0,
      min: [0, 'Children count cannot be negative']
    },
    total: {
      type: Number,
      required: true
    }
  },
  pricing: {
    roomRate: {
      type: Number,
      required: [true, 'Please add room rate']
    },
    subtotal: {
      type: Number,
      required: true
    },
    taxes: {
      amount: {
        type: Number,
        default: 0
      },
      percentage: {
        type: Number,
        default: 0
      }
    },
    fees: [{
      name: String,
      amount: Number,
      description: String
    }],
    discounts: [{
      name: String,
      amount: Number,
      percentage: Number,
      code: String
    }],
    total: {
      type: Number,
      required: [true, 'Please add total amount']
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']
    }
  },
  payment: {
    method: {
      type: String,
      required: [true, 'Please add payment method'],
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash', 'crypto']
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'partial', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAmount: {
      type: Number,
      default: 0
    },
    paidAt: Date,
    refundAmount: {
      type: Number,
      default: 0
    },
    refundedAt: Date,
    cardDetails: {
      last4: String,
      brand: String,
      expiryMonth: Number,
      expiryYear: Number
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
    default: 'pending'
  },
  source: {
    type: String,
    enum: ['direct', 'booking_com', 'agoda', 'airbnb', 'expedia', 'phone', 'walk_in'],
    default: 'direct'
  },
  cancellation: {
    isCancelled: {
      type: Boolean,
      default: false
    },
    cancelledAt: Date,
    cancelledBy: {
      type: String,
      enum: ['guest', 'admin', 'system']
    },
    reason: String,
    refundAmount: Number,
    cancellationFee: Number
  },
  checkInOut: {
    actualCheckIn: Date,
    actualCheckOut: Date,
    earlyCheckIn: {
      type: Boolean,
      default: false
    },
    lateCheckOut: {
      type: Boolean,
      default: false
    },
    additionalCharges: [{
      description: String,
      amount: Number
    }]
  },
  notifications: {
    confirmationSent: {
      type: Boolean,
      default: false
    },
    reminderSent: {
      type: Boolean,
      default: false
    },
    checkInInstructions: {
      type: Boolean,
      default: false
    }
  },
  reviews: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    reviewDate: Date
  },
  otaReference: {
    platform: String,
    reservationId: String,
    lastSync: Date
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  modifiedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
bookingSchema.index({ bookingId: 1 });
bookingSchema.index({ 'guest.email': 1 });
bookingSchema.index({ 'dates.checkIn': 1, 'dates.checkOut': 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ source: 1 });
bookingSchema.index({ room: 1 });

// Pre-save middleware to calculate nights and total occupancy
bookingSchema.pre('save', function(next) {
  // Calculate nights
  const checkIn = new Date(this.dates.checkIn);
  const checkOut = new Date(this.dates.checkOut);
  const timeDiff = checkOut.getTime() - checkIn.getTime();
  this.dates.nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  // Calculate total occupancy
  this.occupancy.total = this.occupancy.adults + this.occupancy.children;
  
  next();
});

// Virtual for booking duration in days
bookingSchema.virtual('duration').get(function() {
  return this.dates.nights;
});

// Virtual for booking status display
bookingSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    pending: 'Pending Confirmation',
    confirmed: 'Confirmed',
    checked_in: 'Checked In',
    checked_out: 'Checked Out',
    cancelled: 'Cancelled',
    no_show: 'No Show'
  };
  return statusMap[this.status] || this.status;
});

// Method to check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const checkIn = new Date(this.dates.checkIn);
  const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 3600);
  
  // Cannot cancel if already checked in or checked out
  if (['checked_in', 'checked_out', 'cancelled'].includes(this.status)) {
    return false;
  }
  
  // Check cancellation policy (24 hours before check-in for moderate policy)
  return hoursUntilCheckIn > 24;
};

// Method to calculate cancellation fee
bookingSchema.methods.calculateCancellationFee = function() {
  const now = new Date();
  const checkIn = new Date(this.dates.checkIn);
  const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 3600);
  
  // This is a simplified cancellation fee calculation
  // In real implementation, this would be based on the room's cancellation policy
  if (hoursUntilCheckIn > 48) {
    return 0; // Free cancellation
  } else if (hoursUntilCheckIn > 24) {
    return this.pricing.total * 0.25; // 25% fee
  } else {
    return this.pricing.total * 0.50; // 50% fee
  }
};

// Method to update booking status
bookingSchema.methods.updateStatus = function(newStatus, updatedBy) {
  this.status = newStatus;
  this.modifiedBy = updatedBy;
  
  // Update check-in/check-out times if applicable
  if (newStatus === 'checked_in') {
    this.checkInOut.actualCheckIn = new Date();
  } else if (newStatus === 'checked_out') {
    this.checkInOut.actualCheckOut = new Date();
  }
  
  return this.save();
};

module.exports = mongoose.model('Booking', bookingSchema);
# Hotel Booking Engine API Documentation

## Tech Stack
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Email**: Nodemailer
- **Security**: Helmet, CORS, Rate Limiting

## Base URL
```
http://localhost:5000/api
```

## Authentication

### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "role": "user"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f8b1a2c3d4e5f6g7h8i9j0",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "preferences": {
      "language": "en",
      "currency": "USD"
    }
  }
}
```

### Login User
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f8b1a2c3d4e5f6g7h8i9j0",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64f8b1a2c3d4e5f6g7h8i9j0",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "preferences": {
      "language": "en",
      "currency": "USD"
    }
  }
}
```

## Rooms

### Get All Rooms
```http
GET /rooms?category=Single&type=Standard&minPrice=100&maxPrice=500&maxOccupancy=2&checkIn=2024-01-15&checkOut=2024-01-20&page=1&limit=10
```

**Query Parameters:**
- `category`: Single, Double, Deluxe, Suite, Presidential, Family, Twin
- `type`: Standard, Superior, Deluxe, Executive, Premium
- `minPrice`: Minimum price per night
- `maxPrice`: Maximum price per night
- `maxOccupancy`: Maximum number of guests
- `checkIn`: Check-in date (ISO 8601)
- `checkOut`: Check-out date (ISO 8601)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "total": 25,
  "pagination": {
    "page": 1,
    "limit": 10,
    "pages": 3
  },
  "data": [
    {
      "id": "64f8b1a2c3d4e5f6g7h8i9j0",
      "name": "Deluxe Ocean View",
      "description": "Spacious room with ocean view",
      "roomNumber": "101",
      "category": "Deluxe",
      "type": "Superior",
      "price": {
        "basePrice": 250,
        "currency": "USD"
      },
      "images": [
        {
          "url": "/uploads/rooms/room-1234567890.jpg",
          "caption": "Ocean view",
          "isPrimary": true
        }
      ],
      "amenities": [
        {
          "name": "WiFi",
          "icon": "wifi",
          "category": "technology"
        }
      ],
      "capacity": {
        "maxOccupancy": 4,
        "adults": 2,
        "children": 2
      },
      "availability": {
        "isActive": true,
        "inventory": 1
      }
    }
  ]
}
```

### Get Single Room
```http
GET /rooms/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64f8b1a2c3d4e5f6g7h8i9j0",
    "name": "Deluxe Ocean View",
    "description": "Spacious room with ocean view",
    "roomNumber": "101",
    "category": "Deluxe",
    "type": "Superior",
    "price": {
      "basePrice": 250,
      "currency": "USD",
      "seasonalPricing": []
    },
    "images": [
      {
        "url": "/uploads/rooms/room-1234567890.jpg",
        "caption": "Ocean view",
        "isPrimary": true
      }
    ],
    "amenities": [
      {
        "name": "WiFi",
        "icon": "wifi",
        "category": "technology"
      }
    ],
    "capacity": {
      "maxOccupancy": 4,
      "adults": 2,
      "children": 2
    },
    "bedConfiguration": {
      "bedType": "Queen",
      "bedCount": 1
    },
    "roomSize": {
      "area": 35,
      "unit": "sqm"
    },
    "availability": {
      "isActive": true,
      "maintenanceMode": false,
      "blockedDates": [],
      "inventory": 1
    },
    "policies": {
      "cancellation": "moderate",
      "checkIn": "15:00",
      "checkOut": "11:00",
      "smokingAllowed": false,
      "petsAllowed": false
    }
  }
}
```

### Create Room (Admin Only)
```http
POST /rooms
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "name": "Deluxe Ocean View",
  "description": "Spacious room with ocean view",
  "roomNumber": "101",
  "category": "Deluxe",
  "type": "Superior",
  "price": {
    "basePrice": 250,
    "currency": "USD"
  },
  "capacity": {
    "maxOccupancy": 4,
    "adults": 2,
    "children": 2
  },
  "bedConfiguration": {
    "bedType": "Queen",
    "bedCount": 1
  },
  "amenities": [
    {
      "name": "WiFi",
      "icon": "wifi",
      "category": "technology"
    }
  ]
}
```

### Check Room Availability
```http
POST /rooms/:id/availability
```

**Request Body:**
```json
{
  "checkIn": "2024-01-15T00:00:00.000Z",
  "checkOut": "2024-01-20T00:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "available": true,
  "pricing": {
    "pricePerNight": 250,
    "nights": 5,
    "totalPrice": 1250,
    "currency": "USD"
  }
}
```

## Bookings

### Create Booking
```http
POST /bookings
```

**Request Body:**
```json
{
  "room": "64f8b1a2c3d4e5f6g7h8i9j0",
  "guest": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    "specialRequests": "Late check-in"
  },
  "dates": {
    "checkIn": "2024-01-15T00:00:00.000Z",
    "checkOut": "2024-01-20T00:00:00.000Z"
  },
  "occupancy": {
    "adults": 2,
    "children": 0
  },
  "payment": {
    "method": "credit_card"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64f8b1a2c3d4e5f6g7h8i9j0",
    "bookingId": "BK12345678",
    "room": {
      "name": "Deluxe Ocean View",
      "roomNumber": "101",
      "category": "Deluxe",
      "type": "Superior"
    },
    "guest": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "dates": {
      "checkIn": "2024-01-15T00:00:00.000Z",
      "checkOut": "2024-01-20T00:00:00.000Z",
      "nights": 5
    },
    "occupancy": {
      "adults": 2,
      "children": 0,
      "total": 2
    },
    "pricing": {
      "roomRate": 250,
      "subtotal": 1250,
      "taxes": {
        "amount": 125,
        "percentage": 10
      },
      "total": 1375,
      "currency": "USD"
    },
    "payment": {
      "method": "credit_card",
      "status": "pending"
    },
    "status": "pending",
    "source": "direct"
  }
}
```

### Get Booking by ID
```http
GET /bookings/:id
```

### Get Booking by Booking ID
```http
GET /bookings/booking/:bookingId
```

### Cancel Booking
```http
PUT /bookings/:id/cancel
```

**Request Body:**
```json
{
  "reason": "Change of plans"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "booking": {
      "id": "64f8b1a2c3d4e5f6g7h8i9j0",
      "bookingId": "BK12345678",
      "status": "cancelled"
    },
    "cancellationFee": 343.75,
    "refundAmount": 1031.25
  }
}
```

## Admin Panel

### Get Dashboard Data
```http
GET /admin/dashboard
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalRooms": 25,
      "activeRooms": 23,
      "totalBookings": 156,
      "totalUsers": 89,
      "weeklyBookings": 12,
      "occupancyRate": 78.5
    },
    "revenue": {
      "monthly": 45000,
      "monthlyBookings": 34
    },
    "bookingStats": [
      {
        "_id": "confirmed",
        "count": 89,
        "revenue": 125000
      }
    ],
    "recentBookings": [
      {
        "id": "64f8b1a2c3d4e5f6g7h8i9j0",
        "bookingId": "BK12345678",
        "guest": {
          "name": "John Doe",
          "email": "john@example.com"
        },
        "room": {
          "name": "Deluxe Ocean View",
          "roomNumber": "101"
        },
        "status": "confirmed",
        "createdAt": "2024-01-10T10:00:00.000Z"
      }
    ]
  }
}
```

### Get All Users (Admin Only)
```http
GET /admin/users?role=user&isActive=true&page=1&limit=10
Authorization: Bearer <admin_token>
```

### Update User (Admin Only)
```http
PUT /admin/users/:id
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "email": "john.updated@example.com",
  "role": "admin",
  "isActive": true
}
```

### Get System Statistics
```http
GET /admin/stats?period=month
Authorization: Bearer <admin_token>
```

### Update Room Availability (Admin Only)
```http
PUT /admin/rooms/:id/availability
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "isActive": true,
  "maintenanceMode": false,
  "blockedDates": [
    {
      "startDate": "2024-01-15T00:00:00.000Z",
      "endDate": "2024-01-20T00:00:00.000Z",
      "reason": "Maintenance"
    }
  ],
  "inventory": 1
}
```

### Update Room Pricing (Admin Only)
```http
PUT /admin/rooms/:id/pricing
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "basePrice": 275,
  "currency": "USD",
  "seasonalPricing": [
    {
      "startDate": "2024-06-01T00:00:00.000Z",
      "endDate": "2024-08-31T00:00:00.000Z",
      "price": 350,
      "name": "Summer Season"
    }
  ]
}
```

## OTA Integration

### Sync All OTA Platforms
```http
POST /ota/sync/all
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "3/3 OTA platforms synced successfully",
  "data": {
    "bookingCom": {
      "success": true,
      "message": "Booking.com sync completed successfully",
      "data": {
        "syncedRooms": 15,
        "updatedInventory": [],
        "updatedRates": []
      }
    },
    "agoda": {
      "success": true,
      "message": "Agoda sync completed successfully",
      "data": {
        "syncedRooms": 12,
        "updatedInventory": [],
        "updatedRates": []
      }
    },
    "airbnb": {
      "success": true,
      "message": "Airbnb sync completed successfully",
      "data": {
        "syncedRooms": 8,
        "updatedInventory": [],
        "updatedRates": []
      }
    }
  }
}
```

### Sync Individual Platform
```http
POST /ota/sync/booking-com
POST /ota/sync/agoda
POST /ota/sync/airbnb
Authorization: Bearer <admin_token>
```

### Configure Room OTA Sync
```http
PUT /ota/rooms/:id/config
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "platform": "booking_com",
  "isActive": true,
  "roomId": "hotel_123_room_101"
}
```

### Get OTA Sync Status
```http
GET /ota/status
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "platforms": {
      "bookingCom": {
        "enabled": true,
        "roomCount": 15,
        "lastSync": "2024-01-10T10:00:00.000Z"
      },
      "agoda": {
        "enabled": true,
        "roomCount": 12,
        "lastSync": "2024-01-10T10:00:00.000Z"
      },
      "airbnb": {
        "enabled": true,
        "roomCount": 8,
        "lastSync": "2024-01-10T10:00:00.000Z"
      }
    },
    "otaBookings": {
      "booking_com": {
        "count": 45,
        "revenue": 67500
      },
      "agoda": {
        "count": 32,
        "revenue": 48000
      },
      "airbnb": {
        "count": 18,
        "revenue": 27000
      }
    }
  }
}
```

### Test OTA Connection
```http
POST /ota/test/booking_com
POST /ota/test/agoda
POST /ota/test/airbnb
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Booking.com connection test successful",
  "data": {
    "endpoint": "https://secure-supply-xml.booking.com/hotels/xml",
    "authenticated": true,
    "responseTime": "1.2s"
  }
}
```

## File Upload

### Upload Room Images
```http
POST /upload/rooms/:id/images
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `images`: Multiple image files (max 10)
- `captions`: Array of captions for each image

**Response:**
```json
{
  "success": true,
  "message": "3 images uploaded successfully",
  "data": {
    "room": "64f8b1a2c3d4e5f6g7h8i9j0",
    "uploadedImages": [
      {
        "url": "/uploads/rooms/room-1234567890.jpg",
        "caption": "Ocean view",
        "isPrimary": true,
        "uploadedAt": "2024-01-10T10:00:00.000Z"
      }
    ],
    "totalImages": 3
  }
}
```

### Update Room Image
```http
PUT /upload/rooms/:id/images/:imageId
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "caption": "Updated caption",
  "isPrimary": true
}
```

### Delete Room Image
```http
DELETE /upload/rooms/:id/images/:imageId
Authorization: Bearer <admin_token>
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Please include a valid email"
    }
  ]
}
```

## Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

- 100 requests per 15 minutes per IP address
- Admin endpoints may have different limits

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Helmet security headers
- Rate limiting
- File upload restrictions

## Database Schema (MongoDB)

### Users Collection
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (enum: ['user', 'admin', 'super_admin']),
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  preferences: {
    language: String (enum: ['en', 'es', 'fr', 'de', 'it', 'pt']),
    currency: String (enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'])
  },
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Rooms Collection
```javascript
{
  name: String,
  description: String,
  roomNumber: String (unique),
  category: String (enum: ['Single', 'Double', 'Deluxe', 'Suite', 'Presidential', 'Family', 'Twin']),
  type: String (enum: ['Standard', 'Superior', 'Deluxe', 'Executive', 'Premium']),
  price: {
    basePrice: Number,
    currency: String,
    seasonalPricing: [
      {
        startDate: Date,
        endDate: Date,
        price: Number,
        name: String
      }
    ]
  },
  images: [
    {
      url: String,
      caption: String,
      isPrimary: Boolean,
      uploadedAt: Date
    }
  ],
  amenities: [
    {
      name: String,
      icon: String,
      category: String
    }
  ],
  capacity: {
    maxOccupancy: Number,
    adults: Number,
    children: Number
  },
  bedConfiguration: {
    bedType: String,
    bedCount: Number
  },
  availability: {
    isActive: Boolean,
    maintenanceMode: Boolean,
    blockedDates: [
      {
        startDate: Date,
        endDate: Date,
        reason: String
      }
    ],
    inventory: Number
  },
  policies: {
    cancellation: String,
    checkIn: String,
    checkOut: String,
    smokingAllowed: Boolean,
    petsAllowed: Boolean
  },
  otaSync: {
    bookingCom: {
      roomId: String,
      lastSync: Date,
      isActive: Boolean
    },
    agoda: {
      roomId: String,
      lastSync: Date,
      isActive: Boolean
    },
    airbnb: {
      roomId: String,
      lastSync: Date,
      isActive: Boolean
    }
  },
  createdBy: ObjectId (ref: 'User'),
  createdAt: Date,
  updatedAt: Date
}
```

### Bookings Collection
```javascript
{
  bookingId: String (unique),
  room: ObjectId (ref: 'Room'),
  guest: {
    name: String,
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    specialRequests: String
  },
  dates: {
    checkIn: Date,
    checkOut: Date,
    nights: Number
  },
  occupancy: {
    adults: Number,
    children: Number,
    total: Number
  },
  pricing: {
    roomRate: Number,
    subtotal: Number,
    taxes: {
      amount: Number,
      percentage: Number
    },
    total: Number,
    currency: String
  },
  payment: {
    method: String,
    status: String,
    transactionId: String,
    paidAmount: Number,
    paidAt: Date
  },
  status: String (enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show']),
  source: String (enum: ['direct', 'booking_com', 'agoda', 'airbnb', 'expedia', 'phone', 'walk_in']),
  cancellation: {
    isCancelled: Boolean,
    cancelledAt: Date,
    cancelledBy: String,
    reason: String,
    refundAmount: Number,
    cancellationFee: Number
  },
  createdBy: ObjectId (ref: 'User'),
  createdAt: Date,
  updatedAt: Date
}
```
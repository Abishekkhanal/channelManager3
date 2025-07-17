# Hotel Booking Engine

A complete hotel booking management system with admin panel, OTA integration, and multi-language/currency support.

## 🚀 Features

### 🏨 Admin Panel
- **Room Management**: Add, edit, delete rooms with multiple images, amenities, and pricing
- **Booking Management**: View, modify, and manage all bookings
- **User Management**: Manage user accounts and permissions
- **Dashboard**: Real-time statistics, revenue reports, and occupancy analytics
- **Dynamic Pricing**: Seasonal pricing and rate management
- **Availability Control**: Room availability calendar and maintenance mode

### 📱 Booking Engine
- **Room Search**: Filter by dates, category, type, and guest count
- **Real-time Availability**: Instant availability checking and pricing
- **Secure Booking**: Complete booking process with email confirmation
- **Booking Management**: Cancel or modify bookings with policy enforcement
- **Multi-language Support**: English, Spanish, French, German, Italian, Portuguese
- **Multi-currency Support**: USD, EUR, GBP, JPY, CAD, AUD

### 🌐 OTA Integration
- **Channel Manager**: Sync with Booking.com, Agoda, and Airbnb
- **Inventory Sync**: Real-time room availability updates
- **Rate Management**: Automatic pricing synchronization
- **Booking Import**: Import reservations from OTA platforms
- **Connection Testing**: Test OTA API connections

### 🔐 Security Features
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: User, Admin, and Super Admin roles
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Protection against abuse
- **File Upload Security**: Secure image upload with validation
- **Password Hashing**: Bcrypt password encryption

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Email**: Nodemailer
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator

### Frontend (Ready for Integration)
- **Framework**: React.js (setup ready)
- **Styling**: CSS3, Bootstrap (optional)
- **State Management**: Context API or Redux
- **HTTP Client**: Axios

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/hotel-booking-engine.git
   cd hotel-booking-engine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/hotel_booking
   JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_secure
   JWT_EXPIRE=7d
   
   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   
   # OTA Configuration
   BOOKING_COM_API_KEY=your_booking_com_api_key
   BOOKING_COM_USERNAME=your_booking_com_username
   BOOKING_COM_PASSWORD=your_booking_com_password
   
   AGODA_API_KEY=your_agoda_api_key
   AGODA_USERNAME=your_agoda_username
   AGODA_PASSWORD=your_agoda_password
   
   AIRBNB_API_KEY=your_airbnb_api_key
   AIRBNB_USERNAME=your_airbnb_username
   AIRBNB_PASSWORD=your_airbnb_password
   ```

4. **Start MongoDB**
   ```bash
   # On macOS with Homebrew
   brew services start mongodb-community
   
   # On Ubuntu/Debian
   sudo systemctl start mongod
   
   # On Windows
   net start MongoDB
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   - API: http://localhost:5000
   - Health Check: http://localhost:5000/api/health

## 📚 API Documentation

Comprehensive API documentation is available in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### Quick Start Examples

#### 1. Register a new user
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "admin"
  }'
```

#### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### 3. Create a room (Admin only)
```bash
curl -X POST http://localhost:5000/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
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
    }
  }'
```

#### 4. Search rooms
```bash
curl "http://localhost:5000/api/rooms?checkIn=2024-01-15&checkOut=2024-01-20&maxOccupancy=2"
```

#### 5. Make a booking
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "room": "ROOM_ID_HERE",
    "guest": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "address": {
        "country": "USA"
      }
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
  }'
```

## 🗂️ Project Structure

```
hotel-booking-engine/
├── models/                 # Database models
│   ├── User.js            # User model
│   ├── Room.js            # Room model
│   └── Booking.js         # Booking model
├── routes/                 # API routes
│   ├── auth.js            # Authentication routes
│   ├── rooms.js           # Room management routes
│   ├── bookings.js        # Booking management routes
│   ├── admin.js           # Admin panel routes
│   ├── ota.js             # OTA integration routes
│   └── upload.js          # File upload routes
├── middleware/             # Custom middleware
│   └── auth.js            # Authentication middleware
├── utils/                  # Utility functions
│   ├── email.js           # Email utilities
│   └── otaSync.js         # OTA synchronization
├── uploads/                # File uploads directory
├── .env                   # Environment variables
├── server.js              # Main server file
├── package.json           # Dependencies
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/hotel_booking` |
| `JWT_SECRET` | JWT secret key | Required |
| `JWT_EXPIRE` | JWT expiration time | `7d` |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | SMTP username | Required |
| `EMAIL_PASS` | SMTP password | Required |
| `MAX_FILE_SIZE` | Max file upload size | `5000000` (5MB) |
| `RATE_LIMIT_WINDOW` | Rate limit window (minutes) | `15` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

### OTA Configuration

To enable OTA integration, configure the following environment variables:

- **Booking.com**: `BOOKING_COM_API_KEY`, `BOOKING_COM_USERNAME`, `BOOKING_COM_PASSWORD`
- **Agoda**: `AGODA_API_KEY`, `AGODA_USERNAME`, `AGODA_PASSWORD`
- **Airbnb**: `AIRBNB_API_KEY`, `AIRBNB_USERNAME`, `AIRBNB_PASSWORD`

## 🔒 Security Best Practices

1. **Authentication**: All sensitive endpoints require JWT authentication
2. **Authorization**: Role-based access control (User, Admin, Super Admin)
3. **Input Validation**: All inputs are validated and sanitized
4. **Rate Limiting**: Protection against brute force attacks
5. **File Upload Security**: Only image files allowed with size limits
6. **Password Security**: Bcrypt hashing with salt rounds
7. **CORS**: Configured for specific domains in production
8. **Headers**: Security headers via Helmet.js

## 📊 Database Schema

### Users Collection
- User authentication and profile information
- Role-based access control
- Preferences (language, currency)
- Activity tracking

### Rooms Collection
- Room details and specifications
- Pricing and seasonal rates
- Image gallery and amenities
- Availability and inventory management
- OTA sync configuration

### Bookings Collection
- Guest information and contact details
- Booking dates and occupancy
- Pricing breakdown and payment status
- Cancellation handling
- Source tracking (direct, OTA)

## 🌐 OTA Integration

### Supported Platforms
- **Booking.com**: XML API integration
- **Agoda**: REST API integration
- **Airbnb**: REST API integration

### Features
- **Inventory Sync**: Real-time availability updates
- **Rate Management**: Automatic pricing synchronization
- **Booking Import**: Import reservations from OTA platforms
- **Connection Testing**: Verify API credentials and connectivity

### XML/JSON Examples

#### Booking.com XML Request
```xml
<?xml version="1.0" encoding="UTF-8"?>
<request>
  <username>your_username</username>
  <password>your_password</password>
  <hotel_id>hotel_123</hotel_id>
  <room_id>101</room_id>
  <date_from>2024-01-15</date_from>
  <date_to>2024-12-31</date_to>
  <availability>
    <date>2024-01-15</date>
    <rooms_available>1</rooms_available>
    <closed>0</closed>
  </availability>
</request>
```

#### Agoda JSON Request
```json
{
  "auth": {
    "username": "your_username",
    "password": "your_password",
    "apiKey": "your_api_key"
  },
  "hotelId": "hotel_123",
  "roomTypeId": "101",
  "dateFrom": "2024-01-15",
  "dateTo": "2024-12-31",
  "inventory": {
    "available": 1,
    "status": "open"
  }
}
```

## 📧 Email Templates

The system includes professional email templates for:
- Booking confirmations
- Cancellation notifications
- Check-in reminders
- Payment confirmations

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   MONGODB_URI=mongodb://your-production-db
   JWT_SECRET=your-production-secret
   ```

2. **Build and Start**
   ```bash
   npm run build
   npm start
   ```

3. **Process Management** (recommended)
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start server.js --name hotel-booking-engine
   pm2 startup
   pm2 save
   ```

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🧪 Testing

```bash
# Install test dependencies
npm install --save-dev jest supertest

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📈 Performance Optimization

- **Database Indexing**: Optimized queries with proper indexes
- **Caching**: Redis integration ready
- **Compression**: Gzip compression enabled
- **Rate Limiting**: Prevents abuse and ensures stability
- **Pagination**: Efficient data loading
- **File Optimization**: Image compression and optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Email: support@hotelbookingengine.com
- Documentation: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 🙏 Acknowledgments

- Express.js team for the excellent framework
- MongoDB team for the robust database
- All contributors who helped improve this project

---

**Built with ❤️ for the hospitality industry**
const nodemailer = require('nodemailer');
const moment = require('moment');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send booking confirmation email
const sendBookingConfirmation = async (booking) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Hotel Booking System" <${process.env.EMAIL_USER}>`,
      to: booking.guest.email,
      subject: `Booking Confirmation - ${booking.bookingId}`,
      html: generateBookingConfirmationHTML(booking)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Booking confirmation email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    throw error;
  }
};

// Send booking cancellation email
const sendBookingCancellation = async (booking) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Hotel Booking System" <${process.env.EMAIL_USER}>`,
      to: booking.guest.email,
      subject: `Booking Cancellation - ${booking.bookingId}`,
      html: generateBookingCancellationHTML(booking)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Booking cancellation email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending booking cancellation email:', error);
    throw error;
  }
};

// Send check-in reminder email
const sendCheckInReminder = async (booking) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Hotel Booking System" <${process.env.EMAIL_USER}>`,
      to: booking.guest.email,
      subject: `Check-in Reminder - ${booking.bookingId}`,
      html: generateCheckInReminderHTML(booking)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Check-in reminder email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending check-in reminder email:', error);
    throw error;
  }
};

// Generate booking confirmation HTML
const generateBookingConfirmationHTML = (booking) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Booking Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .booking-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; }
        .total { background: #e8f5e8; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmation</h1>
          <p>Thank you for your reservation!</p>
        </div>
        
        <div class="content">
          <p>Dear ${booking.guest.name},</p>
          <p>Your booking has been confirmed. Here are your reservation details:</p>
          
          <div class="booking-details">
            <h3>Booking Information</h3>
            <div class="detail-row">
              <span class="detail-label">Booking ID:</span>
              <span>${booking.bookingId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Room:</span>
              <span>${booking.room.name} (${booking.room.roomNumber})</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Check-in:</span>
              <span>${moment(booking.dates.checkIn).format('MMMM Do, YYYY')}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Check-out:</span>
              <span>${moment(booking.dates.checkOut).format('MMMM Do, YYYY')}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Nights:</span>
              <span>${booking.dates.nights}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Guests:</span>
              <span>${booking.occupancy.adults} Adults${booking.occupancy.children > 0 ? `, ${booking.occupancy.children} Children` : ''}</span>
            </div>
          </div>
          
          <div class="booking-details">
            <h3>Pricing Details</h3>
            <div class="detail-row">
              <span class="detail-label">Room Rate (per night):</span>
              <span>${booking.pricing.currency} ${booking.pricing.roomRate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Subtotal:</span>
              <span>${booking.pricing.currency} ${booking.pricing.subtotal}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Taxes (${booking.pricing.taxes.percentage}%):</span>
              <span>${booking.pricing.currency} ${booking.pricing.taxes.amount}</span>
            </div>
            <div class="total">
              <div class="detail-row" style="border: none; margin: 0;">
                <span class="detail-label">Total Amount:</span>
                <span style="font-size: 18px; font-weight: bold;">${booking.pricing.currency} ${booking.pricing.total}</span>
              </div>
            </div>
          </div>
          
          <div class="booking-details">
            <h3>Guest Information</h3>
            <div class="detail-row">
              <span class="detail-label">Name:</span>
              <span>${booking.guest.name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email:</span>
              <span>${booking.guest.email}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Phone:</span>
              <span>${booking.guest.phone}</span>
            </div>
            ${booking.guest.specialRequests ? `
            <div class="detail-row">
              <span class="detail-label">Special Requests:</span>
              <span>${booking.guest.specialRequests}</span>
            </div>
            ` : ''}
          </div>
          
          <p><strong>Important Notes:</strong></p>
          <ul>
            <li>Please bring a valid ID for check-in</li>
            <li>Check-in time: 3:00 PM</li>
            <li>Check-out time: 11:00 AM</li>
            <li>Cancellation policy applies as per booking terms</li>
          </ul>
          
          <p>We look forward to welcoming you!</p>
        </div>
        
        <div class="footer">
          <p>Hotel Booking System</p>
          <p>If you have any questions, please contact us at ${process.env.EMAIL_USER}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate booking cancellation HTML
const generateBookingCancellationHTML = (booking) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Booking Cancellation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #e74c3c; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .booking-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; }
        .refund-info { background: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Cancellation</h1>
          <p>Your reservation has been cancelled</p>
        </div>
        
        <div class="content">
          <p>Dear ${booking.guest.name},</p>
          <p>Your booking has been cancelled as requested. Here are the cancellation details:</p>
          
          <div class="booking-details">
            <h3>Cancelled Booking Information</h3>
            <div class="detail-row">
              <span class="detail-label">Booking ID:</span>
              <span>${booking.bookingId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Room:</span>
              <span>${booking.room ? booking.room.name : 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Check-in Date:</span>
              <span>${moment(booking.dates.checkIn).format('MMMM Do, YYYY')}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Check-out Date:</span>
              <span>${moment(booking.dates.checkOut).format('MMMM Do, YYYY')}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Cancellation Date:</span>
              <span>${moment(booking.cancellation.cancelledAt).format('MMMM Do, YYYY')}</span>
            </div>
          </div>
          
          ${booking.cancellation.refundAmount > 0 ? `
          <div class="refund-info">
            <h3>Refund Information</h3>
            <div class="detail-row" style="border: none;">
              <span class="detail-label">Original Amount:</span>
              <span>${booking.pricing.currency} ${booking.pricing.total}</span>
            </div>
            <div class="detail-row" style="border: none;">
              <span class="detail-label">Cancellation Fee:</span>
              <span>${booking.pricing.currency} ${booking.cancellation.cancellationFee}</span>
            </div>
            <div class="detail-row" style="border: none;">
              <span class="detail-label">Refund Amount:</span>
              <span style="font-weight: bold;">${booking.pricing.currency} ${booking.cancellation.refundAmount}</span>
            </div>
            <p style="margin-top: 15px; font-size: 14px;">
              The refund will be processed within 5-7 business days to your original payment method.
            </p>
          </div>
          ` : ''}
          
          <p>We're sorry to see you cancel your reservation. If you have any questions about this cancellation or would like to make a new booking, please don't hesitate to contact us.</p>
        </div>
        
        <div class="footer">
          <p>Hotel Booking System</p>
          <p>If you have any questions, please contact us at ${process.env.EMAIL_USER}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate check-in reminder HTML
const generateCheckInReminderHTML = (booking) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Check-in Reminder</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #27ae60; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .booking-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; }
        .checkin-info { background: #d4edda; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #28a745; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Check-in Reminder</h1>
          <p>Your stay is coming up soon!</p>
        </div>
        
        <div class="content">
          <p>Dear ${booking.guest.name},</p>
          <p>This is a friendly reminder that your check-in date is approaching. We're excited to welcome you!</p>
          
          <div class="booking-details">
            <h3>Your Booking Details</h3>
            <div class="detail-row">
              <span class="detail-label">Booking ID:</span>
              <span>${booking.bookingId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Room:</span>
              <span>${booking.room.name} (${booking.room.roomNumber})</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Check-in:</span>
              <span>${moment(booking.dates.checkIn).format('MMMM Do, YYYY')}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Check-out:</span>
              <span>${moment(booking.dates.checkOut).format('MMMM Do, YYYY')}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Guests:</span>
              <span>${booking.occupancy.adults} Adults${booking.occupancy.children > 0 ? `, ${booking.occupancy.children} Children` : ''}</span>
            </div>
          </div>
          
          <div class="checkin-info">
            <h3>Check-in Information</h3>
            <ul>
              <li><strong>Check-in Time:</strong> 3:00 PM</li>
              <li><strong>Check-out Time:</strong> 11:00 AM</li>
              <li><strong>Required:</strong> Valid government-issued ID</li>
              <li><strong>Payment:</strong> Credit card for incidentals</li>
            </ul>
          </div>
          
          <p><strong>What to Expect:</strong></p>
          <ul>
            <li>Front desk staff will assist with check-in</li>
            <li>Room keys will be provided upon arrival</li>
            <li>Complimentary WiFi throughout the property</li>
            <li>Concierge services available</li>
          </ul>
          
          <p>If you need to modify your reservation or have any special requests, please contact us as soon as possible.</p>
          
          <p>We look forward to providing you with an excellent stay!</p>
        </div>
        
        <div class="footer">
          <p>Hotel Booking System</p>
          <p>If you have any questions, please contact us at ${process.env.EMAIL_USER}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendCheckInReminder
};
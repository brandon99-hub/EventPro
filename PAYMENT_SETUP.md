# M-Pesa Payment Integration Setup Guide

## 🚀 **Payment System Overview**

Your EventMasterPro now includes a complete M-Pesa payment integration with:
- **STK Push** payments for instant mobile money transactions
- **Commission tracking** (10% platform fee by default)
- **Payment status monitoring** with real-time updates
- **Email confirmations** for successful bookings
- **Admin dashboard** with payment analytics

## 🔧 **Environment Configuration**

Create a `.env` file in your project root with the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/eventmasterpro"

# Session Configuration
SESSION_SECRET="your-super-secret-session-key-change-this"

# Email Configuration (for booking confirmations)
GMAIL_USER="your-email@gmail.com"
GMAIL_PASS="your-app-password"

# M-Pesa API Configuration
MPESA_CONSUMER_KEY="f3pP35zJRBZYNg7fqeIAkEQAD5G183xesGvPC9GfOZceMb01"
MPESA_CONSUMER_SECRET="9jLVLGX2bZ8v6aLZaVCNZzlGDmUAPOSAMbIE39QGgHG1UwApwdmJSOIiRvA1xKiG"
MPESA_ENVIRONMENT="sandbox"
MPESA_SHORTCODE="174379"
MPESA_PASSKEY="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
MPESA_CALLBACK_URL="https://your-domain.com/api/payments/mpesa/callback"
```

## 📱 **M-Pesa Sandbox Testing**

### **Test Phone Numbers**
Use these Safaricom test numbers for sandbox testing:
- `254708374149` - Success scenarios
- `254708374150` - Insufficient funds
- `254708374151` - User cancelled
- `254708374152` - Timeout

### **Test Amounts**
- Minimum: KES 1
- Maximum: KES 100,000
- Recommended for testing: KES 10-100

## 🔄 **Payment Flow**

### **1. User Journey**
1. User selects event and tickets
2. Enters personal details (name, email, phone)
3. Chooses M-Pesa payment method
4. Clicks "Pay" button
5. Receives STK Push on phone
6. Enters M-Pesa PIN
7. Payment processed and booking confirmed

### **2. Technical Flow**
1. Frontend calls `/api/payments/mpesa/initiate`
2. Backend creates booking with "pending" status
3. M-Pesa STK Push sent to user's phone
4. User completes payment on phone
5. M-Pesa sends webhook to `/api/payments/mpesa/callback`
6. Backend updates booking to "completed"
7. Commission calculated and stored
8. Confirmation email sent

## 💰 **Commission System**

### **Default Settings**
- **Platform Fee**: 10% of ticket price
- **Minimum Fee**: KES 0
- **Maximum Fee**: KES 1,000
- **Organizer Amount**: 90% of ticket price

### **Example Calculation**
- Ticket Price: KES 1,000
- Platform Fee: KES 100 (10%)
- Organizer Amount: KES 900 (90%)

## 🛠 **Database Schema Updates**

The following new fields have been added to the `bookings` table:

```sql
-- Payment fields
payment_status TEXT DEFAULT 'pending'
payment_method TEXT
payment_reference TEXT
mpesa_phone TEXT
payment_date TIMESTAMP

-- Commission fields
commission_amount DECIMAL DEFAULT 0
organizer_amount DECIMAL DEFAULT 0
platform_fee DECIMAL DEFAULT 0
```

## 🔍 **Testing the Integration**

### **1. Start the Application**
```bash
npm run dev
```

### **2. Create a Test Event**
- Login as admin
- Create an event with a reasonable price (KES 50-200)
- Ensure event has available seats

### **3. Test Payment Flow**
- Navigate to event details
- Click "Buy Tickets"
- Enter test details:
  - Name: "Test User"
  - Email: "test@example.com"
  - Phone: "254708374149" (success test number)
  - Quantity: 1
- Select M-Pesa payment
- Click "Pay"
- Check your phone for STK Push
- Enter test PIN: `1234`

### **4. Verify Payment**
- Check admin dashboard for completed booking
- Verify commission calculations
- Check email confirmation

## 🚨 **Production Deployment**

### **1. Update Environment Variables**
```bash
MPESA_ENVIRONMENT="production"
MPESA_SHORTCODE="your-production-shortcode"
MPESA_PASSKEY="your-production-passkey"
MPESA_CALLBACK_URL="https://your-production-domain.com/api/payments/mpesa/callback"
```

### **2. SSL Certificate Required**
M-Pesa requires HTTPS for production webhooks. Ensure your domain has a valid SSL certificate.

### **3. Webhook URL**
Your callback URL must be publicly accessible:
```
https://your-domain.com/api/payments/mpesa/callback
```

### **4. Database Migration**
Run database migrations to ensure all new fields are created:
```bash
npm run db:migrate
```

## 📊 **Admin Dashboard Features**

### **Payment Analytics**
- Total revenue
- Platform commission
- Organizer payouts
- Payment success rate
- Pending payments

### **Booking Management**
- View all bookings with payment status
- Filter by payment method
- Export payment reports
- Commission breakdown

## 🔧 **Troubleshooting**

### **Common Issues**

1. **"Failed to authenticate with M-Pesa API"**
   - Check consumer key and secret
   - Verify environment setting

2. **"Payment initiation failed"**
   - Check phone number format (should be 254XXXXXXXXX)
   - Verify shortcode and passkey
   - Ensure callback URL is accessible

3. **"Webhook not received"**
   - Check callback URL accessibility
   - Verify SSL certificate (production)
   - Check server logs for errors

4. **"Payment status not updating"**
   - Check webhook processing
   - Verify booking reference format
   - Check database connection

### **Logs to Monitor**
```bash
# Payment initiation
console.log('STK Push failed:', error)

# Webhook processing
console.log('Payment successful:', {...})
console.log('Payment failed:', {...})

# Booking updates
console.log('Booking payment completed successfully')
```

## 📞 **Support**

For M-Pesa API issues:
- Safaricom Developer Portal: https://developer.safaricom.co.ke/
- API Documentation: https://developer.safaricom.co.ke/docs
- Support Email: apisupport@safaricom.co.ke

## 🔒 **Security Notes**

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Validate webhook signatures** in production
4. **Implement rate limiting** for payment endpoints
5. **Monitor for suspicious activity**

---

**🎉 Your payment system is now ready! Test thoroughly in sandbox before going live.** 
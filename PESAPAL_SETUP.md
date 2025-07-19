# 🏦 Pesapal Integration Setup Guide

## 📋 Overview

EventMasterPro now supports **Pesapal** for card payments in Kenya. This integration allows users to pay with:
- ✅ **Visa** (all types)
- ✅ **Mastercard** (all types) 
- ✅ **American Express**
- ✅ **M-Pesa Card**
- ✅ **Bank Transfers**

## 🔧 Environment Variables

Add these to your `.env` file:

```env
# Pesapal Configuration
PESAPAL_CONSUMER_KEY=your_pesapal_consumer_key
PESAPAL_CONSUMER_SECRET=your_pesapal_consumer_secret
PESAPAL_ENVIRONMENT=production  # Use production for real payments
PESAPAL_CALLBACK_URL=https://yourdomain.com/api/payments/pesapal/callback
```

## 🚀 Getting Started

### 1. **Pesapal Account Setup**
1. Go to [Pesapal Developer Portal](https://developer.pesapal.com/)
2. Create a developer account
3. Create a new application
4. Get your Consumer Key and Consumer Secret

### 2. **Sandbox Testing**
- Use sandbox environment for testing
- Test with Pesapal's test cards
- Verify webhook callbacks work

### 3. **Production Setup**
- Switch to production environment
- Update callback URL to your live domain
- Test with real cards

## 💳 How It Works

### **User Flow:**
1. User selects "Card Payment" at checkout
2. System creates Pesapal order
3. User redirected to Pesapal checkout page
4. User enters card details on Pesapal's secure page
5. Payment processed by Pesapal
6. Webhook notifies your system of payment status
7. User receives email with tickets

### **No Redirects (Embedded Checkout):**
- User stays on your site
- Card form appears in modal/iframe
- Seamless payment experience
- No page redirects

## 🔗 API Endpoints

### **Initiate Payment:**
```
POST /api/payments/pesapal/initiate
```

### **Check Status:**
```
GET /api/payments/pesapal/status/:orderTrackingId
```

### **Webhook Callback:**
```
POST /api/payments/pesapal/callback
```

## 🛠️ Testing

### **Test Cards (Sandbox):**
- **Visa:** 4111111111111111
- **Mastercard:** 5555555555554444
- **Expiry:** Any future date
- **CVV:** Any 3 digits

### **Test Phone Numbers:**
- **M-Pesa:** 254700000000
- **Airtel Money:** 254700000001

## 🔒 Security

- All card data handled by Pesapal
- No card details stored on your server
- PCI DSS compliant
- Secure webhook verification

## 📧 Email Notifications

Users receive:
- ✅ Payment confirmation email
- ✅ PDF ticket receipt with QR codes
- ✅ Event details and instructions

## 🎫 Ticket Generation

After successful payment:
- QR codes generated for each ticket
- PDF receipt created automatically
- Email sent with attachments
- Tickets ready for scanning

## 🚨 Troubleshooting

### **Common Issues:**

1. **"Missing required fields"**
   - Check all environment variables are set
   - Verify Pesapal credentials

2. **"Payment initiation failed"**
   - Check network connectivity
   - Verify callback URL is accessible

3. **"Webhook not received"**
   - Ensure callback URL is publicly accessible
   - Check server logs for errors

### **Debug Mode:**
Enable detailed logging by setting:
```env
DEBUG=true
```

## 📞 Support

- **Pesapal Support:** support@pesapal.com
- **Technical Issues:** Check server logs
- **Integration Help:** Review this guide

## 🎉 Success!

Once configured, users can:
- Pay with any major card
- Use M-Pesa card integration
- Complete payments securely
- Receive instant ticket confirmation

The integration provides a seamless payment experience for Kenyan users with full card support! 
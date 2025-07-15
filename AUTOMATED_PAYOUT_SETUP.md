# Automated Payout Setup Guide (Option 2)

## Overview
This guide explains how to set up **automated payouts** where:
- Customer pays → Your account gets the full amount
- System automatically pays organizers their share
- You keep the commission

## Money Flow
```
Customer pays $10 → Your M-Pesa account gets $10 → System automatically pays organizer $9
```

## Prerequisites

### 1. M-Pesa Business Account
- **Business registration** with Safaricom
- **M-Pesa Business API** access (not sandbox)
- **B2C (Business to Customer) API** enabled
- **Sufficient balance** for payouts

### 2. Environment Variables
Add these to your `.env` file:

```env
# M-Pesa Business API (Production)
MPESA_BASE_URL=https://api.safaricom.co.ke
MPESA_CONSUMER_KEY=your_business_consumer_key
MPESA_CONSUMER_SECRET=your_business_consumer_secret
MPESA_PASSKEY=your_business_passkey
MPESA_BUSINESS_SHORTCODE=your_business_shortcode

# For testing (Sandbox)
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_CONSUMER_KEY=your_sandbox_consumer_key
MPESA_CONSUMER_SECRET=your_sandbox_consumer_secret
MPESA_PASSKEY=your_sandbox_passkey
MPESA_BUSINESS_SHORTCODE=your_sandbox_shortcode

# Application
BASE_URL=http://localhost:3000
```

## Setup Steps

### Step 1: Database Setup
The database is already configured with:
- ✅ Commission tracking fields
- ✅ Organizer payout information fields
- ✅ Commission settings (10% default)

### Step 2: Set Up Organizer Payout Information
Run this script to set up organizer payout details:

```bash
npx tsx scripts/setup-organizer-payout.ts
```

**Important:** Replace the test M-Pesa number with real organizer numbers.

### Step 3: Configure M-Pesa Business API

#### For Production:
1. **Register Business Account** with Safaricom
2. **Apply for M-Pesa Business API** access
3. **Get API credentials** from Safaricom
4. **Enable B2C payments** for payouts

#### For Testing (Sandbox):
1. **Use existing sandbox credentials**
2. **Test with sandbox M-Pesa numbers**
3. **No real money involved**

### Step 4: Test the System

#### Test Payment Flow:
1. **Create an event** as admin
2. **Buy a ticket** as a customer
3. **Complete M-Pesa payment**
4. **Check automatic payout** to organizer

#### Expected Results:
- ✅ Payment received in your account
- ✅ Commission calculated ($1 from $10)
- ✅ Organizer amount calculated ($9 from $10)
- ✅ Automatic payout to organizer's M-Pesa
- ✅ Email notifications sent

## How It Works

### 1. Payment Processing
```typescript
// Customer pays $10
Customer → M-Pesa STK Push → Your Business Account ($10)
```

### 2. Commission Calculation
```typescript
// System calculates
Total: $10
Commission (10%): $1
Organizer Amount: $9
```

### 3. Automatic Payout
```typescript
// System automatically pays organizer
Your Account → M-Pesa B2C → Organizer's M-Pesa ($9)
```

### 4. Status Updates
```typescript
// Database updates
payment_status: "completed"
commission_amount: 1.00
organizer_amount: 9.00
payout_status: "completed"
```

## Email Notifications

### Customer Receives:
- ✅ Payment confirmation
- ✅ Booking details
- ✅ Transaction ID

### Organizer Receives:
- ✅ Payout confirmation
- ✅ Amount received
- ✅ Commission breakdown

### Admin Receives:
- ✅ Payout failure alerts
- ✅ Manual intervention needed

## Monitoring & Analytics

### Admin Dashboard Shows:
- **Total revenue** (your commission)
- **Organizer payouts** (amounts sent)
- **Commission breakdown** (per event)
- **Failed payouts** (need manual handling)

### Commission Summary:
```
Total Bookings: 100
Total Revenue: $1,000
Commission Earned: $100 (10%)
Organizer Payouts: $900
```

## Troubleshooting

### Common Issues:

#### 1. Payout Fails
**Cause:** Invalid M-Pesa number, insufficient balance
**Solution:** Check organizer M-Pesa number, ensure sufficient balance

#### 2. API Errors
**Cause:** Invalid credentials, network issues
**Solution:** Verify API credentials, check network connectivity

#### 3. Commission Not Calculated
**Cause:** Commission settings not configured
**Solution:** Run commission setup script

### Manual Payout Process:
If automatic payout fails:
1. **Check admin email** for failure notification
2. **Verify organizer M-Pesa number**
3. **Process payout manually** via M-Pesa app
4. **Update booking status** in admin dashboard

## Security Considerations

### 1. API Security
- ✅ Store credentials in environment variables
- ✅ Use HTTPS in production
- ✅ Implement API rate limiting

### 2. Data Protection
- ✅ Encrypt sensitive data
- ✅ Secure M-Pesa numbers
- ✅ Regular security audits

### 3. Transaction Security
- ✅ Verify payment amounts
- ✅ Validate organizer details
- ✅ Log all transactions

## Production Checklist

Before going live:
- [ ] **M-Pesa Business API** configured
- [ ] **Organizer payout details** verified
- [ ] **Commission settings** finalized
- [ ] **Email notifications** tested
- [ ] **Error handling** implemented
- [ ] **Security measures** in place
- [ ] **Monitoring** set up
- [ ] **Backup procedures** established

## Support

For issues with:
- **M-Pesa API:** Contact Safaricom Business Support
- **System Integration:** Check logs and error messages
- **Commission Calculation:** Verify database settings

---

**Note:** This system is designed for Kenyan M-Pesa integration. For other regions, adapt the payment provider accordingly. 
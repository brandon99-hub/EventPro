import axios from 'axios';
import { db } from './db';
import { users, bookings } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface MpesaPayoutResponse {
  ResultCode: string;
  ResultDesc: string;
  TransactionID?: string;
  ConversationID?: string;
}

export class MpesaPayoutService {
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;
  private passkey: string;
  private businessShortCode: string;

  constructor() {
    this.baseUrl = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || '';
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
    this.passkey = process.env.MPESA_PASSKEY || '';
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORTCODE || '';
  }

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    
    const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.access_token;
  }

  async payoutToOrganizer(
    organizerId: number, 
    amount: number, 
    bookingId: number
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Get organizer details
      const organizer = await db.select().from(users).where(eq(users.id, organizerId)).limit(1);
      
      if (!organizer.length || !organizer[0].mpesaPhone) {
        return { success: false, error: 'Organizer not found or no M-Pesa number' };
      }

      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const password = Buffer.from(`${this.businessShortCode}${this.passkey}${timestamp}`).toString('base64');

      const payload = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'BusinessPayment',
        Amount: Math.round(amount), // M-Pesa requires whole numbers
        PartyA: this.businessShortCode,
        PartyB: organizer[0].mpesaPhone,
        PhoneNumber: organizer[0].mpesaPhone,
        CallBackURL: `${process.env.BASE_URL}/api/mpesa/payout-callback`,
        AccountReference: `Booking-${bookingId}`,
        TransactionDesc: `Event ticket payout for booking ${bookingId}`
      };

      const response = await axios.post<MpesaPayoutResponse>(
        `${this.baseUrl}/mpesa/b2c/v1/paymentrequest`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.ResultCode === '0') {
        // Update booking with payout info
        await db.update(bookings)
          .set({ 
            paymentReference: response.data.TransactionID,
            paymentDate: new Date()
          })
          .where(eq(bookings.id, bookingId));

        return { 
          success: true, 
          transactionId: response.data.TransactionID 
        };
      } else {
        return { 
          success: false, 
          error: response.data.ResultDesc 
        };
      }

    } catch (error) {
      console.error('M-Pesa payout error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async processPayoutCallback(data: any): Promise<void> {
    // Handle M-Pesa payout callback
    console.log('Payout callback received:', data);
    
    // Update booking status based on callback
    if (data.ResultCode === '0') {
      // Payout successful
      await db.update(bookings)
        .set({ paymentStatus: 'payout_completed' })
        .where(eq(bookings.paymentReference, data.TransactionID));
    } else {
      // Payout failed
      await db.update(bookings)
        .set({ paymentStatus: 'payout_failed' })
        .where(eq(bookings.paymentReference, data.TransactionID));
    }
  }
}

export const mpesaPayoutService = new MpesaPayoutService(); 
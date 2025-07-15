import axios from 'axios';
import crypto from 'crypto';

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  environment: 'sandbox' | 'production';
  callbackUrl: string;
}

export interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  reference: string;
  description: string;
}

export interface STKPushResponse {
  success: boolean;
  checkoutRequestID?: string;
  merchantRequestID?: string;
  customerMessage?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: 'pending' | 'completed' | 'failed';
  transactionId?: string;
  amount?: number;
  phoneNumber?: string;
  errorMessage?: string;
}

export class MpesaService {
  private config: MpesaConfig;
  private baseUrl: string;

  constructor(config: MpesaConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'sandbox' 
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';
  }

  // Get access token for API authentication
  private async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');
      
      const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Failed to get M-Pesa access token:', error);
      throw new Error('Failed to authenticate with M-Pesa API');
    }
  }

  // Generate timestamp for STK Push
  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  // Generate password for STK Push
  private generatePassword(): string {
    const timestamp = this.generateTimestamp();
    const password = `${this.config.shortcode}${this.config.passkey}${timestamp}`;
    return Buffer.from(password).toString('base64');
  }

  // Format phone number for M-Pesa (254XXXXXXXXX)
  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    
    // If it starts with +254, remove the +
    if (cleaned.startsWith('254')) {
      return cleaned;
    }
    
    // If it's 11 digits and starts with 1, add 254
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return '254' + cleaned.substring(1);
    }
    
    // If it's 9 digits, add 254
    if (cleaned.length === 9) {
      return '254' + cleaned;
    }
    
    return cleaned;
  }

  // Initiate STK Push payment
  async initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword();
      const phoneNumber = this.formatPhoneNumber(request.phoneNumber);

      const payload = {
        BusinessShortCode: this.config.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(request.amount), // M-Pesa expects whole numbers
        PartyA: phoneNumber,
        PartyB: this.config.shortcode,
        PhoneNumber: phoneNumber,
        CallBackURL: this.config.callbackUrl,
        AccountReference: request.reference,
        TransactionDesc: request.description
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data;

      if (result.ResultCode === '0') {
        return {
          success: true,
          checkoutRequestID: result.CheckoutRequestID,
          merchantRequestID: result.MerchantRequestID,
          customerMessage: result.CustomerMessage
        };
      } else {
        return {
          success: false,
          errorCode: result.ResultCode,
          errorMessage: result.ResultDesc
        };
      }
    } catch (error) {
      console.error('STK Push failed:', error);
      return {
        success: false,
        errorMessage: 'Failed to initiate payment'
      };
    }
  }

  // Check payment status
  async checkPaymentStatus(checkoutRequestID: string): Promise<PaymentStatusResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword();

      const payload = {
        BusinessShortCode: this.config.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data;

      if (result.ResultCode === '0') {
        return {
          success: true,
          status: 'completed',
          transactionId: result.TransactionID,
          amount: result.Amount,
          phoneNumber: result.PhoneNumber
        };
      } else if (result.ResultCode === '1032') {
        return {
          success: true,
          status: 'pending'
        };
      } else {
        return {
          success: false,
          status: 'failed',
          errorMessage: result.ResultDesc
        };
      }
    } catch (error) {
      console.error('Payment status check failed:', error);
      return {
        success: false,
        status: 'failed',
        errorMessage: 'Failed to check payment status'
      };
    }
  }

  // Process webhook callback
  processWebhook(payload: any): {
    success: boolean;
    checkoutRequestID?: string;
    resultCode?: string;
    resultDesc?: string;
    transactionId?: string;
    amount?: number;
    phoneNumber?: string;
  } {
    try {
      const body = payload.Body?.stkCallback;
      
      if (!body) {
        return { success: false };
      }

      const resultCode = body.ResultCode;
      const checkoutRequestID = body.CheckoutRequestID;
      const resultDesc = body.ResultDesc;

      if (resultCode === '0') {
        // Payment successful
        const item = body.CallbackMetadata?.Item?.find((i: any) => i.Name === 'TransactionID');
        const amountItem = body.CallbackMetadata?.Item?.find((i: any) => i.Name === 'Amount');
        const phoneItem = body.CallbackMetadata?.Item?.find((i: any) => i.Name === 'PhoneNumber');

        return {
          success: true,
          checkoutRequestID,
          resultCode,
          resultDesc,
          transactionId: item?.Value,
          amount: amountItem?.Value,
          phoneNumber: phoneItem?.Value
        };
      } else {
        // Payment failed
        return {
          success: false,
          checkoutRequestID,
          resultCode,
          resultDesc
        };
      }
    } catch (error) {
      console.error('Webhook processing failed:', error);
      return { success: false };
    }
  }
}

// Create M-Pesa service instance
export const mpesaService = new MpesaService({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  shortcode: process.env.MPESA_SHORTCODE!,
  passkey: process.env.MPESA_PASSKEY!,
  environment: (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  callbackUrl: process.env.MPESA_CALLBACK_URL!
}); 
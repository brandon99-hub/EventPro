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
      const url = `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.access_token;
    } catch (error: any) {
      console.error('Failed to get M-Pesa access token:', error.message);
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

      if (result.ResponseCode === '0') {
        return {
          success: true,
          checkoutRequestID: result.CheckoutRequestID,
          merchantRequestID: result.MerchantRequestID,
          customerMessage: result.CustomerMessage
        };
      } else {
        console.log('M-Pesa error:', result.ResponseCode, result.ResponseDescription);
        return {
          success: false,
          errorCode: result.ResponseCode,
          errorMessage: result.ResponseDescription
        };
      }
    } catch (error: any) {
      console.error("💥 Error in initiateSTKPush:", error);
      console.error("Error type:", typeof error);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      
      // Try to extract from Axios error
      if (error.isAxiosError && error.response) {
        console.error("📡 Axios error response:", JSON.stringify(error.response.data, null, 2));
        console.error("📡 Axios error status:", error.response.status);
        console.error("📡 Axios error headers:", error.response.headers);
        
        const errorData = error.response.data;
        const errorCode = errorData?.errorCode || errorData?.ResultCode || error.response.status?.toString();
        const errorMessage = errorData?.errorMessage || errorData?.ResultDesc || errorData?.message || error.response.statusText || 'Payment initiation failed';
        
        console.error("🔍 Extracted error code:", errorCode);
        console.error("🔍 Extracted error message:", errorMessage);
        
        return {
          success: false,
          errorCode,
          errorMessage
        };
      }
      
      // Fallback: log error as string and all enumerable properties
      console.error("🔍 Fallback error handling");
      return {
        success: false,
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: error && error.message ? error.message : String(error) || 'Failed to initiate payment'
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
    } catch (error: any) {
      console.error('Payment status check failed:', error);
      
      // Handle the case where M-Pesa returns 500 with "transaction is being processed"
      if (error.isAxiosError && error.response?.status === 500) {
        const errorData = error.response.data;
        if (errorData?.errorMessage === 'The transaction is being processed' || 
            errorData?.errorCode === '500.001.1001') {
          console.log('🔄 Transaction is still being processed, treating as pending');
          return {
            success: true,
            status: 'pending'
          };
        }
      }
      
      // Handle rate limiting (403 errors)
      if (error.isAxiosError && error.response?.status === 403) {
        console.log('⚠️ Rate limited by M-Pesa API, treating as pending');
        return {
          success: true,
          status: 'pending'
        };
      }
      
      // Handle authentication errors
      if (error.isAxiosError && error.response?.status === 401) {
        console.log('🔐 Authentication failed, treating as pending');
        return {
          success: true,
          status: 'pending'
        };
      }
      
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
      console.log('🔍 Processing webhook payload:', JSON.stringify(payload, null, 2));
      
      const body = payload.Body?.stkCallback;
      
      if (!body) {
        console.log('❌ No stkCallback in payload');
        return { success: false };
      }

      const resultCode = body.ResultCode;
      const checkoutRequestID = body.CheckoutRequestID;
      const resultDesc = body.ResultDesc;

      console.log(`📊 Webhook ResultCode: ${resultCode}, ResultDesc: ${resultDesc}`);

      // M-Pesa success codes: 0 = success, 1 = success (different API versions)
      if (resultCode === 0 || resultCode === '0' || resultCode === 1 || resultCode === '1') {
        // Payment successful
        const transactionItem = body.CallbackMetadata?.Item?.find((i: any) => i.Name === 'TransactionID') || 
                               body.CallbackMetadata?.Item?.find((i: any) => i.Name === 'MpesaReceiptNumber');
        const amountItem = body.CallbackMetadata?.Item?.find((i: any) => i.Name === 'Amount');
        const phoneItem = body.CallbackMetadata?.Item?.find((i: any) => i.Name === 'PhoneNumber');

        console.log('✅ Payment successful, extracting metadata...');
        console.log('📱 TransactionID/Receipt:', transactionItem?.Value);
        console.log('💰 Amount:', amountItem?.Value);
        console.log('📞 Phone:', phoneItem?.Value);

        return {
          success: true,
          checkoutRequestID,
          resultCode,
          resultDesc,
          transactionId: transactionItem?.Value,
          amount: amountItem?.Value,
          phoneNumber: phoneItem?.Value
        };
      } else {
        // Payment failed
        console.log('❌ Payment failed:', resultDesc);
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

// Create M-Pesa service instance with lazy initialization
let mpesaServiceInstance: MpesaService | null = null;

export function getMpesaService(): MpesaService {
  if (mpesaServiceInstance) {
    return mpesaServiceInstance;
  }
  
  console.log("🔧 Initializing M-Pesa service...");
  
  // Check environment variables
  const config = {
    consumerKey: process.env.MPESA_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    shortcode: process.env.MPESA_SHORTCODE,
    passkey: process.env.MPESA_PASSKEY,
    environment: (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    callbackUrl: process.env.MPESA_CALLBACK_URL || 'http://localhost:5000/api/payments/mpesa/callback'
  };
  
  console.log("📋 M-Pesa config:", {
    consumerKey: config.consumerKey ? '***SET***' : 'MISSING',
    consumerSecret: config.consumerSecret ? '***SET***' : 'MISSING',
    shortcode: config.shortcode || 'MISSING',
    passkey: config.passkey ? '***SET***' : 'MISSING',
    environment: config.environment,
    callbackUrl: config.callbackUrl
  });
  
  // Validate required fields
  if (!config.consumerKey || !config.consumerSecret || !config.shortcode || !config.passkey) {
    throw new Error('Missing required M-Pesa environment variables');
  }
  
  // Create new instance
  mpesaServiceInstance = new MpesaService({
    consumerKey: config.consumerKey,
    consumerSecret: config.consumerSecret,
    shortcode: config.shortcode,
    passkey: config.passkey,
    environment: config.environment,
    callbackUrl: config.callbackUrl
  } as MpesaConfig);
  console.log("✅ M-Pesa service initialized successfully");
  return mpesaServiceInstance;
}

// Export for backward compatibility - lazy initialization
export const mpesaService = {
  get initiateSTKPush() {
    return getMpesaService().initiateSTKPush.bind(getMpesaService());
  },
  get checkPaymentStatus() {
    return getMpesaService().checkPaymentStatus.bind(getMpesaService());
  },
  get processWebhook() {
    return getMpesaService().processWebhook.bind(getMpesaService());
  }
}; 
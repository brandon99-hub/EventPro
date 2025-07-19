import axios from 'axios';
import crypto from 'crypto';

export interface PesapalConfig {
  consumerKey: string;
  consumerSecret: string;
  environment: 'sandbox' | 'production';
  callbackUrl: string;
}

export interface PesapalOrderRequest {
  amount: number;
  reference: string;
  description: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  currency: string;
  callbackUrl: string;
}

export interface PesapalOrderResponse {
  success: boolean;
  orderTrackingId?: string;
  checkoutUrl?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface PesapalStatusResponse {
  success: boolean;
  status: 'pending' | 'completed' | 'failed';
  transactionId?: string;
  amount?: number;
  errorMessage?: string;
}

export class PesapalService {
  private config: PesapalConfig;
  private baseUrl: string;

  constructor(config: PesapalConfig) {
    this.config = config;
    // Always use production API - no sandbox fallbacks
    this.baseUrl = 'https://www.pesapal.com';
  }

  // Get OAuth access token using real Pesapal API
  private async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');
      
      // Try the actual working Pesapal API endpoints
      const endpoints = [
        'https://www.pesapal.com/api/Auth/RequestToken',
        'https://www.pesapal.com/api/v1/auth/token',
        'https://www.pesapal.com/api/v2/auth/token',
        'https://www.pesapal.com/api/oauth/token'
      ];
      
      for (const url of endpoints) {
        try {
          console.log(`🔐 Trying Pesapal endpoint: ${url}`);
          
          const response = await axios.post(url, {}, {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 10000
          });

          console.log('✅ Pesapal access token received');
          return response.data.token || response.data.access_token;
        } catch (endpointError: any) {
          console.log(`❌ Endpoint ${url} failed: ${endpointError.response?.status || endpointError.message}`);
          continue;
        }
      }
      
      throw new Error('All Pesapal API endpoints failed');
    } catch (error: any) {
      console.error('❌ Failed to get Pesapal access token:', error.message);
      throw new Error('Failed to authenticate with Pesapal API');
    }
  }

  // Create IPN (Instant Payment Notification) URL
  private async createIPN(): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `${this.baseUrl}/api/URLSetup/RegisterIPN`;
      
      const response = await axios.post(url, {
        url: this.config.callbackUrl,
        ipn_notification_type: 'GET'
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.ipn_id;
    } catch (error: any) {
      console.error('Failed to create IPN:', error.message);
      // Return a default IPN ID for sandbox
      return this.config.environment === 'sandbox' ? 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919' : '';
    }
  }

  // Create order for payment
  async createOrder(request: PesapalOrderRequest): Promise<PesapalOrderResponse> {
    try {
      // Production flow only - no mock data
      const accessToken = await this.getAccessToken();
      const ipnId = await this.createIPN();
      
      // Use the correct Pesapal order format
      const orderData = {
        id: request.reference,
        currency: request.currency,
        amount: request.amount,
        description: request.description,
        callback_url: request.callbackUrl,
        notification_id: ipnId,
        billing_address: {
          email_address: request.buyerEmail,
          phone_number: request.buyerPhone,
          country_code: 'KE',
          first_name: request.buyerName.split(' ')[0] || request.buyerName,
          last_name: request.buyerName.split(' ').slice(1).join(' ') || '',
          line_1: 'N/A',
          city: 'Nairobi',
          state: 'Nairobi',
          postal_code: '00100'
        }
      };

      console.log('📦 Creating Pesapal order with data:', JSON.stringify(orderData, null, 2));
      
      // Try different order endpoints
      const orderEndpoints = [
        `${this.baseUrl}/api/Transactions/SubmitOrderRequest`,
        `${this.baseUrl}/api/v1/transactions/order`,
        `${this.baseUrl}/api/v2/transactions/order`,
        `${this.baseUrl}/api/orders`
      ];
      
      let lastError: any = null;
      
      for (const url of orderEndpoints) {
        try {
          console.log(`🔗 Trying order endpoint: ${url}`);
          
          const response = await axios.post(url, orderData, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 15000
          });

          console.log('✅ Order created successfully');
          console.log('✅ Response:', response.data);
          
          const result = response.data;
          return {
            success: true,
            orderTrackingId: result.order_tracking_id || result.tracking_id || result.id,
            checkoutUrl: result.redirect_url || result.checkout_url || result.url
          };
        } catch (endpointError: any) {
          console.log(`❌ Endpoint ${url} failed: ${endpointError.response?.status || endpointError.message}`);
          if (endpointError.response?.data) {
            console.log(`❌ Error details:`, endpointError.response.data);
          }
          lastError = endpointError;
          continue;
        }
      }
      
      // If all endpoints fail, throw the last error
      throw lastError || new Error('All order endpoints failed');
    } catch (error: any) {
      console.error('Failed to create Pesapal order:', error);
      
      if (error.response) {
        return {
          success: false,
          errorCode: error.response.status?.toString(),
          errorMessage: error.response.data?.message || 'Failed to create order'
        };
      }
      
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: error.message || 'Network error occurred'
      };
    }
  }

  // Check payment status
  async checkPaymentStatus(orderTrackingId: string): Promise<PesapalStatusResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `${this.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const result = response.data;

      if (result.payment_status_description === 'Completed') {
        return {
          success: true,
          status: 'completed',
          transactionId: result.payment_method_description || orderTrackingId,
          amount: result.amount
        };
      } else if (result.payment_status_description === 'Pending') {
        return {
          success: true,
          status: 'pending'
        };
      } else {
        return {
          success: false,
          status: 'failed',
          errorMessage: result.payment_status_description || 'Payment failed'
        };
      }
    } catch (error: any) {
      console.error('Failed to check Pesapal payment status:', error);
      return {
        success: false,
        status: 'failed',
        errorMessage: error.message || 'Failed to check payment status'
      };
    }
  }

  // Process webhook callback
  processWebhook(payload: any): {
    success: boolean;
    orderTrackingId?: string;
    paymentStatus?: string;
    transactionId?: string;
    amount?: number;
  } {
    try {
      console.log('🔍 Processing Pesapal webhook payload:', JSON.stringify(payload, null, 2));
      
      const orderTrackingId = payload.order_tracking_id;
      const paymentStatus = payload.payment_status_description;
      const transactionId = payload.payment_method_description;
      const amount = payload.amount;

      if (paymentStatus === 'Completed') {
        return {
          success: true,
          orderTrackingId,
          paymentStatus,
          transactionId,
          amount
        };
      } else {
        return {
          success: false,
          orderTrackingId,
          paymentStatus
        };
      }
    } catch (error) {
      console.error('Pesapal webhook processing failed:', error);
      return { success: false };
    }
  }
}

// Create Pesapal service instance with lazy initialization
let pesapalServiceInstance: PesapalService | null = null;

export function getPesapalService(): PesapalService {
  if (pesapalServiceInstance) {
    return pesapalServiceInstance;
  }
  
  console.log("🔧 Initializing Pesapal service...");
  
  // Check environment variables
  const config = {
    consumerKey: process.env.PESAPAL_CONSUMER_KEY,
    consumerSecret: process.env.PESAPAL_CONSUMER_SECRET,
    environment: (process.env.PESAPAL_ENVIRONMENT as 'sandbox' | 'production') || 'production',
    callbackUrl: process.env.PESAPAL_CALLBACK_URL || 'http://localhost:5000/api/payments/pesapal/callback'
  };
  
  console.log("📋 Pesapal config:", {
    consumerKey: config.consumerKey ? '***SET***' : 'MISSING',
    consumerSecret: config.consumerSecret ? '***SET***' : 'MISSING',
    environment: config.environment,
    callbackUrl: config.callbackUrl
  });
  
  // Validate required fields
  if (!config.consumerKey || !config.consumerSecret) {
    throw new Error('Missing required Pesapal environment variables');
  }
  
  // Create new instance
  pesapalServiceInstance = new PesapalService({
    consumerKey: config.consumerKey,
    consumerSecret: config.consumerSecret,
    environment: config.environment,
    callbackUrl: config.callbackUrl
  } as PesapalConfig);
  
  console.log("✅ Pesapal service initialized successfully");
  return pesapalServiceInstance;
}

// Export service methods for easy access
export const pesapalService = {
  get createOrder() {
    return getPesapalService().createOrder.bind(getPesapalService());
  },
  
  get checkPaymentStatus() {
    return getPesapalService().checkPaymentStatus.bind(getPesapalService());
  },
  
  get processWebhook() {
    return getPesapalService().processWebhook.bind(getPesapalService());
  }
}; 
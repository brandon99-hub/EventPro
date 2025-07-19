export interface PaymentRequest {
  phoneNumber: string;
  amount: number;
  reference: string;
  description: string;
}

export interface PesapalPaymentRequest {
  amount: number;
  reference: string;
  description: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  currency: string;
  callbackUrl: string;
}

export interface PaymentResponse {
  success: boolean;
  checkoutRequestID?: string;
  merchantRequestID?: string;
  customerMessage?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface PesapalPaymentResponse {
  success: boolean;
  checkoutUrl?: string;
  orderTrackingId?: string;
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

class PaymentService {
  private baseUrl = '/api/payments';

  async initiateMpesaPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/mpesa/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          errorMessage: error.message || 'Failed to initiate payment'
        };
      }

      return await response.json();
    } catch (error) {
      console.error('Payment initiation failed:', error);
      return {
        success: false,
        errorMessage: 'Network error occurred'
      };
    }
  }

  async initiatePesapalPayment(request: PesapalPaymentRequest): Promise<PesapalPaymentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/pesapal/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          errorMessage: error.message || 'Failed to initiate Pesapal payment'
        };
      }

      return await response.json();
    } catch (error) {
      console.error('Pesapal payment initiation failed:', error);
      return {
        success: false,
        errorMessage: 'Network error occurred'
      };
    }
  }

  async checkPaymentStatus(checkoutRequestID: string): Promise<PaymentStatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/status/${checkoutRequestID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          status: 'failed',
          errorMessage: error.message || 'Failed to check payment status'
        };
      }

      return await response.json();
    } catch (error) {
      console.error('Payment status check failed:', error);
      return {
        success: false,
        status: 'failed',
        errorMessage: 'Network error occurred'
      };
    }
  }

  async checkPesapalPaymentStatus(orderTrackingId: string): Promise<PaymentStatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/pesapal/status/${orderTrackingId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          status: 'failed',
          errorMessage: error.message || 'Failed to check Pesapal payment status'
        };
      }

      return await response.json();
    } catch (error) {
      console.error('Pesapal payment status check failed:', error);
      return {
        success: false,
        status: 'failed',
        errorMessage: 'Network error occurred'
      };
    }
  }

  // Poll payment status until completed or failed
  async pollPaymentStatus(checkoutRequestID: string, maxAttempts = 4): Promise<PaymentStatusResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const status = await this.checkPaymentStatus(checkoutRequestID);
        
        if (status.status === 'completed' || status.status === 'failed') {
          return status;
        }
        
        // Shorter wait times for better UX
        // Start with 3 seconds, then increase to 5 seconds
        const waitTime = attempt < 2 ? 3000 : 5000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } catch (error) {
        console.log(`Poll attempt ${attempt + 1} failed, retrying...`);
        // Wait 5 seconds on error
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Return pending status after shorter polling period
    return {
      success: true,
      status: 'pending',
      errorMessage: 'Payment initiated successfully. Please check your email for confirmation once payment is processed.'
    };
  }
}

export const paymentService = new PaymentService(); 
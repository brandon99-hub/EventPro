export interface PaymentRequest {
  phoneNumber: string;
  amount: number;
  reference: string;
  description: string;
}

export interface PaymentResponse {
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

  // Poll payment status until completed or failed
  async pollPaymentStatus(checkoutRequestID: string, maxAttempts = 30): Promise<PaymentStatusResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.checkPaymentStatus(checkoutRequestID);
      
      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }
      
      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return {
      success: false,
      status: 'failed',
      errorMessage: 'Payment status check timed out'
    };
  }
}

export const paymentService = new PaymentService(); 
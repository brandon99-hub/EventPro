import axios from 'axios';

async function testWebhook() {
  const webhookUrl = 'https://eventpro-70gf.onrender.com/api/payments/mpesa/callback';
  
  // Simulate a successful M-Pesa webhook
  const webhookPayload = {
    "Body": {
      "stkCallback": {
        "MerchantRequestID": "test-merchant-request-id",
        "CheckoutRequestID": "ws_CO_19072025014808076741991213", // This is your actual stuck payment
        "ResultCode": 0,
        "ResultDesc": "The service request is processed successfully.",
        "CallbackMetadata": {
          "Item": [
            {
              "Name": "Amount",
              "Value": 2
            },
            {
              "Name": "MpesaReceiptNumber",
              "Value": "TEST123456"
            },
            {
              "Name": "TransactionDate",
              "Value": 20250719014808
            },
            {
              "Name": "PhoneNumber",
              "Value": 254741991213
            }
          ]
        }
      }
    }
  };

  try {
    console.log('🚀 Testing webhook endpoint...');
    console.log('📡 URL:', webhookUrl);
    console.log('📦 Payload:', JSON.stringify(webhookPayload, null, 2));
    
    const response = await axios.post(webhookUrl, webhookPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Webhook test successful!');
    console.log('📊 Response status:', response.status);
    console.log('📄 Response data:', response.data);
    
  } catch (error: any) {
    console.error('❌ Webhook test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testWebhook(); 
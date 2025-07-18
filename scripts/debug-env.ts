// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

console.log("🔍 Environment Variables Debug");
console.log("==============================");

console.log("\n📋 M-Pesa Variables:");
console.log("MPESA_CONSUMER_KEY:", process.env.MPESA_CONSUMER_KEY ? 'SET' : 'MISSING');
console.log("MPESA_CONSUMER_SECRET:", process.env.MPESA_CONSUMER_SECRET ? 'SET' : 'MISSING');
console.log("MPESA_SHORTCODE:", process.env.MPESA_SHORTCODE || 'MISSING');
console.log("MPESA_PASSKEY:", process.env.MPESA_PASSKEY ? 'SET' : 'MISSING');
console.log("MPESA_ENVIRONMENT:", process.env.MPESA_ENVIRONMENT || 'MISSING');
console.log("MPESA_CALLBACK_URL:", process.env.MPESA_CALLBACK_URL || 'NOT SET');

console.log("\n📋 Other Variables:");
console.log("NODE_ENV:", process.env.NODE_ENV || 'NOT SET');
console.log("DATABASE_URL:", process.env.DATABASE_URL ? 'SET' : 'MISSING');

console.log("\n🔍 All Environment Variables:");
Object.keys(process.env).forEach(key => {
  if (key.includes('MPESA') || key.includes('DATABASE') || key.includes('GMAIL')) {
    const value = process.env[key];
    if (key.includes('SECRET') || key.includes('KEY') || key.includes('PASS')) {
      console.log(`${key}: ${value ? '***SET***' : 'MISSING'}`);
    } else {
      console.log(`${key}: ${value || 'MISSING'}`);
    }
  }
}); 
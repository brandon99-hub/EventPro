import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log("🔍 Environment Variables Check");
console.log("==============================");

const requiredVars = [
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_SHORTCODE',
  'MPESA_PASSKEY',
  'MPESA_ENVIRONMENT'
];

const optionalVars = [
  'MPESA_CALLBACK_URL',
  'MPESA_BASE_URL'
];

console.log("\n📋 Required Variables:");
let allRequiredSet = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName.includes('SECRET') || varName.includes('KEY') ? '***SET***' : value}`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
    allRequiredSet = false;
  }
});

console.log("\n📋 Optional Variables:");
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`⚠️  ${varName}: NOT SET (using default)`);
  }
});

console.log("\n📊 Summary:");
if (allRequiredSet) {
  console.log("✅ All required environment variables are set!");
} else {
  console.log("❌ Some required environment variables are missing!");
  console.log("Please check your .env file or environment configuration.");
}

console.log("\n🌍 Environment:", process.env.NODE_ENV || 'development');
console.log("🏠 Database URL:", process.env.DATABASE_URL ? 'SET' : 'MISSING');
console.log("📧 Gmail User:", process.env.GMAIL_USER ? 'SET' : 'MISSING');
console.log("📧 Gmail Pass:", process.env.GMAIL_PASS ? 'SET' : 'MISSING');

process.exit(allRequiredSet ? 0 : 1); 
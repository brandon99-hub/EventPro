import { db } from '../server/db';
import { commissionSettings } from '../shared/schema';

async function main() {
  console.log('Adding commission settings...');
  
  // Check if commission settings already exist
  const existingSettings = await db.select().from(commissionSettings);
  
  if (existingSettings.length > 0) {
    console.log('Commission settings already exist, skipping...');
    console.log('Current settings:', existingSettings);
  } else {
    // Add commission settings
    await db.insert(commissionSettings).values({
      platformFeePercentage: 0.10, // 10% commission
      minimumFee: 0,
      maximumFee: 1000,
      isActive: true,
    });
    
    console.log('✅ Commission settings added successfully!');
    console.log('Platform fee: 10%');
    console.log('Minimum fee: $0');
    console.log('Maximum fee: $1000');
  }
  
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
}); 
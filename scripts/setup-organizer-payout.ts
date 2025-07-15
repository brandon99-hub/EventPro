import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Setting up organizer payout information...');
  
  // Get all users who are not admin
  const allUsers = await db.select().from(users);
  const organizers = allUsers.filter(user => !user.isAdmin);
  
  if (organizers.length === 0) {
    console.log('No organizers found. Please create some user accounts first.');
    return;
  }
  
  console.log(`Found ${organizers.length} organizer(s):`);
  organizers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.fullName} (${user.username})`);
  });
  
  // For demo purposes, let's set up the first organizer with a test M-Pesa number
  const firstOrganizer = organizers[0];
  
  if (!firstOrganizer.mpesaPhone) {
    console.log(`\nSetting up payout for ${firstOrganizer.fullName}...`);
    
    // Update with test M-Pesa number (replace with real number in production)
    await db.update(users)
      .set({
        mpesaPhone: '254700000000', // Replace with actual M-Pesa number
        payoutMethod: 'mpesa',
        isVerified: true
      })
      .where(eq(users.id, firstOrganizer.id));
    
    console.log('✅ Payout information set up successfully!');
    console.log(`M-Pesa Number: 254700000000`);
    console.log('⚠️  IMPORTANT: Replace with actual M-Pesa number before testing payments');
  } else {
    console.log(`\n${firstOrganizer.fullName} already has payout information:`);
    console.log(`M-Pesa Number: ${firstOrganizer.mpesaPhone}`);
    console.log(`Payout Method: ${firstOrganizer.payoutMethod}`);
    console.log(`Verified: ${firstOrganizer.isVerified}`);
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Replace the M-Pesa number with a real one');
  console.log('2. Set up M-Pesa Business API credentials in .env');
  console.log('3. Test the payment flow');
  
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
}); 
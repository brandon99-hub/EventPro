import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function main() {
  console.log('Resetting admin password...');
  
  // New password for admin
  const newPassword = 'adminpassword';
  
  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Update admin user password
  await db.update(users)
    .set({ password: hashedPassword })
    .where(eq(users.username, 'admin'));
  
  console.log('✅ Admin password reset successfully!');
  console.log('Username: admin');
  console.log('Password: adminpassword');
  console.log('\nYou can now login with these credentials.');
  
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
}); 
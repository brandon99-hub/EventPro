import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function main() {
  console.log('Testing authentication system...');
  
  // Get admin user
  const adminUser = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
  
  if (!adminUser.length) {
    console.log('❌ Admin user not found!');
    return;
  }
  
  const admin = adminUser[0];
  console.log('✅ Admin user found:', {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    isAdmin: admin.isAdmin
  });
  
  // Test password verification
  const testPassword = 'adminpassword';
  const isValid = await bcrypt.compare(testPassword, admin.password);
  
  console.log('Password verification:', isValid ? '✅ Valid' : '❌ Invalid');
  
  if (!isValid) {
    console.log('🔧 Resetting password...');
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, admin.id));
    console.log('✅ Password reset complete');
  }
  
  console.log('\n📋 Login Credentials:');
  console.log('Username: admin');
  console.log('Password: adminpassword');
  console.log('Admin Status:', admin.isAdmin ? '✅ Yes' : '❌ No');
  
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
}); 
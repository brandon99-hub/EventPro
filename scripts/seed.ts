import { db } from '../server/db';
import { users, categories, events } from '../shared/schema';
import { randomBytes, scryptSync } from 'crypto';

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = scryptSync(password, salt, 64) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function main() {
  // Admin user
  const adminPassword = await hashPassword('adminpassword');
  await db.insert(users).values({
    username: 'admin',
    password: adminPassword,
    email: 'admin@eventhub.com',
    fullName: 'Admin User',
    isAdmin: true,
  }).onConflictDoNothing();

  // Categories
  const categoryData = [
    { name: 'Concert', color: '#6366F1' },
    { name: 'Sports', color: '#8B5CF6' },
    { name: 'Theater', color: '#22C55E' },
    { name: 'Comedy', color: '#EC4899' },
    { name: 'Festival', color: '#F59E0B' },
    { name: 'Family', color: '#3B82F6' },
  ];
  for (const cat of categoryData) {
    await db.insert(categories).values(cat).onConflictDoNothing();
  }
  const allCategories = await db.select().from(categories);

  // Events
  const now = new Date();
  const eventData = [
    {
      title: 'University Cultural Night',
      description: 'A night of music, dance, and food celebrating our diverse campus community.',
      imageUrl: 'https://images.unsplash.com/photo-1464983953574-0892a716854b',
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 18, 0),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 0),
      location: 'Main Hall',
      venue: 'University Auditorium',
      price: 5,
      maxPrice: null,
      totalSeats: 500,
      availableSeats: 500,
      categoryId: allCategories.find(c => c.name === 'Festival')?.id || 1,
      createdBy: 1,
      isFeatured: true,
    },
    {
      title: 'Varsity Football Finals',
      description: 'Come cheer for your faculty in the annual football finals!',
      imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10, 15, 0),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10, 18, 0),
      location: 'Sports Field',
      venue: 'University Stadium',
      price: 2,
      maxPrice: null,
      totalSeats: 1000,
      availableSeats: 1000,
      categoryId: allCategories.find(c => c.name === 'Sports')?.id || 2,
      createdBy: 1,
      isFeatured: false,
    },
    {
      title: 'Drama Club Play: Hamlet',
      description: 'The Drama Club presents Shakespeare\'s Hamlet. Open to all students and staff.',
      imageUrl: 'https://images.unsplash.com/photo-1515168833906-d2a3b82b3029',
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14, 19, 0),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14, 22, 0),
      location: 'Black Box Theater',
      venue: 'Drama Hall',
      price: 3,
      maxPrice: null,
      totalSeats: 200,
      availableSeats: 200,
      categoryId: allCategories.find(c => c.name === 'Theater')?.id || 3,
      createdBy: 1,
      isFeatured: false,
    },
  ];
  for (const ev of eventData) {
    await db.insert(events).values(ev).onConflictDoNothing();
  }

  console.log('Seed complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 
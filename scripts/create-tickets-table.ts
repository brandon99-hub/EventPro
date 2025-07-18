import { db } from '../server/db';

async function createTicketsTable() {
  try {
    console.log('Creating tickets table...');
    
    // Create tickets table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "tickets" (
        "id" serial PRIMARY KEY NOT NULL,
        "booking_id" integer NOT NULL,
        "event_id" integer NOT NULL,
        "ticket_number" integer NOT NULL,
        "qr_code" text NOT NULL,
        "is_scanned" boolean DEFAULT false NOT NULL,
        "scanned_at" timestamp,
        "scanned_by" integer,
        "attendance_status" text DEFAULT 'not_attended' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "tickets_qr_code_unique" UNIQUE("qr_code")
      );
    `);
    
    console.log('✅ Tickets table created successfully!');
    
    // Remove QR code fields from bookings table
    console.log('Removing QR code fields from bookings table...');
    
    // Drop constraints first
    try {
      await db.execute(`ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_qr_code_unique";`);
    } catch (error) {
      console.log('Constraint already dropped or does not exist');
    }
    
    // Drop columns
    try {
      await db.execute(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "qr_code";`);
      await db.execute(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "is_scanned";`);
      await db.execute(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "scanned_at";`);
      await db.execute(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "scanned_by";`);
      await db.execute(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "attendance_status";`);
    } catch (error) {
      console.log('Columns already dropped or do not exist');
    }
    
    console.log('✅ QR code fields removed from bookings table!');
    
    // Test the new structure
    console.log('Testing new structure...');
    
    // Test tickets table
    const ticketsResult = await db.execute('SELECT COUNT(*) FROM tickets');
    console.log('Tickets table row count:', ticketsResult.rows?.[0]?.count);
    
    // Test bookings table structure
    const bookingsResult = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      ORDER BY ordinal_position;
    `);
    console.log('Bookings table columns:', bookingsResult.rows?.map(row => row.column_name));
    
    console.log('✅ Database structure updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating database structure:', error);
  } finally {
    process.exit(0);
  }
}

createTicketsTable(); 
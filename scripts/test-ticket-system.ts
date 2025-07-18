import { db } from '../server/db';

async function testTicketSystem() {
  try {
    console.log('Testing new ticket system...');
    
    // Get a booking to test with
    const bookings = await db.execute('SELECT id, event_id, ticket_quantity FROM bookings LIMIT 1');
    if (!bookings.rows || bookings.rows.length === 0) {
      console.log('No bookings found to test with');
      return;
    }
    
    const booking = bookings.rows[0] as any;
    console.log('Testing with booking:', booking);
    
    // Generate multiple tickets for this booking
    const tickets: any[] = [];
    for (let i = 1; i <= booking.ticket_quantity; i++) {
      const qrCode = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`;
      
      const ticket = await db.execute(`
        INSERT INTO tickets (booking_id, event_id, ticket_number, qr_code, is_scanned, attendance_status)
        VALUES (${booking.id}, ${booking.event_id}, ${i}, '${qrCode}', false, 'not_attended')
        RETURNING *
      `);
      
      tickets.push(ticket.rows[0]);
      console.log(`Created ticket ${i}:`, qrCode);
    }
    
    console.log(`✅ Created ${tickets.length} tickets for booking ${booking.id}`);
    
    // Test QR code lookup
    const testQRCode = tickets[0].qr_code;
    const foundTicket = await db.execute(`SELECT * FROM tickets WHERE qr_code = '${testQRCode}'`);
    console.log('Found ticket by QR code:', foundTicket.rows?.[0] ? 'Yes' : 'No');
    
    // Test ticket deletion (simulating scan)
    await db.execute(`DELETE FROM tickets WHERE qr_code = '${testQRCode}'`);
    console.log('✅ Deleted ticket with QR code:', testQRCode);
    
    // Verify deletion
    const deletedTicket = await db.execute(`SELECT * FROM tickets WHERE qr_code = '${testQRCode}'`);
    console.log('Ticket still exists after deletion:', deletedTicket.rows?.[0] ? 'Yes' : 'No');
    
    // Show remaining tickets
    const remainingTickets = await db.execute(`SELECT COUNT(*) FROM tickets WHERE booking_id = ${booking.id}`);
    console.log('Remaining tickets for booking:', remainingTickets.rows?.[0]?.count);
    
    console.log('✅ Ticket system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Ticket system test failed:', error);
  } finally {
    process.exit(0);
  }
}

testTicketSystem(); 
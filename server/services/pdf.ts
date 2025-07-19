import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { Event, Booking, Ticket } from '../../shared/schema';

export interface TicketReceiptData {
  booking: Booking;
  event: Event;
  tickets: Ticket[];
}

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: '#1e40af',
    color: 'white',
    padding: 25,
    textAlign: 'center',
    marginBottom: 25,
    borderRadius: 8,
    border: '2px solid #3b82f6',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.95,
    fontWeight: '500',
  },
  section: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1e293b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
    borderBottom: '1px solid #f1f5f9',
  },
  label: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: 'bold',
    flex: 1,
  },
  value: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  ticketSection: {
    marginTop: 25,
  },
  ticket: {
    border: '2px solid #3b82f6',
    padding: 20,
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#1e40af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  qrCode: {
    textAlign: 'center',
    marginVertical: 15,
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
  },
  qrImage: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  qrText: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    marginTop: 5,
    fontWeight: '500',
  },
  footer: {
    marginTop: 35,
    padding: 20,
    backgroundColor: '#1e293b',
    textAlign: 'center',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 11,
    color: '#cbd5e1',
    marginBottom: 4,
    fontWeight: '500',
  },
  important: {
    backgroundColor: '#fef3c7',
    border: '2px solid #f59e0b',
    padding: 15,
    marginVertical: 15,
    borderRadius: 8,
  },
  importantTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  importantText: {
    fontSize: 11,
    color: '#92400e',
    marginBottom: 3,
    fontWeight: '500',
  },
  divider: {
    borderTop: '2px solid #e2e8f0',
    marginVertical: 15,
  },
  statusBadge: {
    backgroundColor: '#10b981',
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export class PDFService {
  private async generateQRCodeDataURL(text: string): Promise<string> {
    try {
      return await QRCode.toDataURL(text, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      return '';
    }
  }

  async generateTicketReceipt(data: TicketReceiptData): Promise<Buffer> {
    const { booking, event, tickets } = data;
    
    // Generate QR codes for all tickets
    const ticketsWithQR = await Promise.all(
      tickets.map(async (ticket) => ({
        ...ticket,
        qrCodeImage: await this.generateQRCodeDataURL(ticket.qrCode)
      }))
    );

    // Format dates for Nairobi timezone
    const formatNairobiTime = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Nairobi',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);
    };

    const currentDate = formatNairobiTime(new Date());
    const eventDate = formatNairobiTime(new Date(event.date));
    const paymentDate = formatNairobiTime(new Date(booking.paymentDate || new Date()));

    // Create PDF document
    const MyDocument = () => (
      React.createElement(Document, null,
        React.createElement(Page, { size: "A4", style: styles.page },
          // Header
          React.createElement(View, { style: styles.header },
            React.createElement(Text, { style: styles.title }, "🎫 Event Ticket Receipt"),
            React.createElement(Text, { style: styles.subtitle }, `Payment Confirmed • ${currentDate}`)
          ),

          // Event Details
          React.createElement(View, { style: styles.section },
            React.createElement(Text, { style: styles.sectionTitle }, "📅 Event Information"),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, "Event Name:"),
              React.createElement(Text, { style: styles.value }, event.title)
            ),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, "Date & Time:"),
              React.createElement(Text, { style: styles.value }, eventDate)
            ),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, "Venue:"),
              React.createElement(Text, { style: styles.value }, event.venue)
            ),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, "Location:"),
              React.createElement(Text, { style: styles.value }, event.location)
            )
          ),

          // Payment Details
          React.createElement(View, { style: styles.section },
            React.createElement(Text, { style: styles.sectionTitle }, "💰 Payment Details"),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, "Booking Reference:"),
              React.createElement(Text, { style: styles.value }, `#${booking.id}`)
            ),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, "Buyer Name:"),
              React.createElement(Text, { style: styles.value }, booking.buyerName)
            ),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, "Email:"),
              React.createElement(Text, { style: styles.value }, booking.buyerEmail)
            ),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, "Phone:"),
              React.createElement(Text, { style: styles.value }, booking.buyerPhone)
            ),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, "Number of Tickets:"),
              React.createElement(Text, { style: styles.value }, booking.ticketQuantity.toString())
            ),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, "Total Amount:"),
              React.createElement(Text, { style: styles.value }, `KES ${booking.totalPrice.toFixed(2)}`)
            ),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, "Payment Method:"),
              React.createElement(Text, { style: styles.value }, "M-Pesa")
            ),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, "Payment Date:"),
              React.createElement(Text, { style: styles.value }, paymentDate)
            ),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, "Status:"),
              React.createElement(Text, { style: styles.statusBadge }, "PAID")
            )
          ),

          // Important Information
          React.createElement(View, { style: styles.important },
            React.createElement(Text, { style: styles.importantTitle }, "⚠️ Important Information"),
            React.createElement(Text, { style: styles.importantText }, "• Each ticket has a unique QR code that can only be used once"),
            React.createElement(Text, { style: styles.importantText }, "• Please save this receipt and show the appropriate QR code at the entrance"),
            React.createElement(Text, { style: styles.importantText }, "• Keep this receipt as proof of payment"),
            React.createElement(Text, { style: styles.importantText }, "• Arrive at least 30 minutes before the event starts"),
            React.createElement(Text, { style: styles.importantText }, "• This ticket is valid for entry only on the specified date and time")
          ),

          // Tickets
          React.createElement(View, { style: styles.ticketSection },
            React.createElement(Text, { style: styles.sectionTitle }, "🎫 Your Tickets"),
            ...ticketsWithQR.map((ticket, index) =>
              React.createElement(View, { key: index, style: styles.ticket },
                React.createElement(Text, { style: styles.ticketTitle }, `Ticket ${ticket.ticketNumber}`),
                React.createElement(View, { style: styles.qrCode },
                  ticket.qrCodeImage ? React.createElement(Image, { 
                    src: ticket.qrCodeImage, 
                    style: styles.qrImage 
                  }) : null,
                  React.createElement(Text, { style: styles.qrText }, `QR Code: ${ticket.qrCode}`),
                  React.createElement(Text, { style: styles.qrText }, `Scan this code at the entrance`),
                  React.createElement(Text, { style: styles.qrText }, `Valid for: ${event.title}`),
                  React.createElement(Text, { style: styles.qrText }, `Event Date: ${eventDate}`)
                )
              )
            )
          ),

          // Footer
          React.createElement(View, { style: styles.footer },
            React.createElement(Text, { style: styles.footerText }, "EventMasterPro - Your trusted event ticketing platform"),
            React.createElement(Text, { style: styles.footerText }, "Thank you for your purchase! Enjoy the event!"),
            React.createElement(Text, { style: styles.footerText }, "This is an automated receipt. For support, contact admin@eventhub.com"),
            React.createElement(Text, { style: styles.footerText }, "Generated in Nairobi, Kenya • All times are in East Africa Time (EAT)")
          )
        )
      )
    );

    try {
      // Generate PDF as blob and convert to buffer
      const pdfBlob = await pdf(MyDocument()).toBlob();
      const arrayBuffer = await pdfBlob.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      throw new Error('Failed to generate PDF receipt');
    }
  }
}

export const pdfService = new PDFService(); 
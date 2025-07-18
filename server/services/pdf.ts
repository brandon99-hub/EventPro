import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
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
    padding: 30,
  },
  header: {
    backgroundColor: '#667eea',
    color: 'white',
    padding: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.9,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  value: {
    fontSize: 12,
    color: '#333',
  },
  ticketSection: {
    marginTop: 20,
  },
  ticket: {
    border: '1px solid #ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 5,
  },
  ticketTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  qrCode: {
    textAlign: 'center',
    marginVertical: 10,
  },
  qrText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  footer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
    borderTop: '1px solid #ddd',
  },
  footerText: {
    fontSize: 10,
    color: '#666',
    marginBottom: 3,
  },
  important: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    padding: 10,
    marginVertical: 10,
    borderRadius: 3,
  },
  importantTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 5,
  },
  importantText: {
    fontSize: 10,
    color: '#856404',
  },
});

export class PDFService {
  private async generateQRCodeDataURL(text: string): Promise<string> {
    try {
      return await QRCode.toDataURL(text, {
        width: 120,
        margin: 1,
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

    // Create PDF document
    const MyDocument = () => (
      React.createElement(Document, null,
        React.createElement(Page, { size: "A4", style: styles.page },
          // Header
          React.createElement(View, { style: styles.header },
            React.createElement(Text, { style: styles.title }, "🎫 Event Ticket Receipt"),
            React.createElement(Text, { style: styles.subtitle }, `Payment Confirmed • ${new Date().toLocaleDateString()}`)
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
              React.createElement(Text, { style: styles.value }, new Date(event.date).toLocaleString())
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
              React.createElement(Text, { style: styles.value }, `KES ${booking.totalPrice}`)
            ),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, "Payment Method:"),
              React.createElement(Text, { style: styles.value }, "M-Pesa")
            ),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, "Payment Date:"),
              React.createElement(Text, { style: styles.value }, new Date(booking.paymentDate || new Date()).toLocaleString())
            )
          ),

          // Important Information
          React.createElement(View, { style: styles.important },
            React.createElement(Text, { style: styles.importantTitle }, "⚠️ Important Information"),
            React.createElement(Text, { style: styles.importantText }, "• Each ticket has a unique QR code that can only be used once"),
            React.createElement(Text, { style: styles.importantText }, "• Please save this receipt and show the appropriate QR code at the entrance"),
            React.createElement(Text, { style: styles.importantText }, "• Keep this receipt as proof of payment")
          ),

          // Tickets
          React.createElement(View, { style: styles.ticketSection },
            React.createElement(Text, { style: styles.sectionTitle }, "🎫 Your Tickets"),
            ...ticketsWithQR.map((ticket, index) =>
              React.createElement(View, { key: index, style: styles.ticket },
                React.createElement(Text, { style: styles.ticketTitle }, `Ticket ${ticket.ticketNumber}`),
                React.createElement(View, { style: styles.qrCode },
                  React.createElement(Text, { style: styles.qrText }, `QR Code: ${ticket.qrCode}`)
                )
              )
            )
          ),

          // Footer
          React.createElement(View, { style: styles.footer },
            React.createElement(Text, { style: styles.footerText }, "EventMasterPro - Your trusted event ticketing platform"),
            React.createElement(Text, { style: styles.footerText }, "Thank you for your purchase! Enjoy the event!"),
            React.createElement(Text, { style: styles.footerText }, "This is an automated receipt. For support, contact admin@eventhub.com")
          )
        )
      )
    );

    try {
      // Generate PDF buffer
      const pdfBuffer = await pdf(MyDocument()).toBuffer();
      return Buffer.from(await pdfBuffer.arrayBuffer());
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      throw new Error('Failed to generate PDF receipt');
    }
  }
}

export const pdfService = new PDFService(); 
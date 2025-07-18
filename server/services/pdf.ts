import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import { Event, Booking, Ticket } from '../../shared/schema';

export interface TicketReceiptData {
  booking: Booking;
  event: Event;
  tickets: Ticket[];
}

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

    // Launch browser with Render-specific settings
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Event Ticket Receipt</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8f9fa;
          }
          .receipt {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
          }
          .content {
            padding: 30px;
          }
          .event-details {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .event-details h2 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 20px;
          }
          .event-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }
          .event-info div {
            display: flex;
            align-items: center;
          }
          .event-info strong {
            min-width: 120px;
            color: #555;
          }
          .event-info span {
            color: #333;
          }
          .booking-info {
            background: #e8f4fd;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .booking-info h3 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 18px;
          }
          .booking-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          .booking-details div {
            display: flex;
            align-items: center;
          }
          .booking-details strong {
            min-width: 140px;
            color: #555;
          }
          .booking-details span {
            color: #333;
          }
          .tickets-section {
            margin-bottom: 30px;
          }
          .tickets-section h3 {
            margin: 0 0 20px 0;
            color: #333;
            font-size: 18px;
            text-align: center;
          }
          .tickets-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
          }
          .ticket {
            border: 2px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            background: white;
          }
          .ticket h4 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 16px;
          }
          .ticket-qr {
            margin: 15px 0;
          }
          .ticket-qr img {
            border: 2px solid #000;
            padding: 8px;
            background: white;
            border-radius: 4px;
          }
          .ticket-code {
            font-family: monospace;
            font-size: 12px;
            color: #666;
            margin-top: 10px;
            word-break: break-all;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #ddd;
          }
          .footer p {
            margin: 5px 0;
            color: #666;
            font-size: 14px;
          }
          .important-note {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
          }
          .important-note h4 {
            margin: 0 0 10px 0;
            color: #856404;
            font-size: 16px;
          }
          .important-note p {
            margin: 0;
            color: #856404;
            font-size: 14px;
          }
          @media print {
            body { background: white; }
            .receipt { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>🎫 Event Ticket Receipt</h1>
            <p>Payment Confirmed • ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="content">
            <div class="event-details">
              <h2>📅 Event Information</h2>
              <div class="event-info">
                <div><strong>Event Name:</strong> <span>${event.title}</span></div>
                <div><strong>Date & Time:</strong> <span>${new Date(event.date).toLocaleString()}</span></div>
                <div><strong>Venue:</strong> <span>${event.venue}</span></div>
                <div><strong>Location:</strong> <span>${event.location}</span></div>
                                 <div><strong>Category ID:</strong> <span>${event.categoryId}</span></div>
                 <div><strong>Created By:</strong> <span>${event.createdBy}</span></div>
              </div>
              <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">
                ${event.description}
              </p>
            </div>

            <div class="booking-info">
              <h3>💰 Payment Details</h3>
              <div class="booking-details">
                <div><strong>Booking Reference:</strong> <span>#${booking.id}</span></div>
                <div><strong>Buyer Name:</strong> <span>${booking.buyerName}</span></div>
                <div><strong>Email:</strong> <span>${booking.buyerEmail}</span></div>
                <div><strong>Phone:</strong> <span>${booking.buyerPhone}</span></div>
                <div><strong>Number of Tickets:</strong> <span>${booking.ticketQuantity}</span></div>
                <div><strong>Total Amount:</strong> <span>KES ${booking.totalPrice}</span></div>
                <div><strong>Payment Method:</strong> <span>M-Pesa</span></div>
                <div><strong>Payment Date:</strong> <span>${new Date(booking.paymentDate || new Date()).toLocaleString()}</span></div>
              </div>
            </div>

            <div class="important-note">
              <h4>⚠️ Important Information</h4>
              <p>• Each ticket has a unique QR code that can only be used once</p>
              <p>• Please save this receipt and show the appropriate QR code at the entrance</p>
              <p>• Keep this receipt as proof of payment</p>
            </div>

            <div class="tickets-section">
              <h3>🎫 Your Tickets</h3>
              <div class="tickets-grid">
                ${ticketsWithQR.map(ticket => `
                  <div class="ticket">
                    <h4>Ticket ${ticket.ticketNumber}</h4>
                    <div class="ticket-qr">
                      <img src="${ticket.qrCodeImage}" alt="QR Code for Ticket ${ticket.ticketNumber}" />
                    </div>
                    <div class="ticket-code">
                      <strong>QR Code:</strong><br>
                      ${ticket.qrCode}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="footer">
            <p><strong>EventMasterPro</strong> - Your trusted event ticketing platform</p>
            <p>Thank you for your purchase! Enjoy the event!</p>
            <p style="font-size: 12px; margin-top: 10px;">
              This is an automated receipt. For support, contact admin@eventhub.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      // Browser is already launched above with Render-specific settings
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });
      
      await browser.close();
      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      throw new Error('Failed to generate PDF receipt');
    }
  }
}

export const pdfService = new PDFService(); 
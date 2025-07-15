import { storage } from "../storage";
import nodemailer from "nodemailer";

export interface CommissionCalculation {
  totalAmount: number;
  platformFee: number;
  commissionAmount: number;
  organizerAmount: number;
  platformFeePercentage: number;
}

export interface CommissionSettings {
  platformFeePercentage: number;
  minimumFee: number;
  maximumFee: number;
  isActive: boolean;
}

export class CommissionService {
  // Email service
  private async sendEmail(to: string, subject: string, html: string) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      console.warn("Email credentials not configured, skipping email send");
      return;
    }

    try {
      const transporter = nodemailer.createTransporter({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
      });

      const mailOptions = {
        from: `EventMasterPro <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to}`);
    } catch (error) {
      console.error("Failed to send email:", error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  // Get current commission settings
  async getCommissionSettings(): Promise<CommissionSettings> {
    // For now, return default settings
    // In a real app, you'd fetch this from the database
    return {
      platformFeePercentage: 0.10, // 10%
      minimumFee: 0,
      maximumFee: 1000,
      isActive: true
    };
  }

  // Calculate commission for a booking
  async calculateCommission(totalAmount: number): Promise<CommissionCalculation> {
    const settings = await this.getCommissionSettings();
    
    if (!settings.isActive) {
      return {
        totalAmount,
        platformFee: 0,
        commissionAmount: 0,
        organizerAmount: totalAmount,
        platformFeePercentage: 0
      };
    }

    // Calculate platform fee
    let platformFee = totalAmount * settings.platformFeePercentage;
    
    // Apply minimum and maximum limits
    if (platformFee < settings.minimumFee) {
      platformFee = settings.minimumFee;
    } else if (platformFee > settings.maximumFee) {
      platformFee = settings.maximumFee;
    }

    // Calculate amounts
    const commissionAmount = platformFee;
    const organizerAmount = totalAmount - commissionAmount;

    return {
      totalAmount,
      platformFee,
      commissionAmount,
      organizerAmount,
      platformFeePercentage: settings.platformFeePercentage
    };
  }

  // Update booking with commission details
  async updateBookingWithCommission(bookingId: number, commission: CommissionCalculation): Promise<void> {
    await storage.updateBooking(bookingId, {
      commissionAmount: commission.commissionAmount,
      organizerAmount: commission.organizerAmount,
      platformFee: commission.platformFeePercentage
    });
  }

  // Process payment completion and update booking
  async processPaymentCompletion(
    bookingId: number, 
    paymentMethod: string, 
    paymentReference: string,
    transactionId?: string,
    phoneNumber?: string
  ): Promise<void> {
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const event = await storage.getEvent(booking.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Calculate commission
    const commission = await this.calculateCommission(booking.totalPrice);

    // Update booking with payment and commission details
    await storage.updateBooking(bookingId, {
      paymentStatus: 'completed',
      paymentMethod,
      paymentReference,
      paymentDate: new Date(),
      mpesaPhone: phoneNumber,
      commissionAmount: commission.commissionAmount,
      organizerAmount: commission.organizerAmount,
      platformFee: commission.platformFeePercentage
    });

    // Send confirmation email to buyer
    await this.sendEmail(
      booking.buyerEmail,
      `Payment Confirmed - ${event.title}`,
      `
        <h2>Payment Confirmed!</h2>
        <p>Dear ${booking.buyerName},</p>
        <p>Your payment of KES ${booking.totalPrice} has been successfully processed.</p>
        <h3>Booking Details:</h3>
        <ul>
          <li><strong>Event:</strong> ${event.title}</li>
          <li><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</li>
          <li><strong>Venue:</strong> ${event.venue}, ${event.location}</li>
          <li><strong>Tickets:</strong> ${booking.ticketQuantity}</li>
          <li><strong>Total Paid:</strong> KES ${booking.totalPrice}</li>
          <li><strong>Transaction ID:</strong> ${transactionId || paymentReference}</li>
          <li><strong>Booking Reference:</strong> ${booking.id}</li>
        </ul>
        <p>Please keep this email as your proof of payment. Show it at the entrance for verification.</p>
        <p>Enjoy the event!</p>
        <hr />
        <small>This is an automated email from EventMasterPro.</small>
      `
    );

    // Send notification to organizer (if we have organizer email)
    // For now, we'll send to admin email as placeholder
    if (process.env.GMAIL_USER) {
      await this.sendEmail(
        process.env.GMAIL_USER,
        `New Booking Payment - ${event.title}`,
        `
          <h2>New Booking Payment Received</h2>
          <p>A new payment has been processed for ${event.title}.</p>
          <h3>Booking Details:</h3>
          <ul>
            <li><strong>Buyer:</strong> ${booking.buyerName}</li>
            <li><strong>Email:</strong> ${booking.buyerEmail}</li>
            <li><strong>Phone:</strong> ${booking.buyerPhone}</li>
            <li><strong>Tickets:</strong> ${booking.ticketQuantity}</li>
            <li><strong>Total Revenue:</strong> KES ${booking.totalPrice}</li>
            <li><strong>Platform Fee:</strong> KES ${commission.commissionAmount}</li>
            <li><strong>Organizer Amount:</strong> KES ${commission.organizerAmount}</li>
            <li><strong>Transaction ID:</strong> ${transactionId || paymentReference}</li>
            <li><strong>Booking Reference:</strong> ${booking.id}</li>
          </ul>
          <hr />
          <small>This is an automated email from EventMasterPro.</small>
        `
      );
    }

    console.log(`Payment completion processed for booking ${bookingId}`);
  }

  // Get commission summary for admin dashboard
  async getCommissionSummary(): Promise<{
    totalRevenue: number;
    totalCommission: number;
    totalOrganizerAmount: number;
    completedPayments: number;
    pendingPayments: number;
    failedPayments: number;
    averageCommission: number;
  }> {
    const bookings = await storage.getBookings();
    
    const completedBookings = bookings.filter(b => b.paymentStatus === 'completed');
    const pendingBookings = bookings.filter(b => b.paymentStatus === 'pending');
    const failedBookings = bookings.filter(b => b.paymentStatus === 'failed');

    const totalRevenue = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const totalCommission = completedBookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0);
    const totalOrganizerAmount = completedBookings.reduce((sum, b) => sum + (b.organizerAmount || 0), 0);
    const averageCommission = completedBookings.length > 0 ? totalCommission / completedBookings.length : 0;

    return {
      totalRevenue,
      totalCommission,
      totalOrganizerAmount,
      completedPayments: completedBookings.length,
      pendingPayments: pendingBookings.length,
      failedPayments: failedBookings.length,
      averageCommission
    };
  }

  // Get detailed commission breakdown
  async getCommissionBreakdown(): Promise<{
    recentBookings: any[];
    topEvents: any[];
    monthlyRevenue: any[];
  }> {
    const bookings = await storage.getBookings();
    const events = await storage.getEvents();
    
    const completedBookings = bookings.filter(b => b.paymentStatus === 'completed');
    
    // Recent bookings (last 10)
    const recentBookings = completedBookings
      .sort((a, b) => new Date(b.paymentDate || b.bookingDate).getTime() - new Date(a.paymentDate || a.bookingDate).getTime())
      .slice(0, 10)
      .map(booking => {
        const event = events.find(e => e.id === booking.eventId);
        return {
          ...booking,
          eventTitle: event?.title || 'Unknown Event'
        };
      });

    // Top events by revenue
    const eventRevenue = completedBookings.reduce((acc, booking) => {
      const eventId = booking.eventId;
      if (!acc[eventId]) {
        acc[eventId] = { revenue: 0, bookings: 0 };
      }
      acc[eventId].revenue += booking.totalPrice;
      acc[eventId].bookings += 1;
      return acc;
    }, {} as Record<number, { revenue: number; bookings: number }>);

    const topEvents = Object.entries(eventRevenue)
      .map(([eventId, data]) => {
        const event = events.find(e => e.id === parseInt(eventId));
        return {
          eventId: parseInt(eventId),
          eventTitle: event?.title || 'Unknown Event',
          revenue: data.revenue,
          bookings: data.bookings
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Monthly revenue (last 6 months)
    const monthlyRevenue = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthBookings = completedBookings.filter(booking => {
        const bookingDate = new Date(booking.paymentDate || booking.bookingDate);
        return bookingDate >= month && bookingDate <= monthEnd;
      });
      
      const monthRevenue = monthBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
      
      monthlyRevenue.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
        bookings: monthBookings.length
      });
    }

    return {
      recentBookings,
      topEvents,
      monthlyRevenue
    };
  }
}

export const commissionService = new CommissionService(); 
import express, { Express } from "express";
import { createServer, Server } from "http";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { z } from "zod";
import { storage } from "./storage";
import { insertUserSchema, insertEventSchema, insertBookingSchema, insertCategorySchema } from "@shared/schema";
import { mpesaService } from "./services/mpesa";
import { commissionService } from "./services/commission";
import { mpesaPayoutService } from "./mpesa-payout";
import pgSimple from "connect-pg-simple";

// Create PostgreSQL session store
const PostgresStore = pgSimple(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: new PostgresStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      },
      tableName: 'sessions',
      createTableIfMissing: true,
    }),
    cookie: { 
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      path: '/'
    },
    name: 'eventhub.sid' // Custom session name
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Passport configuration
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Invalid username or password" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return done(null, false, { message: "Invalid username or password" });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication middleware
  app.use(async (req: any, res, next) => {
    req.isAuthenticated = () => req.session.passport?.user !== undefined;
    
    // Fetch full user object if authenticated
    if (req.isAuthenticated()) {
      try {
        const userId = req.session.passport.user;
        const user = await storage.getUserById(userId);
        req.user = user;
      } catch (error) {
        req.user = null;
      }
    } else {
      req.user = null;
    }
    
    next();
  });

  // Email service
  const sendEmail = async (to: string, subject: string, html: string) => {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      console.warn("Email credentials not configured, skipping email send");
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
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
  };

  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });

      // Auto-login after registration
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Registration successful but login failed" });
        }
        res.status(201).json(user);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid registration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Ensure session is saved
    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ message: "Session save failed" });
      }
      res.json(req.user);
    });
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // User bookings route
  app.get("/api/user/bookings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const bookings = await storage.getBookingsByUserId(req.user.id);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user bookings" });
    }
  });

  // Categories routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Events routes
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/upcoming", async (req, res) => {
    try {
      const events = await storage.getUpcomingEvents(8); // Limit to 8 upcoming events
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming events" });
    }
  });

  app.get("/api/events/featured", async (req, res) => {
    try {
      const events = await storage.getEvents();
      const featuredEvents = events.filter(event => event.isFeatured).slice(0, 3); // Limit to 3 featured events
      res.json(featuredEvents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured events" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post("/api/events", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    try {
      const validatedData = insertEventSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });
      const event = await storage.createEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.put("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    try {
      const eventId = parseInt(req.params.id);
      const validatedData = insertEventSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });
      
      const event = await storage.updateEvent(eventId, validatedData);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    try {
      const eventId = parseInt(req.params.id);
      await storage.deleteEvent(eventId);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });



  // Payment routes
  app.post("/api/payments/mpesa/initiate", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { phoneNumber, amount, reference, description } = req.body;

      // Validate input
      if (!phoneNumber || !amount || !reference || !description) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Initiate STK Push
      const result = await mpesaService.initiateSTKPush({
        phoneNumber,
        amount,
        reference,
        description
      });

      if (result.success) {
        res.json({
          success: true,
          checkoutRequestID: result.checkoutRequestID,
          merchantRequestID: result.merchantRequestID,
          customerMessage: result.customerMessage
        });
      } else {
        res.status(400).json({
          success: false,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage
        });
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      res.status(500).json({ message: "Failed to initiate payment" });
    }
  });

  app.get("/api/payments/status/:checkoutRequestID", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { checkoutRequestID } = req.params;
      const result = await mpesaService.checkPaymentStatus(checkoutRequestID);
      
      res.json(result);
    } catch (error) {
      console.error('Payment status check failed:', error);
      res.status(500).json({ message: "Failed to check payment status" });
    }
  });

  // M-Pesa payout callback route
  app.post("/api/mpesa/payout-callback", async (req, res) => {
    try {
      await mpesaPayoutService.processPayoutCallback(req.body);
      res.json({ ResultCode: 0, ResultDesc: "Success" });
    } catch (error) {
      console.error('Payout callback processing failed:', error);
      res.status(500).json({ ResultCode: 1, ResultDesc: "Failed" });
    }
  });

  app.post("/api/payments/mpesa/callback", async (req, res) => {
    try {
      const result = mpesaService.processWebhook(req.body);
      
      if (result.success) {
        // Payment successful - update booking status
        console.log('Payment successful:', {
          checkoutRequestID: result.checkoutRequestID,
          transactionId: result.transactionId,
          amount: result.amount,
          phoneNumber: result.phoneNumber
        });
        
        // Extract booking ID from reference (format: BOOKING-{id})
        const reference = req.body.Body?.stkCallback?.CallbackMetadata?.Item?.find((i: any) => i.Name === 'AccountReference')?.Value;
        if (reference && reference.startsWith('BOOKING-')) {
          const bookingId = parseInt(reference.replace('BOOKING-', ''));
          
          try {
            await commissionService.processPaymentCompletion(
              bookingId,
              'mpesa',
              result.transactionId || result.checkoutRequestID || '',
              result.transactionId,
              result.phoneNumber
            );

            // Automatic payout to organizer
            try {
              const booking = await storage.getBooking(bookingId);
              const event = booking ? await storage.getEvent(booking.eventId) : null;
              
              if (booking && event && booking.organizerAmount && booking.organizerAmount > 0) {
                const payoutResult = await mpesaPayoutService.payoutToOrganizer(
                  event.createdBy,
                  booking.organizerAmount,
                  bookingId
                );
                
                if (payoutResult.success) {
                  console.log(`✅ Automatic payout successful for booking ${bookingId}: ${payoutResult.transactionId}`);
                  
                  // Send payout notification to organizer
                  const organizer = await storage.getUser(event.createdBy);
                  if (organizer) {
                    await sendEmail(
                      organizer.email,
                      `Payout Completed - ${event.title}`,
                      `
                        <h2>Payout Completed!</h2>
                        <p>Dear ${organizer.fullName},</p>
                        <p>Your payout for ${event.title} has been processed successfully.</p>
                        <h3>Payout Details:</h3>
                        <ul>
                          <li><strong>Event:</strong> ${event.title}</li>
                          <li><strong>Amount:</strong> KES ${booking.organizerAmount}</li>
                          <li><strong>Commission:</strong> KES ${booking.commissionAmount}</li>
                          <li><strong>Transaction ID:</strong> ${payoutResult.transactionId}</li>
                          <li><strong>Booking Reference:</strong> ${booking.id}</li>
                        </ul>
                        <p>The amount has been sent to your M-Pesa number: ${organizer.mpesaPhone}</p>
                        <hr />
                        <small>This is an automated email from EventMasterPro.</small>
                      `
                    );
                  }
                } else {
                  console.error(`❌ Automatic payout failed for booking ${bookingId}: ${payoutResult.error}`);
                  
                  // Send payout failure notification to admin
                  await sendEmail(
                    'admin@eventhub.com',
                    `Payout Failed - Booking ${bookingId}`,
                    `
                      <h2>Payout Failed</h2>
                      <p>Automatic payout failed for booking ${bookingId}.</p>
                      <ul>
                        <li><strong>Event:</strong> ${event?.title}</li>
                        <li><strong>Amount:</strong> KES ${booking.organizerAmount}</li>
                        <li><strong>Error:</strong> ${payoutResult.error}</li>
                      </ul>
                      <p>Please process this payout manually.</p>
                    `
                  );
                }
              }
            } catch (payoutError) {
              console.error(`Failed to process automatic payout for booking ${bookingId}:`, payoutError);
            }
            
            // Send payment confirmation email
            const booking = await storage.getBooking(bookingId);
            const event = booking ? await storage.getEvent(booking.eventId) : null;
            
            if (booking && event) {
              await sendEmail(
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
                    <li><strong>Transaction ID:</strong> ${result.transactionId}</li>
                    <li><strong>Booking Reference:</strong> ${booking.id}</li>
                  </ul>
                  <p>Please keep this email as your proof of payment. Show it at the entrance for verification.</p>
                  <p>Enjoy the event!</p>
                  <hr />
                  <small>This is an automated email from EventMasterPro.</small>
                `
              );
            }
            
            console.log(`Booking ${bookingId} payment completed successfully`);
          } catch (error) {
            console.error(`Failed to update booking ${bookingId}:`, error);
          }
        }
      } else {
        // Payment failed - update booking status
        console.log('Payment failed:', {
          checkoutRequestID: result.checkoutRequestID,
          resultCode: result.resultCode,
          resultDesc: result.resultDesc
        });
        
        // Extract booking ID and update status to failed
        const reference = req.body.Body?.stkCallback?.CallbackMetadata?.Item?.find((i: any) => i.Name === 'AccountReference')?.Value;
        if (reference && reference.startsWith('BOOKING-')) {
          const bookingId = parseInt(reference.replace('BOOKING-', ''));
          
          try {
            await storage.updateBooking(bookingId, {
              paymentStatus: 'failed',
              paymentDate: new Date()
            });
            
            // Send payment failure notification
            const booking = await storage.getBooking(bookingId);
            const event = booking ? await storage.getEvent(booking.eventId) : null;
            
            if (booking && event) {
              await sendEmail(
                booking.buyerEmail,
                `Payment Failed - ${event.title}`,
                `
                  <h2>Payment Failed</h2>
                  <p>Dear ${booking.buyerName},</p>
                  <p>Unfortunately, your payment for ${event.title} could not be processed.</p>
                  <p><strong>Reason:</strong> ${result.resultDesc || 'Payment was not completed'}</p>
                  <p>Please try booking again or contact support if you continue to experience issues.</p>
                  <p>Booking Reference: ${booking.id}</p>
                  <hr />
                  <small>This is an automated email from EventMasterPro.</small>
                `
              );
            }
            
            console.log(`Booking ${bookingId} payment marked as failed`);
          } catch (error) {
            console.error(`Failed to update booking ${bookingId} status:`, error);
          }
        }
      }
      
      // Always respond with success to M-Pesa
      res.json({ ResultCode: 0, ResultDesc: "Success" });
    } catch (error) {
      console.error('Webhook processing failed:', error);
      res.status(500).json({ ResultCode: 1, ResultDesc: "Failed" });
    }
  });

  // Commission routes
  app.get("/api/admin/commission-summary", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    try {
      const summary = await commissionService.getCommissionSummary();
      res.json(summary);
    } catch (error) {
      console.error('Failed to get commission summary:', error);
      res.status(500).json({ message: "Failed to fetch commission summary" });
    }
  });

  app.get("/api/admin/commission-breakdown", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const breakdown = await commissionService.getCommissionBreakdown();
      res.json(breakdown);
    } catch (error) {
      console.error('Failed to get commission breakdown:', error);
      res.status(500).json({ message: "Failed to fetch commission breakdown" });
    }
  });

  // Bookings routes
  app.get("/api/bookings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    try {
      const bookings = await storage.getBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse({
        ...req.body,
        bookingDate: new Date()
      });

      // Check event exists and enough tickets are available
      const event = await storage.getEvent(validatedData.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (event.availableSeats < validatedData.ticketQuantity) {
        return res.status(400).json({ message: "Not enough tickets available" });
      }

      // Create booking
      const booking = await storage.createBooking(validatedData);

      // Send booking confirmation email (payment pending)
      await sendEmail(
        booking.buyerEmail,
        `Booking Confirmed - ${event.title}`,
        `
          <h2>Booking Confirmed!</h2>
          <p>Dear ${booking.buyerName},</p>
          <p>Your booking for ${event.title} has been created successfully.</p>
          <h3>Booking Details:</h3>
            <ul>
              <li><strong>Event:</strong> ${event.title}</li>
              <li><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</li>
              <li><strong>Venue:</strong> ${event.venue}, ${event.location}</li>
            <li><strong>Tickets:</strong> ${booking.ticketQuantity}</li>
            <li><strong>Total Amount:</strong> KES ${booking.totalPrice}</li>
              <li><strong>Booking Reference:</strong> ${booking.id}</li>
            <li><strong>Payment Status:</strong> Pending</li>
            </ul>
          <p>Please complete your payment to secure your tickets. You will receive a payment confirmation email once the payment is processed.</p>
          <p>Booking Reference: ${booking.id}</p>
            <hr />
          <small>This is an automated email from EventMasterPro.</small>
        `
      );

      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

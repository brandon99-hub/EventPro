import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  
  // Payout information for organizers
  mpesaPhone: text("mpesa_phone"), // M-Pesa number for payouts
  bankAccount: text("bank_account"), // Bank account for card payouts
  payoutMethod: text("payout_method").default("mpesa"), // "mpesa" | "bank"
  isVerified: boolean("is_verified").default(false).notNull(), // Payout details verified
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  color: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  date: timestamp("date").notNull(),
  endDate: timestamp("end_date"),
  location: text("location").notNull(),
  venue: text("venue").notNull(),
  price: doublePrecision("price").notNull(),
  maxPrice: doublePrecision("max_price"),
  totalSeats: integer("total_seats").notNull(),
  availableSeats: integer("available_seats").notNull(),
  categoryId: integer("category_id").notNull(),
  createdBy: integer("created_by").notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
});

export const insertEventSchema = createInsertSchema(events).pick({
  title: true,
  description: true,
  imageUrl: true,
  date: true,
  endDate: true,
  location: true,
  venue: true,
  price: true,
  maxPrice: true,
  totalSeats: true,
  availableSeats: true,
  categoryId: true,
  createdBy: true,
  isFeatured: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export const seats = pgTable("seats", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  row: text("row").notNull(),
  number: integer("number").notNull(),
  price: doublePrecision("price").notNull(),
  isBooked: boolean("is_booked").default(false).notNull(),
});

export const insertSeatSchema = createInsertSchema(seats).pick({
  eventId: true,
  row: true,
  number: true,
  price: true,
  isBooked: true,
});

export type InsertSeat = z.infer<typeof insertSeatSchema>;
export type Seat = typeof seats.$inferSelect;

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  buyerPhone: text("buyer_phone").notNull(), // Added for M-Pesa
  ticketQuantity: integer("ticket_quantity").notNull(),
  totalPrice: doublePrecision("total_price").notNull(),
  bookingDate: timestamp("booking_date").notNull(),
  
  // Payment fields
  paymentStatus: text("payment_status").default("pending").notNull(), // pending, processing, completed, failed
  paymentMethod: text("payment_method"), // "mpesa" | "card"
  paymentReference: text("payment_reference"), // M-Pesa transaction ID or card payment reference
  mpesaPhone: text("mpesa_phone"), // Phone number used for M-Pesa payment
  paymentDate: timestamp("payment_date"),
  
  // Commission tracking
  commissionAmount: doublePrecision("commission_amount").default(0),
  organizerAmount: doublePrecision("organizer_amount").default(0),
  platformFee: doublePrecision("platform_fee").default(0), // percentage taken
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
  eventId: true,
  buyerName: true,
  buyerEmail: true,
  buyerPhone: true,
  ticketQuantity: true,
  totalPrice: true,
  bookingDate: true,
  paymentStatus: true,
  paymentMethod: true,
  paymentReference: true,
  mpesaPhone: true,
  paymentDate: true,
  commissionAmount: true,
  organizerAmount: true,
  platformFee: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Commission settings table
export const commissionSettings = pgTable("commission_settings", {
  id: serial("id").primaryKey(),
  platformFeePercentage: doublePrecision("platform_fee_percentage").notNull().default(0.10), // 10% default
  minimumFee: doublePrecision("minimum_fee").notNull().default(0),
  maximumFee: doublePrecision("maximum_fee").notNull().default(1000),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCommissionSettingsSchema = createInsertSchema(commissionSettings).pick({
  platformFeePercentage: true,
  minimumFee: true,
  maximumFee: true,
  isActive: true,
});

export type InsertCommissionSettings = z.infer<typeof insertCommissionSettingsSchema>;
export type CommissionSettings = typeof commissionSettings.$inferSelect;

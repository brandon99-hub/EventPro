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
  userId: integer("user_id").notNull(),
  eventId: integer("event_id").notNull(),
  seatIds: text("seat_ids").notNull(), // Comma-separated list of seat IDs
  totalPrice: doublePrecision("total_price").notNull(),
  bookingDate: timestamp("booking_date").notNull(),
  paymentStatus: text("payment_status").notNull(), // 'pending', 'completed', 'failed'
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
  userId: true,
  eventId: true,
  seatIds: true,
  totalPrice: true,
  bookingDate: true,
  paymentStatus: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

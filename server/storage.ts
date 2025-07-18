import { db } from './db';
import { users, type User, type InsertUser } from "@shared/schema";
import { events, type Event, type InsertEvent } from "@shared/schema";
import { categories, type Category, type InsertCategory } from "@shared/schema";
import { bookings, type Booking, type InsertBooking } from "@shared/schema";
import { tickets, type Ticket, type InsertTicket } from "@shared/schema";
import { eq } from 'drizzle-orm';

export interface IStorage {
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  getEventsByCategory(categoryId: number): Promise<Event[]>;
  getUpcomingEvents(limit?: number): Promise<Event[]>;
  getFeaturedEvent(): Promise<Event | undefined>;
  getFeaturedEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;

  getBookings(): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByUserId(userId: number): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<Booking>): Promise<Booking | undefined>;
  
  // Ticket operations
  getTickets(): Promise<Ticket[]>;
  getTicket(id: number): Promise<Ticket | undefined>;
  getTicketByQRCode(qrCode: string): Promise<Ticket | undefined>;
  getTicketsByBookingId(bookingId: number): Promise<Ticket[]>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, ticket: Partial<Ticket>): Promise<Ticket | undefined>;
  deleteTicket(id: number): Promise<boolean>;
  deleteTicketByQRCode(qrCode: string): Promise<boolean>;
}

export const storage: IStorage = {
  async getUserById(id) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  },
  async getUserByUsername(username) {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  },
  async getUserByEmail(email) {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  },
  async createUser(user) {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  },
  async getCategories() {
    return db.select().from(categories);
  },
  async getCategory(id) {
    const result = await db.select().from(categories).where(eq(categories.id, id));
    return result[0];
  },
  async createCategory(category) {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  },
  async getEvents() {
    return db.select().from(events);
  },
  async getEvent(id) {
    const result = await db.select().from(events).where(eq(events.id, id));
    return result[0];
  },
  async getEventsByCategory(categoryId) {
    return db.select().from(events).where(eq(events.categoryId, categoryId));
  },
  async getUpcomingEvents(limit) {
    const now = new Date();
    const all = await db.select().from(events);
    const upcoming = all.filter(event => new Date(event.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return limit ? upcoming.slice(0, limit) : upcoming;
  },
  async getFeaturedEvent() {
    const result = await db.select().from(events).where(eq(events.isFeatured, true));
    return result[0];
  },
  async getFeaturedEvents() {
    return db.select().from(events).where(eq(events.isFeatured, true));
  },
  async createEvent(event) {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  },
  async updateEvent(id, eventUpdate) {
    try {
      // Convert date and endDate to Date objects if they are strings
      if (eventUpdate.date && typeof eventUpdate.date === 'string') {
        eventUpdate.date = new Date(eventUpdate.date);
      }
      if (eventUpdate.endDate && typeof eventUpdate.endDate === 'string') {
        eventUpdate.endDate = new Date(eventUpdate.endDate);
      }
      console.log('Updating event:', id, eventUpdate);
      const [updated] = await db.update(events).set(eventUpdate).where(eq(events.id, id)).returning();
      return updated;
    } catch (error) {
      console.error('DB update error:', error);
      throw error;
    }
  },
  async deleteEvent(id) {
    const result = await db.delete(events).where(eq(events.id, id)).returning();
    return result.length > 0;
  },

  async getBookings() {
    return db.select().from(bookings);
  },
  async getBooking(id) {
    const result = await db.select().from(bookings).where(eq(bookings.id, id));
    return result[0];
  },

  async getBookingsByUserId(userId) {
    // Note: This assumes bookings have a userId field or we can filter by buyer email
    // For now, we'll return all bookings since the current schema doesn't have userId
    return db.select().from(bookings);
  },
  async createBooking(booking) {
    // Decrement availableSeats in the event
    const event = await storage.getEvent(booking.eventId);
    if (!event) throw new Error('Event not found');
    if (event.availableSeats < booking.ticketQuantity) throw new Error('Not enough tickets available');
    await db.update(events)
      .set({ availableSeats: event.availableSeats - booking.ticketQuantity })
      .where(eq(events.id, booking.eventId));
    const [created] = await db.insert(bookings).values(booking).returning();
    return created;
  },
  async updateBooking(id, bookingUpdate) {
    try {
      const [updated] = await db.update(bookings).set(bookingUpdate).where(eq(bookings.id, id)).returning();
      return updated;
    } catch (error) {
      console.error('DB update error:', error);
      throw error;
    }
  },

  // Ticket operations
  async getTickets() {
    return db.select().from(tickets);
  },
  async getTicket(id) {
    const result = await db.select().from(tickets).where(eq(tickets.id, id));
    return result[0];
  },
  async getTicketByQRCode(qrCode) {
    const result = await db.select().from(tickets).where(eq(tickets.qrCode, qrCode));
    return result[0];
  },
  async getTicketsByBookingId(bookingId) {
    return db.select().from(tickets).where(eq(tickets.bookingId, bookingId));
  },
  async createTicket(ticket) {
    const [created] = await db.insert(tickets).values(ticket).returning();
    return created;
  },
  async updateTicket(id, ticketUpdate) {
    try {
      const [updated] = await db.update(tickets).set(ticketUpdate).where(eq(tickets.id, id)).returning();
      return updated;
    } catch (error) {
      console.error('DB update error:', error);
      throw error;
    }
  },
  async deleteTicket(id) {
    const result = await db.delete(tickets).where(eq(tickets.id, id)).returning();
    return result.length > 0;
  },
  async deleteTicketByQRCode(qrCode) {
    const result = await db.delete(tickets).where(eq(tickets.qrCode, qrCode)).returning();
    return result.length > 0;
  },
};

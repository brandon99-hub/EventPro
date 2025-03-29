import { users, type User, type InsertUser } from "@shared/schema";
import { events, type Event, type InsertEvent } from "@shared/schema";
import { categories, type Category, type InsertCategory } from "@shared/schema";
import { seats, type Seat, type InsertSeat } from "@shared/schema";
import { bookings, type Booking, type InsertBooking } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Event operations
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  getEventsByCategory(categoryId: number): Promise<Event[]>;
  getUpcomingEvents(limit?: number): Promise<Event[]>;
  getFeaturedEvent(): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  
  // Seat operations
  getSeats(eventId: number): Promise<Seat[]>;
  getSeatsByIds(seatIds: number[]): Promise<Seat[]>;
  createSeat(seat: InsertSeat): Promise<Seat>;
  updateSeat(id: number, seat: Partial<Seat>): Promise<Seat | undefined>;
  
  // Booking operations
  getBookings(): Promise<Booking[]>;
  getUserBookings(userId: number): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;

  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private events: Map<number, Event>;
  private seats: Map<number, Seat>;
  private bookings: Map<number, Booking>;
  
  sessionStore: session.SessionStore;
  
  private userCurrentId: number = 1;
  private categoryCurrentId: number = 1;
  private eventCurrentId: number = 1;
  private seatCurrentId: number = 1;
  private bookingCurrentId: number = 1;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.events = new Map();
    this.seats = new Map();
    this.bookings = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });

    // Initialize with default admin user
    this.createUser({
      username: "admin",
      password: "adminpassword", // Will be hashed in auth.ts
      email: "admin@eventhub.com",
      fullName: "Admin User",
      isAdmin: true
    });

    // Initialize with sample categories
    this.initializeCategories();
  }

  private initializeCategories() {
    const sampleCategories: InsertCategory[] = [
      { name: "Concert", color: "#6366F1" },
      { name: "Sports", color: "#8B5CF6" },
      { name: "Theater", color: "#22C55E" },
      { name: "Comedy", color: "#EC4899" },
      { name: "Festival", color: "#F59E0B" },
      { name: "Family", color: "#3B82F6" }
    ];

    sampleCategories.forEach(cat => this.createCategory(cat));
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id, isAdmin: insertUser.isAdmin || false };
    this.users.set(id, user);
    return user;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.categoryCurrentId++;
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }

  // Event operations
  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getEventsByCategory(categoryId: number): Promise<Event[]> {
    return Array.from(this.events.values()).filter(
      (event) => event.categoryId === categoryId
    );
  }

  async getUpcomingEvents(limit?: number): Promise<Event[]> {
    const now = new Date();
    const upcomingEvents = Array.from(this.events.values())
      .filter(event => new Date(event.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (limit) {
      return upcomingEvents.slice(0, limit);
    }
    return upcomingEvents;
  }

  async getFeaturedEvent(): Promise<Event | undefined> {
    return Array.from(this.events.values()).find(event => event.isFeatured);
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = this.eventCurrentId++;
    const event: Event = { ...insertEvent, id };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: number, eventUpdate: Partial<Event>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;

    const updatedEvent = { ...event, ...eventUpdate };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }

  // Seat operations
  async getSeats(eventId: number): Promise<Seat[]> {
    return Array.from(this.seats.values()).filter(
      (seat) => seat.eventId === eventId
    );
  }

  async getSeatsByIds(seatIds: number[]): Promise<Seat[]> {
    return Array.from(this.seats.values()).filter(
      (seat) => seatIds.includes(seat.id)
    );
  }

  async createSeat(insertSeat: InsertSeat): Promise<Seat> {
    const id = this.seatCurrentId++;
    const seat: Seat = { ...insertSeat, id };
    this.seats.set(id, seat);
    return seat;
  }

  async updateSeat(id: number, seatUpdate: Partial<Seat>): Promise<Seat | undefined> {
    const seat = this.seats.get(id);
    if (!seat) return undefined;

    const updatedSeat = { ...seat, ...seatUpdate };
    this.seats.set(id, updatedSeat);
    return updatedSeat;
  }

  // Booking operations
  async getBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }

  async getUserBookings(userId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.userId === userId
    );
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = this.bookingCurrentId++;
    const booking: Booking = { ...insertBooking, id };
    this.bookings.set(id, booking);

    // Update seat availability
    const seatIds = insertBooking.seatIds.split(',').map(id => parseInt(id));
    for (const seatId of seatIds) {
      const seat = this.seats.get(seatId);
      if (seat) {
        this.seats.set(seatId, { ...seat, isBooked: true });
      }
    }

    // Update event's available seats
    const event = this.events.get(insertBooking.eventId);
    if (event) {
      const numBookedSeats = seatIds.length;
      this.events.set(insertBooking.eventId, {
        ...event,
        availableSeats: event.availableSeats - numBookedSeats
      });
    }

    return booking;
  }
}

export const storage = new MemStorage();

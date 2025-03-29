import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertEventSchema, insertBookingSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Categories routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getCategory(id);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    try {
      const category = await storage.createCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
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
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 8;
      const events = await storage.getUpcomingEvents(limit);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming events" });
    }
  });

  app.get("/api/events/featured", async (req, res) => {
    try {
      const event = await storage.getFeaturedEvent();
      
      if (!event) {
        return res.status(404).json({ message: "No featured event found" });
      }
      
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured event" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);
      
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
      const validatedData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent({
        ...validatedData,
        createdBy: req.user.id
      });
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
      const id = parseInt(req.params.id);
      const updatedEvent = await storage.updateEvent(id, req.body);
      
      if (!updatedEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(updatedEvent);
    } catch (error) {
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEvent(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Seats routes
  app.get("/api/events/:eventId/seats", async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const seats = await storage.getSeats(eventId);
      res.json(seats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch seats" });
    }
  });

  app.get("/api/seats", async (req, res) => {
    try {
      if (!req.query.ids) {
        return res.status(400).json({ message: "Seat IDs are required" });
      }
      
      const seatIds = (req.query.ids as string).split(',').map(id => parseInt(id));
      const seats = await storage.getSeatsByIds(seatIds);
      res.json(seats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch seats" });
    }
  });

  app.post("/api/events/:eventId/seats", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    try {
      const eventId = parseInt(req.params.eventId);
      const eventExists = await storage.getEvent(eventId);
      
      if (!eventExists) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const seat = await storage.createSeat({
        ...req.body,
        eventId
      });
      
      res.status(201).json(seat);
    } catch (error) {
      res.status(500).json({ message: "Failed to create seat" });
    }
  });

  // Bookings routes
  app.get("/api/user/bookings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const bookings = await storage.getUserBookings(req.user.id);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const validatedData = insertBookingSchema.parse({
        ...req.body,
        bookingDate: new Date()
      });
      
      // Verify user has access
      if (validatedData.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Verify event exists
      const event = await storage.getEvent(validatedData.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Verify seats exist and are available
      const seatIds = validatedData.seatIds.split(',').map(id => parseInt(id));
      const seats = await storage.getSeatsByIds(seatIds);
      
      if (seats.length !== seatIds.length) {
        return res.status(400).json({ message: "One or more seats not found" });
      }
      
      if (seats.some(seat => seat.isBooked)) {
        return res.status(400).json({ message: "One or more seats are already booked" });
      }
      
      // Create booking
      const booking = await storage.createBooking(validatedData);
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

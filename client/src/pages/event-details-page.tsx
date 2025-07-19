import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { CalendarIcon, ClockIcon, MapPinIcon, TicketIcon } from "lucide-react";
import { Event, Category } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileNav } from "@/components/ui/mobile-nav";

export default function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const eventId = parseInt(id);

  // State
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);

  // Queries
  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) throw new Error("Failed to fetch event");
      return res.json();
    },
    enabled: !!eventId,
  });

  const { data: category } = useQuery<Category>({
    queryKey: ["/api/categories", event?.categoryId],
    enabled: !!event?.categoryId,
  });

  // Handle buy tickets click
  const handleBuyTickets = () => {
    // Check if event is sold out
    if (event && event.availableSeats === 0) {
      return;
    }

    // Check if event is in the past
    if (event && new Date(event.date) < new Date()) {
      return;
    }

    // Show quantity selection modal
    setIsQuantityModalOpen(true);
  };

  // Proceed to checkout with quantity
  const handleProceedToCheckout = () => {
    if (ticketQuantity < 1) return;
    
    navigate(`/checkout/${eventId}?quantity=${ticketQuantity}`);
    setIsQuantityModalOpen(false);
  };

  // Loading state
  if (eventLoading || !event || !category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-t-2 border-primary rounded-full"></div>
      </div>
    );
  }

  // Check if event is sold out or past
  const isSoldOut = event.availableSeats === 0;
  const isPastEvent = new Date(event.date) < new Date();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="backdrop-blur-md bg-white/80 shadow-sm sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 sm:h-20 items-center">
            <div className="flex items-center gap-4 sm:gap-8">
              <Link href="/">
                <span className="text-primary text-2xl sm:text-3xl font-extrabold tracking-tight cursor-pointer drop-shadow-sm">StarEvents</span>
              </Link>
              <nav className="hidden sm:flex sm:space-x-4 items-center">
                <Link href="/events">
                  <a className="px-3 py-2 rounded-lg font-medium text-slate-700 hover:bg-primary/10 hover:text-primary transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">Explore Events</a>
                </Link>
                <Link href="/calendar">
                  <a className="px-3 py-2 rounded-lg font-medium text-slate-700 hover:bg-primary/10 hover:text-primary transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">Calendar</a>
                </Link>
                <Link href="#about">
                  <a className="px-3 py-2 rounded-lg font-medium text-slate-700 hover:bg-primary/10 hover:text-primary transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">About</a>
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {user ? (
                <Link href={user.isAdmin ? "/admin" : "/dashboard"}>
                  <button className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary border border-slate-200 shadow-sm">
                    <img 
                      className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=random`} 
                      alt={user.fullName}
                    />
                  </button>
                </Link>
              ) : (
                <Link href="/auth">
                  <Button variant="default" className="hidden sm:inline-flex ml-2 px-4 sm:px-6 py-2 text-sm sm:text-base font-semibold shadow-md bg-primary text-white hover:bg-primary/90 rounded-lg transition">Sign In</Button>
                </Link>
              )}
              <MobileNav currentPath="/events" />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full h-56 sm:h-80 md:h-[32rem] flex flex-col md:flex-row items-end">
        <div className="absolute inset-0">
          <img
            src={event?.imageUrl || ""}
            alt={event?.title || "Event image"}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8"
        >
          {event && category && (
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6">
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mb-3" style={{ backgroundColor: category.color, color: 'white' }}>{category.name}</span>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white drop-shadow mb-2 line-clamp-2">{event.title}</h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-slate-200 text-base sm:text-lg font-medium">
                  <span className="flex items-center gap-2"><CalendarIcon className="h-5 w-5" />{format(new Date(event.date), "EEE, MMM d, yyyy")}</span>
                  <span className="flex items-center gap-2"><ClockIcon className="h-5 w-5" />{format(new Date(event.date), "h:mm a")} {event.endDate ? `- ${format(new Date(event.endDate), "h:mm a")}` : ""}</span>
                  <span className="flex items-center gap-2"><MapPinIcon className="h-5 w-5" />{event.venue}, {event.location}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 md:mt-0">
                <Button 
                  onClick={handleBuyTickets}
                  disabled={isSoldOut || isPastEvent}
                  className={`px-6 sm:px-8 py-3 text-base sm:text-lg font-bold shadow-lg transition w-full md:w-auto ${
                    isSoldOut 
                      ? 'bg-red-600 text-white cursor-not-allowed' 
                      : isPastEvent
                        ? 'bg-slate-500 text-white cursor-not-allowed'
                        : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  {isSoldOut ? 'Sold Out' : isPastEvent ? 'Event Ended' : 'Buy Tickets'}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </section>

      {/* Main Content */}
      <main className="flex-1 bg-slate-50 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10"
        >
          {/* About This Event */}
          <section className="md:col-span-2 bg-white/80 rounded-2xl shadow-lg p-4 sm:p-8 mb-6 md:mb-0">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-slate-900">About This Event</h2>
            <div className="whitespace-pre-line text-base sm:text-lg text-slate-700">{event?.description}</div>
          </section>
          {/* Tickets */}
          <aside className="bg-white/90 rounded-2xl shadow-lg p-4 sm:p-8 flex flex-col gap-4 sm:gap-6">
            <h3 className="text-lg sm:text-xl font-bold mb-2 text-slate-900">Tickets</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-base sm:text-lg">General Admission</span>
                <span className="text-primary font-bold text-base sm:text-lg">Ksh{event?.price}</span>
              </div>
              <p className="text-slate-600 text-xs sm:text-sm mb-2">Standard entry, access to all areas</p>
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span>Remaining Tickets</span>
                <span className={`font-medium ${isSoldOut ? 'text-red-600' : ''}`}>
                  {isSoldOut ? 'Sold Out' : event?.availableSeats}
                </span>
              </div>
            </div>
            <Button 
              onClick={handleBuyTickets}
              disabled={isSoldOut || isPastEvent}
              className={`w-full text-base sm:text-lg font-semibold py-3 rounded-xl shadow-md transition mt-2 ${
                isSoldOut 
                  ? 'bg-red-600 text-white cursor-not-allowed' 
                  : isPastEvent
                    ? 'bg-slate-500 text-white cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {isSoldOut ? 'Sold Out' : isPastEvent ? 'Event Ended' : 'Buy Ticket'}
            </Button>
          </aside>
        </motion.div>
      </main>

      {/* Quantity Selection Modal */}
      <Dialog open={isQuantityModalOpen} onOpenChange={setIsQuantityModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Number of Tickets</DialogTitle>
            <DialogDescription>
              Choose how many tickets you'd like to purchase for {event?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span>Number of Tickets:</span>
              <Select value={ticketQuantity.toString()} onValueChange={(value) => setTicketQuantity(parseInt(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: Math.min(10, event?.availableSeats || 1) }, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span>Ksh{(event?.price || 0) * ticketQuantity}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuantityModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProceedToCheckout}>
              Proceed to Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { CalendarIcon, ClockIcon, MapPinIcon, ShareIcon } from "lucide-react";
import { SeatGrid } from "@/components/ui/seat-grid";
import { Event, Category, Seat } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";

export default function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const eventId = parseInt(id);

  // State
  const [isSeatsModalOpen, setIsSeatsModalOpen] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [ticketQuantity, setTicketQuantity] = useState(1);

  // Queries
  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const { data: category } = useQuery<Category>({
    queryKey: ["/api/categories", event?.categoryId],
    enabled: !!event?.categoryId,
  });

  const { data: availableSeats = [] } = useQuery<Seat[]>({
    queryKey: ["/api/events", eventId, "seats"],
    enabled: !!eventId,
  });

  // Handle seat selection
  const handleSeatSelect = (seat: Seat) => {
    if (selectedSeats.length >= ticketQuantity) {
      // Replace the first selected seat with the new one
      setSelectedSeats([...selectedSeats.slice(1), seat]);
    } else {
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const handleSeatDeselect = (seat: Seat) => {
    setSelectedSeats(selectedSeats.filter(s => s.id !== seat.id));
  };

  // Calculate total price
  const totalPrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

  // Proceed to checkout
  const handleProceedToCheckout = () => {
    if (selectedSeats.length === 0) {
      return;
    }
    
    if (!user) {
      navigate("/auth");
      return;
    }

    navigate(`/checkout/${eventId}?seats=${selectedSeats.map(s => s.id).join(',')}`);
  };

  // Loading state
  if (eventLoading || !event || !category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-t-2 border-primary rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/">
                  <span className="text-primary text-2xl font-bold cursor-pointer">EventHub</span>
                </Link>
              </div>
              <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link href="/events">
                  <a className="border-primary text-primary border-b-2 px-1 pt-1 text-sm font-medium">
                    Explore Events
                  </a>
                </Link>
                <Link href="/calendar">
                  <a className="border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800 px-1 pt-1 border-b-2 text-sm font-medium">
                    Calendar
                  </a>
                </Link>
                <Link href="/#categories">
                  <a className="border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800 px-1 pt-1 border-b-2 text-sm font-medium">
                    Categories
                  </a>
                </Link>
              </nav>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              {user ? (
                <Link href="/dashboard">
                  <button className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                    <img 
                      className="h-8 w-8 rounded-full" 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=random`} 
                      alt={user.fullName}
                    />
                  </button>
                </Link>
              ) : (
                <Link href="/auth">
                  <Button variant="outline">Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Event Details */}
      <div className="relative">
        <div className="h-64 md:h-96 bg-slate-300">
          <img 
            className="w-full h-full object-cover" 
            src={event.imageUrl} 
            alt={event.title} 
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent p-4 text-white">
            <span 
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: category.color }}
            >
              {category.name}
            </span>
            <h1 className="text-2xl md:text-4xl font-bold mt-2">{event.title}</h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-8">
            <div className="md:w-2/3">
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center text-slate-600">
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  <span>{format(new Date(event.date), "EEE, MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center text-slate-600">
                  <ClockIcon className="mr-2 h-5 w-5" />
                  <span>
                    {format(new Date(event.date), "h:mm a")} - 
                    {event.endDate ? format(new Date(event.endDate), " h:mm a") : " End time not specified"}
                  </span>
                </div>
                <div className="flex items-center text-slate-600">
                  <MapPinIcon className="mr-2 h-5 w-5" />
                  <span>{event.venue}, {event.location}</span>
                </div>
              </div>
              
              <div className="prose max-w-none">
                <h2 className="text-2xl font-bold mb-4">About This Event</h2>
                <div className="whitespace-pre-line">{event.description}</div>
              </div>
            </div>
            
            <div className="md:w-1/3 bg-slate-50 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Tickets</h3>
              
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">General Admission</span>
                  <span className="text-primary font-bold">
                    {event.maxPrice ? `$${event.price} - $${event.maxPrice}` : `$${event.price}`}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  Standard entry, access to all areas
                </p>
                <div className="mb-3">
                  <Select 
                    value={ticketQuantity.toString()} 
                    onValueChange={(value) => setTicketQuantity(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quantity" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? 'Ticket' : 'Tickets'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => setIsSeatsModalOpen(true)}
                  disabled={event.availableSeats === 0}
                >
                  {event.availableSeats === 0 ? "Sold Out" : "Select Seats"}
                </Button>
              </div>
              
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Remaining Tickets</span>
                  <span className="font-medium">{event.availableSeats}</span>
                </div>
              </div>
              
              <div className="border-t border-slate-200 pt-4 mt-4">
                <button className="w-full flex justify-center items-center text-slate-600 hover:text-slate-800">
                  <ShareIcon className="mr-2 h-4 w-4" /> Share Event
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seat Selection Modal */}
      <Dialog open={isSeatsModalOpen} onOpenChange={setIsSeatsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Your Seats</DialogTitle>
            <DialogDescription>
              {event.title} - {ticketQuantity} {ticketQuantity === 1 ? 'Ticket' : 'Tickets'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-6">
            <SeatGrid 
              eventId={eventId}
              selectedSeats={selectedSeats}
              onSeatSelect={handleSeatSelect}
              onSeatDeselect={handleSeatDeselect}
              availableSeats={availableSeats}
            />

            <div className="bg-slate-50 p-4 rounded-lg mt-8">
              <h4 className="font-medium text-slate-800 mb-3">Your Selection</h4>
              {selectedSeats.length === 0 ? (
                <p className="text-slate-600 mb-4">No seats selected yet</p>
              ) : (
                <>
                  {selectedSeats.map(seat => (
                    <div key={seat.id} className="flex justify-between mb-2">
                      <div>
                        <span className="text-slate-600">
                          Section {seat.row}, Seat {seat.number}
                        </span>
                      </div>
                      <div className="text-primary font-medium">${seat.price.toFixed(2)}</div>
                    </div>
                  ))}
                </>
              )}
              <div className="border-t border-slate-200 pt-4 flex justify-between">
                <div className="font-semibold">Total</div>
                <div className="text-primary font-bold">${totalPrice.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSeatsModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleProceedToCheckout}
              disabled={selectedSeats.length === 0}
            >
              Proceed to Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CalendarIcon, MapPinIcon, TicketIcon, ArrowLeft, LogOut, User } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Booking, Event } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { MobileNav } from "@/components/ui/mobile-nav";

export default function UserDashboard() {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("upcoming");

  // Query user bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/user/bookings"],
  });

  // Query events for each booking
  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: bookings.length > 0,
  });

  // Get booked events with details
  const bookedEvents = bookings.map(booking => {
    const event = events.find(e => e.id === booking.eventId);
    return { booking, event };
  });

  // Filter upcoming and past events
  const now = new Date();
  const upcomingBookings = bookedEvents.filter(
    ({ event }) => event && new Date(event.date) > now
  ).sort((a, b) => {
    if (a.event && b.event) {
      return new Date(a.event.date).getTime() - new Date(b.event.date).getTime();
    }
    return 0;
  });
  
  const pastBookings = bookedEvents.filter(
    ({ event }) => event && new Date(event.date) <= now
  ).sort((a, b) => {
    if (a.event && b.event) {
      return new Date(b.event.date).getTime() - new Date(a.event.date).getTime();
    }
    return 0;
  });

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Loading state
  if (bookingsLoading || eventsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link href="/">
                <div className="flex-shrink-0 flex items-center cursor-pointer">
                  <span className="text-primary text-xl sm:text-2xl font-bold">StarEvents</span>
                </div>
              </Link>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Mobile user info */}
              <div className="flex items-center space-x-2 sm:hidden">
                <div className="text-right">
                  <p className="text-sm font-medium truncate max-w-24">{user?.fullName}</p>
                </div>
                <img 
                  className="h-8 w-8 rounded-full border-2 border-primary"
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || '')}&background=random`}
                  alt={user?.fullName}
                />
              </div>
              
              {/* Desktop user info */}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{user?.fullName}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <img 
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 border-primary hidden sm:block"
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || '')}&background=random`}
                alt={user?.fullName}
              />
              
              {/* Mobile logout button */}
              <Button variant="ghost" size="icon" onClick={handleLogout} className="sm:hidden">
                <LogOut className="h-5 w-5" />
              </Button>
              
              {/* Desktop logout button */}
              <Button variant="ghost" size="icon" onClick={handleLogout} className="hidden sm:flex">
                <LogOut className="h-5 w-5" />
              </Button>
              
              <MobileNav currentPath="/dashboard" />
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Page Header - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Tickets</h1>
            <p className="text-slate-600 mt-1">Manage your event bookings</p>
          </div>
          <Link href="/events">
            <Button variant="outline" className="flex items-center w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Browse Events
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 sm:mb-8 w-full sm:w-auto">
            <TabsTrigger value="upcoming" className="relative flex-1 sm:flex-none min-h-[44px]">
              Upcoming Events
              {upcomingBookings.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {upcomingBookings.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1 sm:flex-none min-h-[44px]">Past Events</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming">
            {upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="py-8 sm:py-10 text-center">
                  <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <TicketIcon className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No upcoming events</h3>
                  <p className="text-slate-500 mb-6">You don't have any upcoming event bookings.</p>
                  <Link href="/events">
                    <Button className="min-h-[44px] px-6">Browse Events</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {upcomingBookings.map(({ booking, event }) => {
                  if (!event) return null;
                  
                  return (
                    <Card key={booking.id} className="overflow-hidden">
                      <div className="h-32 sm:h-40 relative">
                        <img 
                          src={event.imageUrl} 
                          alt={event.title} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded">
                          Confirmed
                        </div>
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base sm:text-lg">{event.title}</CardTitle>
                        <CardDescription>
                          <div className="flex items-center text-sm">
                            <CalendarIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{format(new Date(event.date), "EEE, MMM d, yyyy 'at' h:mm a")}</span>
                          </div>
                          <div className="flex items-center text-sm mt-1">
                            <MapPinIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{event.venue}, {event.location}</span>
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm">
                          <div className="font-medium">Booking details:</div>
                          <div>Booking ID: #{booking.id}</div>
                          <div>
                            {booking.ticketQuantity} tickets - $
                            {booking.totalPrice.toFixed(2)}
                          </div>
                          <div>
                            Booked on: {format(new Date(booking.bookingDate), "MMM d, yyyy")}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0 flex flex-col sm:flex-row gap-2 sm:justify-between">
                        <Link href={`/events/${event.id}`} className="w-full sm:w-auto">
                          <Button variant="outline" size="sm" className="w-full sm:w-auto min-h-[44px]">View Event</Button>
                        </Link>
                        <Button size="sm" className="w-full sm:w-auto min-h-[44px]">
                          Download Tickets
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="past">
            {pastBookings.length === 0 ? (
              <Card>
                <CardContent className="py-8 sm:py-10 text-center">
                  <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <TicketIcon className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No past events</h3>
                  <p className="text-slate-500 mb-6">You haven't attended any events yet.</p>
                  <Link href="/events">
                    <Button className="min-h-[44px] px-6">Browse Events</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {pastBookings.map(({ booking, event }) => {
                  if (!event) return null;
                  
                  return (
                    <Card key={booking.id} className="overflow-hidden">
                      <div className="h-32 sm:h-40 relative">
                        <img 
                          src={event.imageUrl} 
                          alt={event.title} 
                          className="w-full h-full object-cover filter grayscale"
                        />
                        <div className="absolute inset-0 bg-black/30"></div>
                        <div className="absolute top-2 right-2 bg-slate-700 text-white text-xs px-2 py-1 rounded">
                          Past Event
                        </div>
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base sm:text-lg">{event.title}</CardTitle>
                        <CardDescription>
                          <div className="flex items-center text-sm">
                            <CalendarIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{format(new Date(event.date), "EEE, MMM d, yyyy 'at' h:mm a")}</span>
                          </div>
                          <div className="flex items-center text-sm mt-1">
                            <MapPinIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{event.venue}, {event.location}</span>
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm">
                          <div className="font-medium">Booking details:</div>
                          <div>Booking ID: #{booking.id}</div>
                          <div>
                            {booking.ticketQuantity} tickets - $
                            {booking.totalPrice.toFixed(2)}
                          </div>
                          <div>
                            Booked on: {format(new Date(booking.bookingDate), "MMM d, yyyy")}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button variant="outline" size="sm" className="w-full min-h-[44px]">
                          View Receipt
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Event, Category } from "@shared/schema";
import { format, isSameDay } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { MapPinIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

export default function CalendarPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Group events by date for the calendar dots
  const eventsByDate = events.reduce((acc: Record<string, Event[]>, event) => {
    const dateKey = format(new Date(event.date), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {});

  // Get events for the selected date
  const selectedDateEvents = selectedDate
    ? events.filter(event => isSameDay(new Date(event.date), selectedDate))
    : [];

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // You could add more search logic here if needed
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
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
                  <a className="border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800 px-1 pt-1 border-b-2 text-sm font-medium">
                    Explore Events
                  </a>
                </Link>
                <Link href="/calendar">
                  <a className="border-primary text-primary border-b-2 px-1 pt-1 text-sm font-medium">
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
              <div className="relative mr-4">
                <form onSubmit={handleSearch}>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="Search events..."
                  />
                </form>
              </div>
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

      {/* Calendar Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Event Calendar</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Plan your schedule by browsing our event calendar. Filter by date, category, or location.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              {/* Calendar View */}
              <div className="lg:w-2/3 p-6 border-b lg:border-b-0 lg:border-r border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-800">
                      {selectedDate && format(selectedDate, "MMMM yyyy")}
                    </h3>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      className="p-2 rounded-full hover:bg-slate-100"
                      onClick={() => {
                        if (selectedDate) {
                          const prevMonth = new Date(selectedDate);
                          prevMonth.setMonth(prevMonth.getMonth() - 1);
                          setSelectedDate(prevMonth);
                        }
                      }}
                    >
                      <ChevronLeftIcon className="h-5 w-5 text-slate-600" />
                    </button>
                    <button 
                      className="p-2 rounded-full hover:bg-slate-100"
                      onClick={() => {
                        if (selectedDate) {
                          const nextMonth = new Date(selectedDate);
                          nextMonth.setMonth(nextMonth.getMonth() + 1);
                          setSelectedDate(nextMonth);
                        }
                      }}
                    >
                      <ChevronRightIcon className="h-5 w-5 text-slate-600" />
                    </button>
                  </div>
                </div>

                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="w-full"
                  modifiers={{
                    hasEvents: (date) => {
                      const dateKey = format(date, "yyyy-MM-dd");
                      return !!eventsByDate[dateKey];
                    },
                  }}
                  modifiersStyles={{
                    hasEvents: {
                      backgroundColor: "rgba(99, 102, 241, 0.1)",
                      borderRadius: "0.25rem",
                    },
                  }}
                />

                <div className="mt-6 flex flex-wrap gap-4">
                  {categories.map(category => (
                    <div key={category.id} className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="text-sm text-slate-600">{category.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Day Detail View */}
              <div className="lg:w-1/3 p-6">
                <h3 className="text-xl font-semibold text-slate-800 mb-4">
                  {selectedDate && format(selectedDate, "MMMM d, yyyy")}
                </h3>
                
                {selectedDateEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-600">No events scheduled for this date.</p>
                    <Link href="/events">
                      <Button variant="link" className="mt-2 text-primary">Browse all events</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDateEvents.map(event => {
                      const category = categories.find(c => c.id === event.categoryId);
                      if (!category) return null;
                      
                      return (
                        <div key={event.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 cursor-pointer">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-slate-900">{event.title}</h4>
                              <p className="text-sm text-slate-600 mt-1">
                                {format(new Date(event.date), "h:mm a")} - 
                                {event.endDate ? format(new Date(event.endDate), " h:mm a") : " End time not specified"}
                              </p>
                              <p className="text-sm text-slate-600 mt-1">
                                {event.venue}, {event.location}
                              </p>
                            </div>
                            <span 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: category.color, color: 'white' }}
                            >
                              {category.name}
                            </span>
                          </div>
                          <div className="mt-3 text-sm">
                            <span className="text-primary font-medium">
                              {event.maxPrice ? `$${event.price} - $${event.maxPrice}` : `$${event.price}`}
                            </span>
                            <span className="mx-2 text-slate-400">|</span>
                            <span className={event.availableSeats < 20 ? "text-warning" : "text-success"}>
                              {event.availableSeats} seats available
                            </span>
                          </div>
                          <div className="mt-3">
                            <Link href={`/events/${event.id}`}>
                              <button className="text-primary text-sm font-medium hover:text-primary/80">
                                View Details →
                              </button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6">
                  <Link href="/events">
                    <Button variant="outline" className="w-full">
                      Browse All Events
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-white mt-auto">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="md:grid md:grid-cols-4 md:gap-8">
            <div>
              <h3 className="text-2xl font-bold">EventHub</h3>
              <p className="mt-4 text-slate-300">
                The easiest way to discover and book tickets for your favorite events.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 mt-8 md:mt-0">Categories</h3>
              <ul className="space-y-2">
                {categories.slice(0, 6).map(category => (
                  <li key={category.id}>
                    <Link href={`/events?category=${category.id}`}>
                      <a className="text-slate-300 hover:text-white">{category.name}</a>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 mt-8 md:mt-0">Links</h3>
              <ul className="space-y-2">
                <li><Link href="/"><a className="text-slate-300 hover:text-white">Home</a></Link></li>
                <li><Link href="/events"><a className="text-slate-300 hover:text-white">Events</a></Link></li>
                <li><Link href="/calendar"><a className="text-slate-300 hover:text-white">Calendar</a></Link></li>
                {user && <li><Link href="/dashboard"><a className="text-slate-300 hover:text-white">My Dashboard</a></Link></li>}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 mt-8 md:mt-0">Contact</h3>
              <ul className="space-y-2">
                <li className="text-slate-300">support@eventhub.com</li>
                <li className="text-slate-300">+1 (555) 123-4567</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-700">
            <p className="text-slate-400 text-center">
              &copy; 2023 EventHub, Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

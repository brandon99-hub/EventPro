import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Event, Category } from "@shared/schema";
import { format, isSameDay, isSameWeek, isSameMonth, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isWithinInterval } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { MobileNav } from "@/components/ui/mobile-nav";
import { 
  MapPinIcon, 
  SearchIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ClockIcon, 
  FilterIcon, 
  CalendarIcon,
  PlusIcon,
  XIcon
} from "lucide-react";

export default function CalendarPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');

  // Queries
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Filter events based on search and category filters
  const filteredEvents = events.filter(event => {
    const matchesSearch = searchQuery === "" || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategories.length === 0 || 
      selectedCategories.includes(event.categoryId);
    
    return matchesSearch && matchesCategory;
  });

  // Group events by date for the calendar dots
  const eventsByDate = filteredEvents.reduce((acc: Record<string, Event[]>, event) => {
    const dateKey = format(new Date(event.date), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {});

  // Get events for the selected date/week/month
  const getSelectedEvents = () => {
    if (!selectedDate) return [];
    
    switch (viewMode) {
      case 'week':
        const weekStart = startOfWeek(selectedDate);
        const weekEnd = endOfWeek(selectedDate);
        return filteredEvents.filter(event => {
          const eventDate = new Date(event.date);
          return isWithinInterval(eventDate, { start: weekStart, end: weekEnd });
        });
      case 'month':
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        return filteredEvents.filter(event => {
          const eventDate = new Date(event.date);
          return isWithinInterval(eventDate, { start: monthStart, end: monthEnd });
        });
      default:
        return filteredEvents.filter(event => isSameDay(new Date(event.date), selectedDate));
    }
  };

  const selectedDateEvents = getSelectedEvents().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Quick navigation functions
  const goToToday = () => setSelectedDate(new Date());
  const goToThisWeek = () => {
    setSelectedDate(new Date());
    setViewMode('week');
  };
  const goToThisMonth = () => {
    setSelectedDate(new Date());
    setViewMode('month');
  };

  // Handle category filter toggle
  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategories([]);
  };

  // Add to calendar function (placeholder for future implementation)
  const addToCalendar = (event: Event) => {
    // This could integrate with Google Calendar, Outlook, etc.
    const eventUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${format(new Date(event.date), 'yyyyMMddTHHmmss')}/${format(new Date(event.endDate || event.date), 'yyyyMMddTHHmmss')}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(`${event.venue}, Daystar University`)}`;
    window.open(eventUrl, '_blank');
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already handled by the filteredEvents logic
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
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
                  <a className="px-3 py-2 rounded-lg font-medium text-primary bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">Calendar</a>
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <form onSubmit={handleSearch} className="relative hidden md:block">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white/80 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm shadow-sm transition"
                  placeholder="Search events..."
                  style={{ minWidth: 220 }}
                />
              </form>
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
              <MobileNav 
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSearchSubmit={handleSearch}
                currentPath="/calendar"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Calendar Section */}
      <section className="py-10 sm:py-16 flex-1">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-4 drop-shadow">Event Calendar</h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">Plan your schedule by browsing our event calendar. Filter by date, category, or location.</p>
          </div>

          {/* Quick Navigation and Filters */}
          <div className="mb-6 sm:mb-8 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goToToday}
                  className="flex items-center gap-2"
                >
                  <CalendarIcon className="h-4 w-4" />
                  Today
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goToThisWeek}
                  className={`flex items-center gap-2 ${viewMode === 'week' ? 'bg-primary/10 text-primary' : ''}`}
                >
                  This Week
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goToThisMonth}
                  className={`flex items-center gap-2 ${viewMode === 'month' ? 'bg-primary/10 text-primary' : ''}`}
                >
                  This Month
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <FilterIcon className="h-4 w-4 text-slate-600" />
                  <span className="text-xs sm:text-sm font-medium text-slate-700">Filters:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedCategories.includes(category.id)
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      style={{
                        border: selectedCategories.includes(category.id) ? 'none' : `2px solid ${category.color}`
                      }}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
                {(searchQuery || selectedCategories.length > 0) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <XIcon className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col lg:flex-row">
            {/* Calendar View */}
            <div className="lg:w-2/3 p-8 border-b lg:border-b-0 lg:border-r border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-2xl font-bold text-slate-800">{selectedDate && format(selectedDate, "MMMM yyyy")}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {Object.keys(eventsByDate).length} days with events
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    className="p-2 rounded-full hover:bg-primary/10 transition"
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
                    className="p-2 rounded-full hover:bg-primary/10 transition"
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

              <div className="mt-8 flex flex-wrap gap-4">
                <span className="text-sm font-medium text-slate-700">Legend:</span>
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
            <div className="lg:w-1/3 p-8 bg-white/90 flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-800">
                  {selectedDate && (
                    viewMode === 'week' 
                      ? `${format(startOfWeek(selectedDate), 'MMM d')} - ${format(endOfWeek(selectedDate), 'MMM d, yyyy')}`
                      : viewMode === 'month'
                      ? format(selectedDate, 'MMMM yyyy')
                      : format(selectedDate, "MMMM d, yyyy")
                  )}
                </h3>
                <div className="text-sm text-slate-600">
                  {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-600">No events scheduled for this {viewMode}.</p>
                  <Link href="/events">
                    <Button variant="outline" className="mt-4">Browse All Events</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto flex-1">
                  {selectedDateEvents.map(event => {
                    const category = categories.find(c => c.id === event.categoryId);
                    const eventDate = new Date(event.date);
                    const eventEndDate = event.endDate ? new Date(event.endDate) : null;
                    
                    return (
                      <div key={event.id} className="rounded-xl border border-slate-200 bg-white/80 shadow-md p-6 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: category?.color || '#6366F1', color: 'white' }}>
                              {category?.name}
                            </span>
                            {event.isFeatured && (
                              <span className="px-2 py-0.5 text-xs font-bold rounded bg-secondary text-white">Featured</span>
                            )}
                          </div>
                          <button
                            onClick={() => addToCalendar(event)}
                            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                            title="Add to calendar"
                          >
                            <PlusIcon className="h-4 w-4 text-slate-600" />
                          </button>
                        </div>
                        
                        <h4 className="text-lg font-bold text-slate-900">{event.title}</h4>
                        
                        <div className="flex items-center text-sm text-slate-600 mb-1">
                          <ClockIcon className="inline-block h-4 w-4 mr-1" />
                          {format(eventDate, 'h:mm a')}
                          {eventEndDate && ` - ${format(eventEndDate, 'h:mm a')}`}
                        </div>
                        
                        <div className="flex items-center text-sm text-slate-600 mb-1">
                          <MapPinIcon className="inline-block h-4 w-4 mr-1" />
                          {event.venue}, Daystar University
                        </div>
                        
                        <div className="text-slate-700 font-semibold text-base mb-3">
                          Ksh {event.price} | {event.availableSeats} seats available
                        </div>
                        
                        <div className="flex gap-2">
                          <Link href={`/events/${event.id}`} className="flex-1">
                            <Button variant="default" className="w-full">View Details →</Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-white mt-auto">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="md:grid md:grid-cols-4 md:gap-8">
            <div>
                                <h3 className="text-2xl font-bold">StarEvents</h3>
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
                <li><a href="mailto:support@starevents.com" className="text-slate-300 hover:text-white transition-colors">support@starevents.com</a></li>
                <li><a href="tel:+254741991213" className="text-slate-300 hover:text-white transition-colors">+254 741 991 213</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-700">
            <div className="flex items-center justify-center gap-3">
              <img 
                src="/workingwavewhitelogo.jpg" 
                alt="Working Wave Logo" 
                className="h-6 w-auto opacity-80 hover:opacity-100 transition-opacity"
              />
              <p className="text-slate-400 text-center">
                <a href="https://working-wave.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Working Wave © 2025. All Right Reserved.
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

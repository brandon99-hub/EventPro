import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { EventCard } from "@/components/ui/event-card";
import { Event, Category } from "@shared/schema";
import { SearchIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { MapPinIcon, ChevronRightIcon, CalendarIcon } from "lucide-react";
import { MobileNav } from "@/components/ui/mobile-nav";

export default function EventsPage() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Parse query parameters
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const initialCategory = searchParams.get('category');
  const initialSearch = searchParams.get('search') || '';
  
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(initialCategory ? parseInt(initialCategory) : null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState("date-asc");
  
  // Queries
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", { 
      category: selectedCategory, 
      search: searchQuery,
      city: selectedCity,
      sort: sortOption,
      page: currentPage
    }],
  });
  
  // Get unique cities from events, filter out empty/undefined
  const cities = Array.from(new Set(events.map(event => event.location).filter(Boolean)));
  
  // Filter and sort events
  const filteredEvents = events
    .filter(event => {
      if (selectedCategory && event.categoryId !== selectedCategory) return false;
      if (selectedCity && event.location !== selectedCity) return false;
      if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        default:
          return 0;
      }
    });
  
  // Pagination
  const eventsPerPage = 12;
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * eventsPerPage,
    currentPage * eventsPerPage
  );
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="backdrop-blur-md bg-white/80 shadow-sm sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 sm:h-20 items-center">
            <div className="flex items-center gap-4 sm:gap-8">
              <Link href="/">
                <span className="text-primary text-2xl font-bold cursor-pointer drop-shadow-sm">StarEvents</span>
              </Link>
              <nav className="hidden sm:flex sm:space-x-4 items-center">
                <Link href="/events">
                  <a className="px-3 py-2 rounded-lg font-semibold text-primary bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">Explore Events</a>
                </Link>
                <Link href="/calendar">
                  <a className="px-3 py-2 rounded-lg font-medium text-slate-700 hover:bg-primary/10 hover:text-primary transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">Calendar</a>
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <form className="relative hidden md:block">
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
                <Link href="/dashboard">
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
                currentPath="/events"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Category Filters */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6 flex flex-wrap items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 sm:mb-0">Explore Events</h2>
            <div className="flex items-center space-x-4 overflow-x-auto py-2 scrollbar-hide">
              <Button 
                variant={selectedCategory === null ? "default" : "outline"} 
                className="flex-shrink-0 rounded-full font-semibold px-6 py-2 shadow-sm border border-primary/20 bg-primary/5 hover:bg-primary/10"
                onClick={() => setSelectedCategory(null)}
              >
                All Events
              </Button>
              {categories.map(category => (
                <Button 
                  key={category.id} 
                  variant={selectedCategory === category.id ? "default" : "outline"} 
                  className="flex-shrink-0 rounded-full font-semibold px-6 py-2 shadow-sm border border-primary/20 bg-primary/5 hover:bg-primary/10"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Event Listings */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                {searchQuery ? `Search Results for "${searchQuery}"` : "Upcoming Events"}
              </h2>
              <p className="text-slate-600">
                {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
              </p>
            </div>
            <div className="flex items-center space-x-4 bg-white/80 backdrop-blur-md rounded-xl shadow p-4">
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-primary" />
                <Select
                  value={selectedCity || "all"}
                  onValueChange={(value) => setSelectedCity(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <ChevronRightIcon className="h-5 w-5 text-primary" />
                <Select 
                  value={sortOption} 
                  onValueChange={(value) => setSortOption(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-asc">Date (Ascending)</SelectItem>
                    <SelectItem value="date-desc">Date (Descending)</SelectItem>
                    <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                    <SelectItem value="price-desc">Price (High to Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="bg-white/80 rounded-2xl shadow-lg h-96 animate-pulse">
                  <div className="h-40 sm:h-48 bg-slate-200 rounded-t-2xl"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-6 bg-slate-200 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                    <div className="flex justify-between">
                      <div className="h-5 bg-slate-200 rounded w-1/4"></div>
                      <div className="h-5 bg-slate-200 rounded w-1/4"></div>
                    </div>
                    <div className="h-10 bg-slate-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : paginatedEvents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-slate-600">No events found matching your criteria.</p>
              <Button 
                variant="link" 
                className="mt-4 text-primary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                  setSelectedCity(null);
                }}
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
              {paginatedEvents.map(event => {
                const category = categories.find(c => c.id === event.categoryId);
                if (!category) return null;
                return <EventCard key={event.id} event={event} category={category} />;
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => setCurrentPage(i + 1)}
                        isActive={currentPage === i + 1}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
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
                    <button 
                      className="text-slate-300 hover:text-white"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      {category.name}
                    </button>
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

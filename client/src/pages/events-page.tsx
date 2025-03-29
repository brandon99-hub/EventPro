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
  
  // Get unique cities from events
  const cities = [...new Set(events.map(event => event.location))];
  
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

      {/* Category Filters */}
      <section className="bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">Explore Events</h2>
            <div className="flex items-center space-x-4 overflow-x-auto py-4 md:py-0 scrollbar-hide">
              <Button 
                variant={selectedCategory === null ? "default" : "outline"} 
                className="flex-shrink-0 rounded-full"
                onClick={() => setSelectedCategory(null)}
              >
                All Events
              </Button>
              {categories.map(category => (
                <Button 
                  key={category.id} 
                  variant={selectedCategory === category.id ? "default" : "outline"} 
                  className="flex-shrink-0 rounded-full"
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
      <section className="py-12 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                {searchQuery ? `Search Results for "${searchQuery}"` : "Upcoming Events"}
              </h2>
              <p className="text-slate-600">
                {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div>
                <Select
                  value={selectedCity || ""}
                  onValueChange={(value) => setSelectedCity(value || null)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Locations</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm h-96 animate-pulse">
                  <div className="h-48 bg-slate-200 rounded-t-lg"></div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedEvents.map(event => {
                const category = categories.find(c => c.id === event.categoryId);
                if (!category) return null;
                return (
                  <EventCard key={event.id} event={event} category={category} />
                );
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
      <footer className="bg-slate-800 text-white">
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

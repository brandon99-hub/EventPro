import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronRightIcon, SearchIcon, CalendarIcon, MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/ui/event-card";
import { Event, Category } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Get categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Get featured event
  const { data: featuredEvent } = useQuery<Event>({
    queryKey: ["/api/events/featured"],
  });

  // Get featured event category
  const { data: featuredCategory } = useQuery<Category>({
    queryKey: ["/api/categories", featuredEvent?.categoryId],
    enabled: !!featuredEvent?.categoryId,
  });

  // Get upcoming events
  const { data: upcomingEvents = [] } = useQuery<Event[]>({
    queryKey: ["/api/events/upcoming"],
  });

  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/events?search=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
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
                <a href="#categories" className="border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800 px-1 pt-1 border-b-2 text-sm font-medium">
                  Categories
                </a>
                <a href="#about" className="border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800 px-1 pt-1 border-b-2 text-sm font-medium">
                  About
                </a>
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
            <div className="flex items-center sm:hidden">
              <button className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary">
                <span className="sr-only">Open main menu</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary to-accent text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 relative z-10">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-6">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl xl:text-6xl">
                Discover and Book<br />
                <span className="text-secondary">Amazing Events</span>
              </h1>
              <p className="mt-6 text-xl max-w-3xl">
                Find tickets for concerts, sports, arts, theater, family events, and more happening in your area.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link href="/events">
                  <Button size="lg" className="bg-white text-primary hover:bg-slate-50">
                    Browse Events
                  </Button>
                </Link>
                <Link href="/calendar">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                    View Calendar
                  </Button>
                </Link>
              </div>
            </div>
            <div className="mt-12 lg:mt-0 lg:col-span-6">
              {featuredEvent && featuredCategory && (
                <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                  <div className="bg-white px-4 py-5 border-b border-slate-200 sm:px-6">
                    <h3 className="text-lg font-medium leading-6 text-slate-900">Featured Event</h3>
                  </div>
                  <div className="relative h-72 overflow-hidden">
                    <img 
                      className="w-full h-full object-cover" 
                      src={featuredEvent.imageUrl} 
                      alt={featuredEvent.title}
                    />
                    <div className="absolute top-0 left-0 px-3 py-1 mt-4 ml-4 bg-secondary text-white text-sm font-medium rounded">
                      FEATURED
                    </div>
                  </div>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="text-xs font-medium text-slate-500 mb-1">
                      <CalendarIcon className="inline-block h-3 w-3 mr-1" />
                      {new Date(featuredEvent.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })} • {new Date(featuredEvent.date).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })}
                    </div>
                    <h4 className="text-xl font-semibold text-slate-900 mb-1">{featuredEvent.title}</h4>
                    <div className="flex items-center text-sm text-slate-600 mb-3">
                      <MapPinIcon className="inline-block h-3 w-3 mr-1" />
                      {featuredEvent.venue}, {featuredEvent.location}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-primary font-bold">
                        {featuredEvent.maxPrice 
                          ? `$${featuredEvent.price} - $${featuredEvent.maxPrice}`
                          : `$${featuredEvent.price}`
                        }
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/events/${featuredEvent.id}`}>
                          <Button className="text-white bg-primary hover:bg-primary/90">
                            Get Tickets
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80')] opacity-10"></div>
      </section>

      {/* Category Filters */}
      <section id="categories" className="bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">Explore Events</h2>
            <div className="flex items-center space-x-4 overflow-x-auto py-4 md:py-0 scrollbar-hide">
              <Link href="/events">
                <Button variant="outline" className="flex-shrink-0 rounded-full">All Events</Button>
              </Link>
              {categories.map(category => (
                <Link key={category.id} href={`/events?category=${category.id}`}>
                  <Button variant="outline" className="flex-shrink-0 rounded-full">
                    {category.name}
                  </Button>
                </Link>
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
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Upcoming Events</h2>
              <p className="text-slate-600">Discover events happening near you</p>
            </div>
            <Link href="/events">
              <Button variant="link" className="text-primary">
                View All <ChevronRightIcon className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {upcomingEvents.map(event => {
              const category = categories.find(c => c.id === event.categoryId);
              if (!category) return null;
              return (
                <EventCard key={event.id} event={event} category={category} />
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-white mt-auto">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold">EventHub</h3>
              <p className="mt-4 text-slate-300">
                The easiest way to discover and book tickets for your favorite events.
              </p>
              <div className="mt-6 flex space-x-6">
                <a href="#" className="text-slate-400 hover:text-white">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </a>
                <a href="#" className="text-slate-400 hover:text-white">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-slate-400 hover:text-white">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                  </svg>
                </a>
                <a href="#" className="text-slate-400 hover:text-white">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Categories</h3>
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
              <h3 className="text-lg font-semibold mb-4">Help</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-300 hover:text-white">FAQs</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Contact Us</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Ticket Info</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Refunds</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Subscribe</h3>
              <p className="text-slate-300 mb-4">
                Get updates on new events and exclusive offers.
              </p>
              <form className="mt-2">
                <div className="flex">
                  <label htmlFor="email-address" className="sr-only">Email address</label>
                  <input id="email-address" name="email" type="email" autoComplete="email" required className="min-w-0 w-full bg-white border border-transparent rounded-md py-2 px-4 text-base text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white focus:border-white" placeholder="Enter your email" />
                  <div className="ml-3 flex-shrink-0">
                    <button type="submit" className="w-full bg-primary border border-transparent rounded-md py-2 px-4 flex items-center justify-center text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-primary">
                      Subscribe
                    </button>
                  </div>
                </div>
              </form>
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

import { Event, Category } from "@shared/schema";
import { useState } from "react";
import { Link } from "wouter";
import { CalendarIcon, MapPinIcon, TicketIcon, HeartIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: Event;
  category: Category;
}

export function EventCard({ event, category }: EventCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  return (
    <article 
      className={cn(
        "bg-white rounded-lg overflow-hidden transition-shadow duration-300",
        isHovered ? "shadow-md" : "shadow-sm"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <img 
          className="h-48 w-full object-cover" 
          src={event.imageUrl} 
          alt={event.title} 
        />
        <button 
          className="absolute top-0 right-0 mt-4 mr-4 bg-slate-900/70 rounded-full p-2 text-white cursor-pointer"
          onClick={toggleFavorite}
        >
          <HeartIcon className={cn(
            "h-5 w-5",
            isFavorite ? "fill-red-500 text-red-500" : ""
          )} />
        </button>
        <div className="absolute bottom-0 left-0 mb-4 ml-4">
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: category.color,
              color: 'white'
            }}
          >
            {category.name}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-xs font-medium text-slate-500 mb-1">
          <CalendarIcon className="inline-block h-3 w-3 mr-1" /> 
          {format(new Date(event.date), "EEE, MMM d, yyyy 'at' h:mm a")}
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">{event.title}</h3>
        <div className="flex items-center text-sm text-slate-600 mb-3">
          <MapPinIcon className="inline-block h-3 w-3 mr-1" /> 
          {event.venue}, {event.location}
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-primary font-bold">
            {event.maxPrice ? `$${event.price} - $${event.maxPrice}` : `$${event.price}`}
          </div>
          <div className="text-sm text-slate-600">
            <TicketIcon className="inline-block h-3 w-3 mr-1" /> 
            {event.availableSeats} available
          </div>
        </div>
        <Link href={`/events/${event.id}`}>
          <button className="mt-4 w-full bg-white border border-primary text-primary hover:bg-primary hover:text-white font-medium py-2 px-4 rounded transition-colors duration-200">
            View Details
          </button>
        </Link>
      </div>
    </article>
  );
}

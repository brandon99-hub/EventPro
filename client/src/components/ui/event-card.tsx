import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MapPinIcon, HeartIcon, TicketIcon } from "lucide-react";
import { Event, Category } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";
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

  // Check if event is sold out or past
  const isSoldOut = event.availableSeats === 0;
  const isPastEvent = new Date(event.date) < new Date();

  return (
    <article 
      className={cn(
        "bg-white rounded-lg overflow-hidden transition-shadow duration-300 flex flex-col",
        isHovered ? "shadow-md" : "shadow-sm"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <img 
          className="w-full h-40 sm:h-48 object-cover transition-all duration-200" 
          src={event.imageUrl} 
          alt={event.title} 
        />
        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex gap-2 z-10 flex-wrap">
          {isSoldOut && (
            <Badge className="bg-red-600 text-white font-bold text-xs px-2 py-1">Sold Out</Badge>
          )}
          {isPastEvent && (
            <Badge className="bg-slate-500 text-white font-bold text-xs px-2 py-1">Past</Badge>
          )}
        </div>
        <button 
          className="absolute top-0 right-0 mt-3 mr-3 bg-slate-900/70 rounded-full p-2 text-white cursor-pointer w-11 h-11 flex items-center justify-center"
          onClick={toggleFavorite}
          style={{ minWidth: 44, minHeight: 44 }}
        >
          <HeartIcon className={cn(
            "h-5 w-5",
            isFavorite ? "fill-red-500 text-red-500" : ""
          )} />
        </button>
        <div className="absolute bottom-0 left-0 mb-3 ml-3">
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
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
          <CalendarIcon className="inline-block h-3 w-3 mr-1" /> 
          {format(new Date(event.date), "EEE, MMM d, yyyy 'at' h:mm a")}
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1 line-clamp-2">{event.title}</h3>
        <div className="flex items-center text-xs sm:text-sm text-slate-600 mb-2 sm:mb-3">
          <MapPinIcon className="inline-block h-3 w-3 mr-1" /> 
          {event.venue}, {event.location}
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div className="text-primary font-bold text-sm sm:text-base">
            {event.maxPrice ? `Ksh${event.price} - Ksh${event.maxPrice}` : `Ksh${event.price}`}
          </div>
          <div className="text-xs sm:text-sm text-slate-600">
            <TicketIcon className="inline-block h-3 w-3 mr-1" /> 
            {isSoldOut ? 'Sold Out' : `${event.availableSeats} available`}
          </div>
        </div>
        <Link href={`/events/${event.id}`}>
          <button 
            className={cn(
              "mt-3 w-full font-medium py-3 rounded transition-colors duration-200 text-sm sm:text-base",
              isSoldOut 
                ? 'bg-red-600 text-white cursor-not-allowed' 
                : isPastEvent
                  ? 'bg-slate-500 text-white cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90'
            )}
            style={{ minHeight: 44 }}
            disabled={isSoldOut || isPastEvent}
          >
            {isSoldOut ? 'Sold Out' : isPastEvent ? 'Event Ended' : 'Get Tickets'}
          </button>
        </Link>
      </div>
    </article>
  );
}

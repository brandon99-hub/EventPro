import { useState, useEffect } from "react";
import { Seat } from "@shared/schema";
import { cn } from "@/lib/utils";

interface SeatGridProps {
  eventId: number;
  selectedSeats: Seat[];
  onSeatSelect: (seat: Seat) => void;
  onSeatDeselect: (seat: Seat) => void;
  availableSeats: Seat[];
}

export function SeatGrid({
  eventId,
  selectedSeats,
  onSeatSelect,
  onSeatDeselect,
  availableSeats
}: SeatGridProps) {
  const [rows, setRows] = useState<string[]>([]);
  const [seatsPerRow, setSeatsPerRow] = useState<{[key: string]: Seat[]}>({});

  useEffect(() => {
    // Group seats by row
    const uniqueRows = [...new Set(availableSeats.map(seat => seat.row))].sort();
    const seatsByRow: {[key: string]: Seat[]} = {};

    uniqueRows.forEach(row => {
      const rowSeats = availableSeats.filter(seat => seat.row === row);
      seatsByRow[row] = rowSeats.sort((a, b) => a.number - b.number);
    });

    setRows(uniqueRows);
    setSeatsPerRow(seatsByRow);
  }, [availableSeats]);

  const isSeatSelected = (seat: Seat) => {
    return selectedSeats.some(s => s.id === seat.id);
  };

  const isSeatBooked = (seat: Seat) => {
    return seat.isBooked;
  };

  const handleSeatClick = (seat: Seat) => {
    if (isSeatBooked(seat)) return;
    
    if (isSeatSelected(seat)) {
      onSeatDeselect(seat);
    } else {
      onSeatSelect(seat);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-8">
      <div className="w-64 h-8 bg-primary rounded-t-lg flex items-center justify-center text-white text-sm">
        STAGE
      </div>

      <div className="grid grid-cols-10 gap-2">
        {rows.map((row) => (
          seatsPerRow[row].map((seat) => (
            <button
              key={`${seat.row}-${seat.number}`}
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium",
                isSeatBooked(seat) 
                  ? "bg-slate-400 cursor-not-allowed" 
                  : isSeatSelected(seat)
                    ? "bg-primary/20 border border-primary text-primary hover:bg-primary/30"
                    : "bg-slate-200 text-slate-800 hover:bg-primary/20"
              )}
              onClick={() => handleSeatClick(seat)}
              disabled={isSeatBooked(seat)}
            >
              {seat.row}{seat.number}
            </button>
          ))
        ))}
      </div>

      <div className="flex justify-center gap-8">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-slate-200 rounded mr-2"></div>
          <span className="text-sm text-slate-600">Available</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-primary/20 border border-primary rounded mr-2"></div>
          <span className="text-sm text-slate-600">Selected</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-slate-400 rounded mr-2"></div>
          <span className="text-sm text-slate-600">Taken</span>
        </div>
      </div>
    </div>
  );
}

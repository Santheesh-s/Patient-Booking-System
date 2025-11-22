import { TimeSlot } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

interface TimeSlotSelectorProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  isLoading: boolean;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function TimeSlotSelector({
  slots,
  selectedSlot,
  onSelectSlot,
  isLoading,
}: TimeSlotSelectorProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No available slots for the selected date. Please choose another date.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {slots.map((slot) => (
        <Button
          key={slot.startTime}
          variant={selectedSlot === slot ? "default" : "outline"}
          className={`h-auto py-3 px-2 text-center flex flex-col items-center gap-1 transition-all ${
            selectedSlot === slot ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => onSelectSlot(slot)}
        >
          <span className="font-semibold">
            {formatTime(slot.startTime)}
          </span>
          <span className="text-xs opacity-75">
            {formatTime(slot.endTime)}
          </span>
          {selectedSlot === slot && (
            <CheckCircle className="w-4 h-4 mt-1" />
          )}
        </Button>
      ))}
    </div>
  );
}

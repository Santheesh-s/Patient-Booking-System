import { useState, useEffect } from "react";
import { Appointment, Provider } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, X, GripHorizontal, Clock } from "lucide-react";

interface CalendarViewProps {
  onClose: () => void;
}

interface DraggedAppointment {
  appointmentId: string;
  appointment: Appointment;
}

export default function CalendarView({ onClose }: CalendarViewProps) {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [token] = useState(() => localStorage.getItem("authToken") || "");
  const [draggedAppointment, setDraggedAppointment] = useState<DraggedAppointment | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newTime, setNewTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [pendingReschedule, setPendingReschedule] = useState<{
    appointmentId: string;
    newStartTime: Date;
    newEndTime: Date;
  } | null>(null);

  useEffect(() => {
    fetchAppointments();
    fetchProviders();
  }, [currentDate]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/appointments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await fetch("/api/providers");
      if (response.ok) {
        const data = await response.json();
        setProviders(data);
      }
    } catch (error) {
      console.error("Error fetching providers:", error);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return appointments.filter(
      (apt) => new Date(apt.startTime).toISOString().split("T")[0] === dateStr
    );
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const handleDragStart = (e: React.DragEvent, appointmentId: string, appointment: Appointment) => {
    setDraggedAppointment({ appointmentId, appointment });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", appointmentId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnDate = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!draggedAppointment) return;

    const { appointment } = draggedAppointment;
    const currentStartTime = new Date(appointment.startTime);
    const timeDiff = currentStartTime.getHours() * 60 + currentStartTime.getMinutes();

    // Calculate new start time preserving the time of day
    const newStartTime = new Date(targetDate);
    newStartTime.setHours(
      Math.floor(timeDiff / 60),
      timeDiff % 60,
      0,
      0
    );

    const durationMs = new Date(appointment.endTime).getTime() - currentStartTime.getTime();
    const newEndTime = new Date(newStartTime.getTime() + durationMs);

    // Show modal to ask for reason instead of directly rescheduling
    setPendingReschedule({
      appointmentId: appointment._id!,
      newStartTime,
      newEndTime,
    });
    setShowRescheduleModal(true);
    setRescheduleReason("");
    setDraggedAppointment(null);
  };

  const handleReschedule = async (appointmentId: string, newStartTime: Date, newEndTime: Date, reason?: string) => {
    try {
      setRescheduleLoading(true);
      const body: any = {
        newStartTime: newStartTime.toISOString(),
        newEndTime: newEndTime.toISOString(),
      };

      if (reason) {
        body.reason = reason;
      }

      const response = await fetch(`/api/admin/appointments/${appointmentId}/reschedule`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Appointment rescheduled successfully",
        });
        fetchAppointments();
        setShowRescheduleModal(false);
        setRescheduleReason("");
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to reschedule appointment",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reschedule appointment",
        variant: "destructive",
      });
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleQuickReschedule = (appointmentId: string, hoursOffset: number) => {
    const appointment = appointments.find((a) => a._id === appointmentId);
    if (!appointment) return;

    const currentStartTime = new Date(appointment.startTime);
    const newStartTime = new Date(currentStartTime.getTime() + hoursOffset * 3600000);
    const durationMs = new Date(appointment.endTime).getTime() - currentStartTime.getTime();
    const newEndTime = new Date(newStartTime.getTime() + durationMs);

    // Show modal to ask for reason
    setPendingReschedule({
      appointmentId,
      newStartTime,
      newEndTime,
    });
    setShowRescheduleModal(true);
    setRescheduleReason("");
  };

  const handleConfirmReschedule = async () => {
    if (!pendingReschedule) return;

    await handleReschedule(
      pendingReschedule.appointmentId,
      pendingReschedule.newStartTime,
      pendingReschedule.newEndTime,
      rescheduleReason || undefined
    );
    setPendingReschedule(null);
  };

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        i
      );
      days.push(date);
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center font-semibold text-sm p-2">
            {day}
          </div>
        ))}
        {days.map((date, idx) => {
          const dayAppointments = date ? getAppointmentsForDate(date) : [];
          const isToday = date && new Date().toDateString() === date.toDateString();
          const isCurrentMonth = date && date.getMonth() === currentDate.getMonth();
          const isDragTarget = draggedAppointment && date;

          return (
            <div
              key={idx}
              onDragOver={isDragTarget ? handleDragOver : undefined}
              onDrop={isDragTarget ? (e) => handleDropOnDate(e, date!) : undefined}
              className={`p-2 rounded-lg text-sm min-h-24 border transition-colors ${
                isCurrentMonth
                  ? `bg-background border-border hover:bg-muted/50 ${
                      isDragTarget ? "bg-primary/10 border-primary" : ""
                    }`
                  : "bg-muted text-muted-foreground"
              } ${isToday ? "ring-2 ring-primary" : ""} ${
                isDragTarget ? "cursor-move" : ""
              }`}
            >
              {date && (
                <>
                  <div className="font-semibold mb-1">
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map((apt) => (
                      <div
                        key={apt._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, apt._id!, apt)}
                        className="bg-primary/10 text-primary text-xs p-1 rounded truncate cursor-grab hover:bg-primary/20 hover:cursor-grabbing active:cursor-grabbing flex items-center gap-1"
                        title={`Drag to reschedule: ${apt.patientName} - ${apt.status}`}
                      >
                        <GripHorizontal className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {new Date(apt.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayAppointments.length - 3} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border-2">
        <CardHeader className="sticky top-0 bg-background border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle>Calendar View</CardTitle>
            {draggedAppointment && (
              <p className="text-xs text-primary mt-1">
                💡 Drop on a date to reschedule
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {currentDate.toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevMonth}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentDate(new Date())
                  }
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextMonth}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              {(["month", "week", "day"] as const).map((v) => (
                <Button
                  key={v}
                  variant={view === v ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView(v)}
                  className="capitalize"
                >
                  {v}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading appointments...
            </div>
          ) : (
            <div className="border border-border rounded-lg p-4 bg-background">
              {renderMonthView()}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Upcoming Appointments
              </h3>
              {appointments.length === 0 ? (
                <p className="text-muted-foreground">No appointments scheduled</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {appointments
                    .sort(
                      (a, b) =>
                        new Date(a.startTime).getTime() -
                        new Date(b.startTime).getTime()
                    )
                    .slice(0, 8)
                    .map((apt) => (
                      <div
                        key={apt._id}
                        className="p-3 bg-muted rounded-lg text-sm flex justify-between items-start hover:bg-muted/80 transition"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-foreground">
                            {apt.patientName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(apt.startTime).toLocaleString()} ({apt.status})
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6"
                            onClick={() => handleQuickReschedule(apt._id!, 1)}
                            title="Reschedule 1 hour later"
                          >
                            +1h
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6"
                            onClick={() => handleQuickReschedule(apt._id!, -1)}
                            title="Reschedule 1 hour earlier"
                          >
                            -1h
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
              <strong>💡 Drag & Drop Tip:</strong> Click and drag appointments on the calendar to reschedule them to a different date. The time of day will be preserved.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reschedule Reason Modal */}
      {showRescheduleModal && pendingReschedule && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-2">
            <CardHeader>
              <CardTitle>Reschedule Appointment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  New time: <span className="font-semibold text-foreground">
                    {pendingReschedule.newStartTime.toLocaleString()}
                  </span>
                </p>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Reason for reschedule (optional):
                </label>
                <textarea
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g., Provider requested, patient request, conflict resolution..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRescheduleModal(false);
                    setPendingReschedule(null);
                    setRescheduleReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmReschedule}
                  disabled={rescheduleLoading}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  {rescheduleLoading ? "Rescheduling..." : "Confirm"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

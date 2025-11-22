import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Phone, Mail, Clock, MapPin, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PatientAppointment {
  _id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  serviceId: string;
  providerId: string;
  serviceName?: string;
  providerName?: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  customFieldValues: Record<string, string>;
  createdAt?: string;
}

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log(`Searching appointments for email: ${email}`);
      const response = await fetch(`/api/appointments/by-email?email=${encodeURIComponent(email)}`);

      console.log(`Response status: ${response.status} ${response.statusText}`);

      let data: any = [];
      let errorMessage = "Failed to fetch appointments";

      // Read response as text once
      const responseText = await response.text();
      console.log(`Response text length: ${responseText.length}`);

      // Try to parse as JSON
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Failed to parse JSON:", parseError);
          console.error("Response was:", responseText.substring(0, 200));
          data = [];
        }
      }

      // Check response status
      if (!response.ok) {
        if (data && typeof data === "object" && "error" in data) {
          errorMessage = data.error || errorMessage;
        } else if (typeof data === "string") {
          errorMessage = data;
        }
        console.error("API Error:", { status: response.status, data });
        throw new Error(errorMessage);
      }

      // Ensure data is an array
      if (!Array.isArray(data)) {
        data = [];
      }

      console.log(`Fetched ${data.length} appointments`);
      setAppointments(data);
      setSearched(true);
    } catch (error) {
      console.error("Error searching appointments:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to fetch your appointments";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const upcomingAppointments = appointments.filter(
    (apt) => new Date(apt.startTime) > new Date() && apt.status !== "cancelled"
  );
  const pastAppointments = appointments.filter(
    (apt) => new Date(apt.startTime) <= new Date() || apt.status === "cancelled"
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Appointments</h1>
              <p className="text-sm text-muted-foreground">
                View and manage your scheduled appointments
              </p>
            </div>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </Button>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!searched ? (
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Find Your Appointments</CardTitle>
              <CardDescription>
                Enter your email address to view all your appointments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 px-4 py-2 border border-border rounded-lg bg-background"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  {loading ? "Searching..." : "Search"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Appointments for {email}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {upcomingAppointments.length} upcoming, {pastAppointments.length} past
                </p>
              </div>
              <Button
                onClick={() => {
                  setSearched(false);
                  setEmail("");
                  setAppointments([]);
                }}
                variant="outline"
              >
                Clear Search
              </Button>
            </div>

            {/* Upcoming Appointments */}
            {upcomingAppointments.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Upcoming Appointments
                </h3>
                <div className="space-y-4">
                  {upcomingAppointments.map((apt) => (
                    <Card key={apt._id} className="border-2 hover:border-primary/50 transition">
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Service</p>
                            <p className="font-semibold text-foreground text-lg">
                              {apt.serviceName || "Service"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Provider</p>
                            <p className="font-semibold text-foreground text-lg">
                              {apt.providerName || "Not assigned"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Date
                            </p>
                            <p className="font-semibold text-foreground">
                              {formatDate(apt.startTime)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Time
                            </p>
                            <p className="font-semibold text-foreground">
                              {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm text-muted-foreground mb-1">Status</p>
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(apt.status)}`}>
                                {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Important Notice */}
            <Card className="border-2 bg-amber-50 border-amber-200 mb-8">
              <CardContent className="pt-6">
                <p className="text-sm text-amber-900">
                  <strong>Note:</strong> You cannot cancel your appointment online. If you need to reschedule or cancel,
                  please contact us directly at the phone number below or send us an email.
                </p>
              </CardContent>
            </Card>

            {/* Past Appointments */}
            {pastAppointments.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Past Appointments
                </h3>
                <div className="space-y-4">
                  {pastAppointments.map((apt) => (
                    <Card key={apt._id} className="border-2 opacity-75">
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Service</p>
                            <p className="font-semibold text-foreground">
                              {apt.serviceName || "Service"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Provider</p>
                            <p className="font-semibold text-foreground">
                              {apt.providerName || "Not assigned"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Date</p>
                            <p className="font-semibold text-foreground">
                              {formatDate(apt.startTime)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Status</p>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(apt.status)}`}>
                              {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* No Appointments */}
            {appointments.length === 0 && (
              <Card className="border-2">
                <CardContent className="pt-6 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No appointments found for this email address
                  </p>
                  <Button
                    onClick={() => navigate("/")}
                    className="mt-4 bg-primary hover:bg-primary/90 text-white"
                  >
                    Book an Appointment
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            <Card className="border-2 mt-8 bg-card">
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-semibold text-foreground">+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-semibold text-foreground">contact@clinic.com</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

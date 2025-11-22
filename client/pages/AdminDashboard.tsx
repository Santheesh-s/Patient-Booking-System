import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Calendar, Users, Clock, CheckCircle, AlertCircle, Settings, BarChart3, Code } from "lucide-react";
import ServicesManagement from "@/components/Admin/ServicesManagement";
import ProviderManagement from "@/components/Admin/ProviderManagement";
import CalendarView from "@/components/Admin/CalendarView";
import AnalyticsReports from "@/components/Admin/AnalyticsReports";
import BrandingSettings from "@/components/Admin/BrandingSettings";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal states
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showProvidersModal, setShowProvidersModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
    fetchData();
  }, [navigate, statusFilter]);

  const fetchData = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      setLoading(true);

      // Fetch stats
      const statsResponse = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!statsResponse.ok) {
        throw new Error(`Stats fetch failed: ${statsResponse.status}`);
      }
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch appointments
      let query = new URLSearchParams();
      if (statusFilter !== "all") {
        query.append("status", statusFilter);
      }

      const aptsResponse = await fetch(`/api/admin/appointments?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!aptsResponse.ok) {
        throw new Error(`Appointments fetch failed: ${aptsResponse.status}`);
      }
      const aptsData = await aptsResponse.json();
      setAppointments(aptsData.appointments || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Appointment status updated",
        });
        fetchData();
      } else {
        throw new Error("Failed to update status");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    navigate("/login");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Welcome, {user.email} ({user.role})
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Appointments</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalAppointments}</p>
                  </div>
                  <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-primary/30" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.pendingAppointments}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-secondary/30" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Confirmed</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.confirmedAppointments}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-500/30" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Patients</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalPatients}</p>
                  </div>
                  <Users className="w-8 h-8 sm:w-10 sm:h-10 text-accent/30" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Appointments List */}
        <Card className="border-2">
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Appointments</CardTitle>
                <CardDescription>
                  {loading ? "Loading..." : `${appointments.length} appointment${appointments.length !== 1 ? "s" : ""}`}
                </CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                  className="text-xs"
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("pending")}
                  className="text-xs"
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === "confirmed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("confirmed")}
                  className="text-xs"
                >
                  Confirmed
                </Button>
                <Button
                  variant={statusFilter === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("completed")}
                  className="text-xs"
                >
                  Completed
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading appointments...
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No appointments to display
              </div>
            ) : (
              <div className="space-y-2 overflow-x-auto">
                {appointments.map((apt) => (
                  <div
                    key={apt._id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-sm sm:text-base">{apt.patientName}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{apt.patientEmail}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(apt.startTime).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <select
                        value={apt.status}
                        onChange={(e) => handleStatusChange(apt._id, e.target.value)}
                        className="px-2 py-1 text-xs sm:text-sm border border-border rounded-md bg-background"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Modals */}
        {showServicesModal && (
          <ServicesManagement onClose={() => setShowServicesModal(false)} />
        )}
        {showProvidersModal && (
          <ProviderManagement onClose={() => setShowProvidersModal(false)} />
        )}
        {showCalendarModal && (
          <CalendarView onClose={() => setShowCalendarModal(false)} />
        )}
        {showAnalyticsModal && (
          <AnalyticsReports onClose={() => setShowAnalyticsModal(false)} />
        )}
        {showSettingsModal && (
          <BrandingSettings onClose={() => setShowSettingsModal(false)} />
        )}

        {/* Feature Cards - Show based on role */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-8">
          <Card className="border-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Calendar View
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-6 sm:py-8">
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">View appointments in month, week, or day view</p>
              <Button
                onClick={() => setShowCalendarModal(true)}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Open Calendar
              </Button>
            </CardContent>
          </Card>

          {user?.role === "admin" && (
            <>
              <Card className="border-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Services
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-6 sm:py-8">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4">Create and manage services with custom fields</p>
                  <Button
                    onClick={() => setShowServicesModal(true)}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    Manage Services
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Providers
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-6 sm:py-8">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4">Manage providers and their availability</p>
                  <Button
                    onClick={() => setShowProvidersModal(true)}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    Manage Providers
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          <Card className="border-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-6 sm:py-8">
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">View statistics and export appointment data</p>
              <Button
                onClick={() => setShowAnalyticsModal(true)}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                View Analytics
              </Button>
            </CardContent>
          </Card>

          {user?.role === "admin" && (
            <>
              <Card className="border-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Clinic Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-6 sm:py-8">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4">Customize branding, notifications, and business hours</p>
                  <Button
                    onClick={() => setShowSettingsModal(true)}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    Configure Settings
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    Embed Widget
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-6 sm:py-8">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4">Add booking form to your website</p>
                  <Button
                    onClick={() => navigate("/admin/embed")}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    Get Embed Code
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

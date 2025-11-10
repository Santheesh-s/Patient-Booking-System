import { useState, useEffect } from "react";
import { Appointment, Service, Provider } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, X } from "lucide-react";

interface AnalyticsReportsProps {
  onClose: () => void;
}

export default function AnalyticsReports({ onClose }: AnalyticsReportsProps) {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [token] = useState(() => localStorage.getItem("authToken") || "");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [aptsRes, srvRes, prvRes] = await Promise.all([
        fetch("/api/admin/appointments", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/services"),
        fetch("/api/providers"),
      ]);

      if (aptsRes.ok) {
        const data = await aptsRes.json();
        setAppointments(data.appointments || []);
      }
      if (srvRes.ok) {
        setServices(await srvRes.json());
      }
      if (prvRes.ok) {
        setProviders(await prvRes.json());
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getServiceName = (serviceId: string) => {
    return services.find((s) => s._id === serviceId)?.name || "Unknown";
  };

  const getProviderName = (providerId: string) => {
    return providers.find((p) => p._id === providerId)?.name || "Unknown";
  };

  const appointmentsByService = services.map((service) => ({
    service: service.name,
    count: appointments.filter((a) => a.serviceId === service._id).length,
  }));

  const appointmentsByProvider = providers.map((provider) => ({
    provider: provider.name,
    count: appointments.filter((a) => a.providerId === provider._id).length,
  }));

  const appointmentsByStatus = {
    pending: appointments.filter((a) => a.status === "pending").length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
  };

  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const appointmentsLast30Days = appointments.filter(
    (a) => new Date(a.createdAt!) >= last30Days
  ).length;

  const conversionRate =
    appointments.length > 0
      ? (
          (appointmentsByStatus.confirmed /
            (appointmentsByStatus.pending +
              appointmentsByStatus.confirmed)) *
          100
        ).toFixed(1)
      : "0";

  const handleExportCSV = () => {
    const headers = [
      "Patient Name",
      "Email",
      "Phone",
      "Service",
      "Provider",
      "Date",
      "Status",
    ];
    const rows = appointments.map((apt) => [
      apt.patientName,
      apt.patientEmail,
      apt.patientPhone,
      getServiceName(apt.serviceId),
      getProviderName(apt.providerId),
      new Date(apt.startTime).toLocaleString(),
      apt.status,
    ]);

    const csv =
      [headers, ...rows]
        .map((row) =>
          row.map((cell) => `"${cell}"`).join(",")
        )
        .join("\n") + "\n";

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointments-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Appointments exported successfully",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border-2">
        <CardHeader className="sticky top-0 bg-background border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle>Analytics & Reports</CardTitle>
            <CardDescription>Appointment statistics and insights</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading analytics...
            </div>
          ) : (
            <div className="space-y-8">
              {/* Key Metrics */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Key Metrics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card className="border-2">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">
                          {appointments.length}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total Bookings
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-secondary">
                          {appointmentsLast30Days}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Last 30 Days
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-accent">
                          {conversionRate}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Confirmation Rate
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">
                          {new Set(
                            appointments.map((a) => a.patientEmail)
                          ).size}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Unique Patients
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Appointment Status Distribution */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Appointment Status Distribution
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Object.entries(appointmentsByStatus).map(([status, count]) => (
                    <Card key={status} className="border-2">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold capitalize">
                            {count}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {status}
                          </p>
                          <div className="mt-2 w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{
                                width: `${
                                  (count / appointments.length) * 100 || 0
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* By Service */}
              {appointmentsByService.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Appointments by Service
                  </h3>
                  <div className="space-y-2">
                    {appointmentsByService
                      .sort((a, b) => b.count - a.count)
                      .map((item) => (
                        <div key={item.service} className="flex items-center gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {item.service}
                            </p>
                          </div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{
                                width: `${
                                  (item.count /
                                    Math.max(
                                      ...appointmentsByService.map((s) => s.count),
                                      1
                                    )) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                          <span className="w-12 text-right text-sm font-semibold">
                            {item.count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* By Provider */}
              {appointmentsByProvider.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Appointments by Provider
                  </h3>
                  <div className="space-y-2">
                    {appointmentsByProvider
                      .sort((a, b) => b.count - a.count)
                      .map((item) => (
                        <div key={item.provider} className="flex items-center gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {item.provider}
                            </p>
                          </div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-secondary"
                              style={{
                                width: `${
                                  (item.count /
                                    Math.max(
                                      ...appointmentsByProvider.map((p) => p.count),
                                      1
                                    )) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                          <span className="w-12 text-right text-sm font-semibold">
                            {item.count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Service, Provider, TimeSlot, CustomField, Appointment } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import ServiceSelector from "./ServiceSelector";
import ProviderSelector from "./ProviderSelector";
import TimeSlotSelector from "./TimeSlotSelector";
import { Loader2, CheckCircle, Phone } from "lucide-react";

type Step = "service" | "provider" | "date" | "time" | "details" | "confirmation";

interface BookingFormState {
  service: Service | null;
  provider: Provider | null;
  date: string;
  slot: TimeSlot | null;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  customFieldValues: Record<string, string>;
}

export default function BookingFormComponent() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("service");
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  const [form, setForm] = useState<BookingFormState>({
    service: null,
    provider: null,
    date: "",
    slot: null,
    patientName: "",
    patientEmail: "",
    patientPhone: "",
    customFieldValues: {},
  });

  // Fetch services on mount
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/services");

      if (!response.ok) {
        throw new Error("Failed to load services.");
      }

      const data: Service[] = await response.json();
      setServices(data);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast({
        title: "Error",
        description: "Failed to load services. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async (serviceId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/providers?serviceId=${serviceId}`);

      if (!response.ok) {
        throw new Error("Failed to load providers.");
      }

      const data: Provider[] = await response.json();
      setProviders(data);
    } catch (error) {
      console.error("Error fetching providers:", error);
      toast({
        title: "Error",
        description: "Failed to load providers.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async (providerId: string, date: string, duration: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/slots?providerId=${providerId}&date=${date}&duration=${duration}`
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to load available time slots." }));
        throw new Error(error.error || "Failed to load available time slots.");
      }

      const data: TimeSlot[] = await response.json();
      setSlots(data);
    } catch (error) {
      console.error("Error fetching slots:", error);
      toast({
        title: "Error",
        description: "Failed to load available time slots.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setForm({ ...form, service, provider: null });
    fetchProviders(service._id!);
    setStep("provider");
  };

  const handleProviderSelect = (provider: Provider) => {
    setForm({ ...form, provider });
    setStep("date");
  };

  const handleDateSelect = (date: string) => {
    setForm({ ...form, date });
    if (form.provider) {
      fetchSlots(form.provider._id!, date, form.service?.duration || 30);
      setStep("time");
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setForm({ ...form, slot });
    // Initialize custom field values
    const customFieldValues: Record<string, string> = {};
    form.service?.customFields?.forEach((field) => {
      customFieldValues[field._id!] = "";
    });
    setForm((prev) => ({
      ...prev,
      slot,
      customFieldValues,
    }));
    setStep("details");
  };

  const handleCustomFieldChange = (fieldId: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      customFieldValues: {
        ...prev.customFieldValues,
        [fieldId]: value,
      },
    }));
  };

  const validateForm = (): boolean => {
    if (!form.patientName.trim()) {
      toast({ title: "Error", description: "Please enter your name.", variant: "destructive" });
      return false;
    }
    if (!form.patientEmail.trim() || !form.patientEmail.includes("@")) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return false;
    }
    if (!form.patientPhone.trim()) {
      toast({ title: "Error", description: "Please enter your phone number.", variant: "destructive" });
      return false;
    }

    // Validate required custom fields
    form.service?.customFields?.forEach((field) => {
      if (field.required && !form.customFieldValues[field._id!]?.trim()) {
        toast({
          title: "Error",
          description: `${field.name} is required.`,
          variant: "destructive",
        });
        return false;
      }
    });

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!form.slot || !form.service || !form.provider) return;

    setSubmitting(true);
    try {
      const appointmentData = {
        patientName: form.patientName,
        patientEmail: form.patientEmail,
        patientPhone: form.patientPhone,
        serviceId: form.service._id!,
        providerId: form.provider._id!,
        startTime: form.slot.startTime,
        endTime: form.slot.endTime,
        customFieldValues: form.customFieldValues,
      };

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to book appointment" }));
        throw new Error(error.message || error.error || "Failed to book appointment");
      }

      const result = await response.json();

      if (result.success) {
        setAppointmentId(result.appointmentId);
        setStep("confirmation");
        toast({
          title: "Success",
          description: "Your appointment has been booked successfully!",
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to book appointment.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting booking:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep("service");
    setForm({
      service: null,
      provider: null,
      date: "",
      slot: null,
      patientName: "",
      patientEmail: "",
      patientPhone: "",
      customFieldValues: {},
    });
    setAppointmentId(null);
  };

  // Confirmation Step
  if (step === "confirmation") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2">
            <CardContent className="p-8 text-center">
              <div className="mb-6 flex justify-center">
                <div className="bg-secondary/10 p-4 rounded-full">
                  <CheckCircle className="w-16 h-16 text-secondary" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Booking Confirmed!
              </h2>
              <p className="text-muted-foreground mb-6">
                Your appointment has been successfully scheduled. A confirmation email has been sent to{" "}
                <span className="font-semibold text-foreground">{form.patientEmail}</span>.
              </p>

              <div className="bg-muted rounded-lg p-6 text-left mb-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service:</span>
                  <span className="font-semibold">{form.service?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider:</span>
                  <span className="font-semibold">{form.provider?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date & Time:</span>
                  <span className="font-semibold">
                    {form.slot &&
                      new Date(form.slot.startTime).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmation ID:</span>
                  <span className="font-semibold text-primary">{appointmentId?.slice(0, 8)}</span>
                </div>
              </div>

              <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4 mb-6 text-left">
                <div className="flex gap-3">
                  <Phone className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground mb-1">To Cancel or Reschedule</p>
                    <p className="text-sm text-muted-foreground">
                      Please call us directly at the clinic. We do not allow online cancellations to ensure fairness to all patients.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={resetForm}
                className="w-full bg-primary hover:bg-primary/90 text-white"
                size="lg"
              >
                Book Another Appointment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Details Step
  if (step === "details") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2">
            <CardHeader className="border-b">
              <CardTitle>Complete Your Booking</CardTitle>
              <CardDescription>
                {form.service?.name} with {form.provider?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">Scheduled for:</p>
                <p className="font-semibold text-foreground">
                  {form.slot &&
                    new Date(form.slot.startTime).toLocaleString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Your Information</h3>
                <Input
                  placeholder="Full Name *"
                  value={form.patientName}
                  onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                  className="border-border"
                />
                <Input
                  type="email"
                  placeholder="Email Address *"
                  value={form.patientEmail}
                  onChange={(e) => setForm({ ...form, patientEmail: e.target.value })}
                  className="border-border"
                />
                <Input
                  type="tel"
                  placeholder="Phone Number *"
                  value={form.patientPhone}
                  onChange={(e) => setForm({ ...form, patientPhone: e.target.value })}
                  className="border-border"
                />
              </div>

              {form.service?.customFields && form.service.customFields.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Additional Information</h3>
                  {form.service.customFields
                    .sort((a, b) => a.order - b.order)
                    .map((field) => (
                      <div key={field._id}>
                        <label className="text-sm font-medium text-foreground block mb-2">
                          {field.name}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </label>
                        {field.type === "textarea" ? (
                          <Textarea
                            placeholder={`Enter ${field.name.toLowerCase()}`}
                            value={form.customFieldValues[field._id!] || ""}
                            onChange={(e) => handleCustomFieldChange(field._id!, e.target.value)}
                            className="border-border"
                            rows={3}
                          />
                        ) : field.type === "checkbox" ? (
                          <input
                            type="checkbox"
                            checked={form.customFieldValues[field._id!] === "true"}
                            onChange={(e) =>
                              handleCustomFieldChange(field._id!, e.target.checked ? "true" : "false")
                            }
                            className="rounded border-border cursor-pointer"
                          />
                        ) : field.type === "select" && field.options ? (
                          <select
                            value={form.customFieldValues[field._id!] || ""}
                            onChange={(e) => handleCustomFieldChange(field._id!, e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-md bg-background"
                          >
                            <option value="">Select an option</option>
                            {field.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            type={field.type}
                            placeholder={`Enter ${field.name.toLowerCase()}`}
                            value={form.customFieldValues[field._id!] || ""}
                            onChange={(e) => handleCustomFieldChange(field._id!, e.target.value)}
                            className="border-border"
                          />
                        )}
                      </div>
                    ))}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep("time")}
                  disabled={submitting}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Time Selection Step
  if (step === "time") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2">
            <CardHeader className="border-b">
              <CardTitle>Select Time Slot</CardTitle>
              <CardDescription>
                {form.service?.name} with {form.provider?.name} on{" "}
                {new Date(form.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <TimeSlotSelector
                slots={slots}
                selectedSlot={form.slot}
                onSelectSlot={handleSlotSelect}
                isLoading={loading}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("date")}
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (form.slot) handleSlotSelect(form.slot);
                  }}
                  disabled={!form.slot || loading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Date Selection Step
  if (step === "date") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2">
            <CardHeader className="border-b">
              <CardTitle>Select Date</CardTitle>
              <CardDescription>
                {form.service?.name} with {form.provider?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <input
                type="date"
                value={form.date}
                onChange={(e) => handleDateSelect(e.target.value)}
                min={today.toISOString().split("T")[0]}
                max={maxDate.toISOString().split("T")[0]}
                className="w-full px-4 py-2 border-2 border-border rounded-lg font-medium text-foreground"
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("provider")}
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => form.date && handleDateSelect(form.date)}
                  disabled={!form.date || loading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                >
                  {loading ? "Loading Slots..." : "Next"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Provider Selection Step
  if (step === "provider") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2">
            <CardHeader className="border-b">
              <CardTitle>Select Provider</CardTitle>
              <CardDescription>{form.service?.name}</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <ProviderSelector
                providers={providers}
                selectedProvider={form.provider}
                onSelectProvider={handleProviderSelect}
                isLoading={loading}
              />
              <Button
                variant="outline"
                onClick={() => setStep("service")}
                disabled={loading}
                className="w-full"
              >
                Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Service Selection Step (Default)
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Book Your Appointment
          </h1>
          <p className="text-lg text-muted-foreground">
            Quick and easy online booking
          </p>
        </div>

        <Card className="border-2">
          <CardHeader className="border-b">
            <CardTitle>Select a Service</CardTitle>
            <CardDescription>Choose the service you need</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <ServiceSelector
              services={services}
              selectedService={form.service}
              onSelectService={handleServiceSelect}
              isLoading={loading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

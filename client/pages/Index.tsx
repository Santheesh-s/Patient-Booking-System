import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BookingFormComponent from "@/components/BookingForm/BookingFormComponent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Lock, Settings } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const [showBooking, setShowBooking] = useState(false);

  if (showBooking) {
    return <BookingFormComponent />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Welcome Screen */}
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <div className="mb-6 inline-block bg-primary/10 p-4 rounded-full">
            <Calendar className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Appointment Booking System
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8">
            Simple and secure online appointment scheduling for your clinic
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              onClick={() => setShowBooking(true)}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg"
            >
              Book Appointment
            </Button>
            <Button
              onClick={() => navigate("/appointments")}
              variant="outline"
              className="px-8 py-3 text-lg"
            >
              <Calendar className="w-5 h-5 mr-2" />
              My Appointments
            </Button>
            <Button
              onClick={() => navigate("/login")}
              variant="outline"
              className="px-8 py-3 text-lg"
            >
              <Lock className="w-5 h-5 mr-2" />
              Staff Login
            </Button>
            <Button
              onClick={() => navigate("/setup")}
              variant="outline"
              className="px-8 py-3 text-lg"
            >
              <Settings className="w-5 h-5 mr-2" />
              Setup
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg">Patient Portal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Easy online booking with service selection, provider choice, and customizable appointment fields
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg">Smart Scheduling</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                8 random available time slots per day, conflict prevention, and automatic confirmation
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg">Admin Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage appointments, view statistics, and control booking settings from one place
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        <div className="max-w-2xl mx-auto bg-card rounded-lg border-2 border-border p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Getting Started</h2>
          <ol className="space-y-3 text-left text-muted-foreground">
            <li className="flex gap-3">
              <span className="font-bold text-primary">1.</span>
              <span>Click "Setup" to initialize the database with demo services and providers</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">2.</span>
              <span>Log in to admin portal with demo credentials to manage appointments</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">3.</span>
              <span>Click "Book Appointment" to test the patient booking flow</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">4.</span>
              <span>Customize services, providers, and availability in the admin dashboard</span>
            </li>
          </ol>
        </div>

        <div className="mt-8">
          <Button
            onClick={() => setShowBooking(true)}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3"
          >
            Start Booking Now →
          </Button>
        </div>
      </div>
    </div>
  );
}

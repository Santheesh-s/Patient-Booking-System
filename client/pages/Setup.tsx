import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";

export default function Setup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [demoCredentials, setDemoCredentials] = useState<any>(null);

  const handleInitialize = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/init");
      const data = await response.json();

      if (data.success || data.message === "Database already initialized") {
        setInitialized(true);
        setDemoCredentials(data.demo);
        toast({
          title: "Success",
          description: "Database initialized with demo data!",
        });
      } else {
        toast({
          title: "Info",
          description: data.message || "Database setup completed",
        });
        setInitialized(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initialize database",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2">
        {initialized ? (
          <>
            <CardContent className="pt-8 text-center">
              <div className="mb-6 flex justify-center">
                <div className="bg-secondary/10 p-4 rounded-full">
                  <CheckCircle className="w-12 h-12 text-secondary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Ready to Go!</h2>
              <p className="text-muted-foreground mb-6">
                Your appointment booking system is ready to use.
              </p>

              {demoCredentials && (
                <div className="bg-muted rounded-lg p-4 text-left mb-6 space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground font-semibold">Admin Login:</p>
                    <p className="font-mono text-foreground">{demoCredentials.adminEmail}</p>
                    <p className="font-mono text-foreground">{demoCredentials.adminPassword}</p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <p className="text-muted-foreground font-semibold">Provider Login:</p>
                    <p className="font-mono text-foreground">{demoCredentials.providerEmail}</p>
                    <p className="font-mono text-foreground">{demoCredentials.providerPassword}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={() => navigate("/")}
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                >
                  Book an Appointment
                </Button>
                <Button
                  onClick={() => navigate("/login")}
                  variant="outline"
                  className="w-full"
                >
                  Staff Login
                </Button>
              </div>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Initialize Demo Database</CardTitle>
              <CardDescription>
                Set up demo data to test the appointment booking system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will create:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 ml-4">
                <li>✓ Admin user account</li>
                <li>✓ Provider account</li>
                <li>✓ Sample services</li>
                <li>✓ Provider availability</li>
              </ul>

              <Button
                onClick={handleInitialize}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-white mt-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  "Initialize Database"
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center pt-4">
                This is safe to run multiple times. Existing data will be preserved.
              </p>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

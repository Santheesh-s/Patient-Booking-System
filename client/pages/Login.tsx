import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Home } from "lucide-react";

type UserRole = "admin" | "provider";

function applyBrandingTheme(branding: { primaryColor?: string; secondaryColor?: string; accentColor?: string; fontFamily?: string }) {
  const root = document.documentElement;
  if (branding.primaryColor) root.style.setProperty("--brand-primary", branding.primaryColor);
  if (branding.secondaryColor) root.style.setProperty("--brand-secondary", branding.secondaryColor);
  if (branding.accentColor) root.style.setProperty("--brand-accent", branding.accentColor);
  if (branding.fontFamily) document.body.style.fontFamily = branding.fontFamily;
}

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<UserRole>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOTP, setResetOTP] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/public/settings/branding");
        if (r.ok) {
          const s = await r.json();
          applyBrandingTheme(s);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Validate user role matches selected role
      if (data.user.role !== userRole && !(userRole === "admin" && data.user.role === "staff")) {
        throw new Error(`Invalid credentials for ${userRole} login`);
      }

      // Store token
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      toast({
        title: "Success",
        description: "Logged in successfully!",
      });

      // Redirect based on role
      if (data.user.role === "admin" || data.user.role === "staff") {
        navigate("/admin/dashboard");
      } else if (data.user.role === "provider") {
        navigate("/admin/dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Login failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDemoCredentials = () => {
    if (userRole === "admin") {
      return { email: "admin@clinic.com", password: "admin123" };
    } else {
      return { email: "dr.smith@clinic.com", password: "provider123" };
    }
  };

  const demoCredentials = getDemoCredentials();

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast({ title: "Error", description: "Email required", variant: "destructive" });
      return;
    }
    setResetLoading(true);
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail })
      });
      await r.json();
      toast({ title: "OTP Sent", description: "If the email exists, an OTP was sent." });
      setResetStep(2);
    } catch {
      toast({ title: "Error", description: "Failed to request OTP", variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail || !resetOTP || !newPassword) {
      toast({ title: "Error", description: "All fields required", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    setResetLoading(true);
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, otp: resetOTP, newPassword })
      });
      const data = await r.json();
      if (!r.ok || !data.success) throw new Error(data.error || "Reset failed");
      toast({ title: "Password Updated", description: "You can now log in." });
      setResetOpen(false);
      setResetStep(1);
      setResetEmail(""); setResetOTP(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Reset failed", variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        <div className="absolute top-0 right-0">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="gap-2"
            size="sm"
          >
            <Home className="w-4 h-4" />
            Home
          </Button>
        </div>
        <Card className="w-full max-w-md border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Clinic Portal</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Role Selection Tabs */}
            <div className="flex gap-2 mb-6 bg-muted rounded-lg p-1">
              <button
                onClick={() => setUserRole("admin")}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                  userRole === "admin"
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => setUserRole("provider")}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                  userRole === "provider"
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Provider
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder={userRole === "admin" ? "admin@clinic.com" : "dr.smith@clinic.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="border-border"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="border-border"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-white mt-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
            <div className="flex items-center justify-between mb-4">
              <Dialog open={resetOpen} onOpenChange={(o) => { setResetOpen(o); if (!o) { setResetStep(1); } }}>
                <DialogTrigger asChild>
                  <Button variant="link" className="px-0 text-sm">Forgot password?</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{resetStep === 1 ? "Reset Password" : "Enter OTP & New Password"}</DialogTitle>
                    <DialogDescription>
                      {resetStep === 1 ? "Enter your email to receive an OTP." : "Enter the OTP and choose a new password."}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={resetStep === 1 ? handleForgot : handleReset} className="space-y-4">
                    {resetStep === 1 && (
                      <Input
                        type="email"
                        placeholder="Email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={resetLoading}
                      />
                    )}
                    {resetStep === 2 && (
                      <>
                        <Input
                          type="text"
                          placeholder="OTP"
                          value={resetOTP}
                          maxLength={6}
                          onChange={(e) => setResetOTP(e.target.value)}
                          disabled={resetLoading}
                        />
                        <Input
                          type="password"
                          placeholder="New password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={resetLoading}
                        />
                        <Input
                          type="password"
                          placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={resetLoading}
                        />
                      </>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          if (resetStep === 2) setResetStep(1);
                          else setResetOpen(false);
                        }}
                        disabled={resetLoading}
                      >
                        {resetStep === 2 ? "Back" : "Cancel"}
                      </Button>
                      <Button type="submit" className="flex-1" disabled={resetLoading}>
                        {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (resetStep === 1 ? "Send OTP" : "Reset")}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>


            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Demo credentials:</strong>
                <br />
                Email: {demoCredentials.email}
                <br />
                Password: {demoCredentials.password}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

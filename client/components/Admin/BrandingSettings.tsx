import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { X, Save, RotateCcw } from "lucide-react";

interface BrandingSettings {
  clinicName: string;
  clinicEmail: string;
  clinicPhone: string;
  clinicAddress: string;
  clinicWebsite: string;
  clinicLogo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  timezone: string;
  bookingApprovalRequired: boolean;
  notificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  reminderHoursBefore: number;
  businessHoursStart: string;
  businessHoursEnd: string;
}

interface BrandingSettingsProps {
  onClose: () => void;
}

export default function BrandingSettings({ onClose }: BrandingSettingsProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"branding" | "notifications" | "business">("branding");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch("/api/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    const token = localStorage.getItem("authToken");
    if (!token || !settings) return;

    try {
      setSaving(true);
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Settings updated successfully",
        });
      } else {
        throw new Error("Failed to update settings");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    if (!window.confirm("Are you sure you want to reset all settings to default?")) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/settings/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        toast({
          title: "Success",
          description: "Settings reset to default",
        });
      } else {
        throw new Error("Failed to reset settings");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof BrandingSettings, value: any) => {
    if (settings) {
      setSettings({
        ...settings,
        [key]: value,
      });
    }
  };

  if (loading || !settings) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-2">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Loading settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border-2">
        <CardHeader className="sticky top-0 bg-background border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle>Clinic Settings</CardTitle>
            <CardDescription>Customize your clinic branding and preferences</CardDescription>
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
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border">
            {(["branding", "notifications", "business"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 border-b-2 transition ${
                  activeTab === tab
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Branding Tab */}
          {activeTab === "branding" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Clinic Name</label>
                  <input
                    type="text"
                    value={settings.clinicName}
                    onChange={(e) => updateSetting("clinicName", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Website</label>
                  <input
                    type="url"
                    value={settings.clinicWebsite}
                    onChange={(e) => updateSetting("clinicWebsite", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <input
                    type="email"
                    value={settings.clinicEmail}
                    onChange={(e) => updateSetting("clinicEmail", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Phone</label>
                  <input
                    type="tel"
                    value={settings.clinicPhone}
                    onChange={(e) => updateSetting("clinicPhone", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Address</label>
                <textarea
                  value={settings.clinicAddress}
                  onChange={(e) => updateSetting("clinicAddress", e.target.value)}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-semibold text-foreground mb-4">Color Scheme</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Primary Color</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={settings.primaryColor}
                        onChange={(e) => updateSetting("primaryColor", e.target.value)}
                        className="w-12 h-10 border border-border rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.primaryColor}
                        onChange={(e) => updateSetting("primaryColor", e.target.value)}
                        className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Secondary Color</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={settings.secondaryColor}
                        onChange={(e) => updateSetting("secondaryColor", e.target.value)}
                        className="w-12 h-10 border border-border rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.secondaryColor}
                        onChange={(e) => updateSetting("secondaryColor", e.target.value)}
                        className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Accent Color</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={settings.accentColor}
                        onChange={(e) => updateSetting("accentColor", e.target.value)}
                        className="w-12 h-10 border border-border rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.accentColor}
                        onChange={(e) => updateSetting("accentColor", e.target.value)}
                        className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Font Family</label>
                <select
                  value={settings.fontFamily}
                  onChange={(e) => updateSetting("fontFamily", e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="system-ui, -apple-system, sans-serif">System UI (Default)</option>
                  <option value="'Georgia', serif">Georgia (Serif)</option>
                  <option value="'Courier New', monospace">Courier (Monospace)</option>
                  <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                </select>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notificationsEnabled}
                    onChange={(e) => updateSetting("notificationsEnabled", e.target.checked)}
                    className="w-4 h-4 rounded border border-border"
                  />
                  <span className="font-medium text-foreground">Enable All Notifications</span>
                </label>

                <div className="ml-7 space-y-3 border-l-2 border-border pl-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.emailNotificationsEnabled}
                      onChange={(e) => updateSetting("emailNotificationsEnabled", e.target.checked)}
                      disabled={!settings.notificationsEnabled}
                      className="w-4 h-4 rounded border border-border"
                    />
                    <span className="text-foreground">Email Notifications</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.smsNotificationsEnabled}
                      onChange={(e) => updateSetting("smsNotificationsEnabled", e.target.checked)}
                      disabled={!settings.notificationsEnabled}
                      className="w-4 h-4 rounded border border-border"
                    />
                    <span className="text-foreground">SMS Notifications</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <label className="text-sm font-medium text-foreground">Reminder Before Appointment</label>
                <select
                  value={settings.reminderHoursBefore}
                  onChange={(e) => updateSetting("reminderHoursBefore", parseInt(e.target.value))}
                  className="w-full mt-2 px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value={0}>No reminder</option>
                  <option value={1}>1 hour before</option>
                  <option value={2}>2 hours before</option>
                  <option value={6}>6 hours before</option>
                  <option value={12}>12 hours before</option>
                  <option value={24}>24 hours before (1 day)</option>
                  <option value={48}>48 hours before (2 days)</option>
                </select>
              </div>

              <div className="border-t border-border pt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.bookingApprovalRequired}
                    onChange={(e) => updateSetting("bookingApprovalRequired", e.target.checked)}
                    className="w-4 h-4 rounded border border-border"
                  />
                  <div>
                    <span className="font-medium text-foreground">Require Booking Approval</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bookings will be pending until manually approved by admin
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Business Hours Tab */}
          {activeTab === "business" && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-foreground">Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => updateSetting("timezone", e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Central European Time (CET)</option>
                  <option value="Asia/Dubai">Gulf Standard Time (GST)</option>
                  <option value="Asia/Kolkata">Indian Standard Time (IST)</option>
                  <option value="Australia/Sydney">Australian Eastern Time (AEST)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Business Hours Start</label>
                  <input
                    type="time"
                    value={settings.businessHoursStart}
                    onChange={(e) => updateSetting("businessHoursStart", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Business Hours End</label>
                  <input
                    type="time"
                    value={settings.businessHoursEnd}
                    onChange={(e) => updateSetting("businessHoursEnd", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
                <strong>💡 Note:</strong> These business hours are used for default availability calculations.
                Individual providers can have custom hours.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-border">
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-white flex-1 gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
            <Button
              onClick={handleResetSettings}
              disabled={saving}
              variant="outline"
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

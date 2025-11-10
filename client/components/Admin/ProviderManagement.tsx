import { useState, useEffect } from "react";
import { Provider, ProviderAvailability } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit2, Plus, X, Clock } from "lucide-react";

interface ProviderManagementProps {
  onClose: () => void;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ProviderManagement({ onClose }: ProviderManagementProps) {
  const { toast } = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<ProviderAvailability | null>(null);
  const [token] = useState(() => localStorage.getItem("authToken") || "");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    speciality: "",
    services: [] as string[],
  });

  const defaultBusinessHours = [
    { dayOfWeek: 0, startTime: "00:00", endTime: "00:00", isOpen: false },
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isOpen: true },
    { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isOpen: true },
    { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isOpen: true },
    { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isOpen: true },
    { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", isOpen: true },
    { dayOfWeek: 6, startTime: "00:00", endTime: "00:00", isOpen: false },
  ];

  const [businessHours, setBusinessHours] = useState(defaultBusinessHours);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState("");

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/providers");
      const data = await response.json();
      setProviders(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch providers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async (providerId: string) => {
    try {
      const response = await fetch(`/api/providers/${providerId}/availability`);
      if (response.ok) {
        const data = await response.json();
        setAvailability(data);
        setBusinessHours(data.businessHours);
        setBlockedDates(data.blockedDates || []);
      } else {
        setBusinessHours(defaultBusinessHours);
        setBlockedDates([]);
      }
    } catch (error) {
      setBusinessHours(defaultBusinessHours);
      setBlockedDates([]);
    }
  };

  const handleSaveProvider = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = editingId ? `/api/providers/${editingId}` : "/api/providers";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save provider");

      toast({
        title: "Success",
        description: `Provider ${editingId ? "updated" : "created"} successfully`,
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        speciality: "",
        services: [],
      });
      setEditingId(null);
      setShowForm(false);
      fetchProviders();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save provider",
        variant: "destructive",
      });
    }
  };

  const handleSaveAvailability = async (providerId: string) => {
    try {
      const response = await fetch(
        `/api/providers/${providerId}/availability`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            providerId,
            businessHours,
            blockedDates,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to save availability");

      toast({
        title: "Success",
        description: "Availability updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save availability",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (provider: Provider) => {
    setFormData({
      name: provider.name,
      email: provider.email,
      phone: provider.phone,
      speciality: provider.speciality,
      services: provider.services || [],
    });
    setEditingId(provider._id || null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this provider?")) return;

    try {
      const response = await fetch(`/api/providers/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete provider");

      toast({
        title: "Success",
        description: "Provider deleted successfully",
      });
      fetchProviders();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete provider",
        variant: "destructive",
      });
    }
  };

  const handleHourChange = (dayIndex: number, field: string, value: any) => {
    const newHours = [...businessHours];
    newHours[dayIndex] = { ...newHours[dayIndex], [field]: value };
    setBusinessHours(newHours);
  };

  const addBlockedDate = () => {
    if (newBlockedDate && !blockedDates.includes(newBlockedDate)) {
      setBlockedDates([...blockedDates, newBlockedDate]);
      setNewBlockedDate("");
    }
  };

  const removeBlockedDate = (date: string) => {
    setBlockedDates(blockedDates.filter((d) => d !== date));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2">
        <CardHeader className="sticky top-0 bg-background border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle>Provider Management</CardTitle>
            <CardDescription>Create and manage healthcare providers</CardDescription>
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
          {!showForm ? (
            <>
              <Button
                onClick={() => {
                  setFormData({
                    name: "",
                    email: "",
                    phone: "",
                    speciality: "",
                    services: [],
                  });
                  setEditingId(null);
                  setShowForm(true);
                }}
                className="mb-6 bg-primary hover:bg-primary/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Provider
              </Button>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading providers...
                </div>
              ) : providers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No providers yet. Create one to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {providers.map((provider) => (
                    <div key={provider._id}>
                      <div className="p-4 border border-border rounded-lg flex items-start justify-between hover:bg-muted/50 transition">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {provider.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {provider.speciality}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {provider.email} • {provider.phone}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (expandedId === provider._id) {
                                setExpandedId(null);
                              } else {
                                setExpandedId(provider._id || null);
                                fetchAvailability(provider._id!);
                              }
                            }}
                          >
                            <Clock className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(provider)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(provider._id!)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {expandedId === provider._id && availability && (
                        <div className="mt-3 p-4 border border-border rounded-lg bg-muted/30 space-y-4">
                          <h4 className="font-semibold text-foreground">
                            Business Hours
                          </h4>
                          <div className="space-y-2">
                            {businessHours.map((hour, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                <label className="flex items-center gap-2 min-w-24">
                                  <input
                                    type="checkbox"
                                    checked={hour.isOpen}
                                    onChange={(e) =>
                                      handleHourChange(
                                        idx,
                                        "isOpen",
                                        e.target.checked
                                      )
                                    }
                                    className="rounded border-border cursor-pointer"
                                  />
                                  <span className="text-sm text-foreground">
                                    {DAYS[hour.dayOfWeek]}
                                  </span>
                                </label>
                                {hour.isOpen && (
                                  <>
                                    <Input
                                      type="time"
                                      value={hour.startTime}
                                      onChange={(e) =>
                                        handleHourChange(
                                          idx,
                                          "startTime",
                                          e.target.value
                                        )
                                      }
                                      className="border-border w-24 text-sm"
                                    />
                                    <span className="text-muted-foreground">
                                      to
                                    </span>
                                    <Input
                                      type="time"
                                      value={hour.endTime}
                                      onChange={(e) =>
                                        handleHourChange(
                                          idx,
                                          "endTime",
                                          e.target.value
                                        )
                                      }
                                      className="border-border w-24 text-sm"
                                    />
                                  </>
                                )}
                              </div>
                            ))}
                          </div>

                          <div>
                            <h4 className="font-semibold text-foreground mb-3">
                              Blocked Dates (Holidays/Vacation)
                            </h4>
                            <div className="flex gap-2 mb-3">
                              <Input
                                type="date"
                                value={newBlockedDate}
                                onChange={(e) =>
                                  setNewBlockedDate(e.target.value)
                                }
                                className="border-border flex-1"
                              />
                              <Button onClick={addBlockedDate} variant="outline">
                                Add
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {blockedDates.map((date) => (
                                <div
                                  key={date}
                                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm flex items-center gap-2"
                                >
                                  {new Date(date).toLocaleDateString()}
                                  <button
                                    onClick={() => removeBlockedDate(date)}
                                    className="cursor-pointer hover:opacity-75"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <Button
                            onClick={() =>
                              handleSaveAvailability(provider._id!)
                            }
                            className="w-full bg-primary hover:bg-primary/90 text-white"
                          >
                            Save Availability
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">
                {editingId ? "Edit Provider" : "New Provider"}
              </h3>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Dr. Sarah Smith"
                  className="border-border"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Email *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@clinic.com"
                  className="border-border"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Phone
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+1 (555) 123-4567"
                  className="border-border"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Speciality
                </label>
                <Input
                  value={formData.speciality}
                  onChange={(e) =>
                    setFormData({ ...formData, speciality: e.target.value })
                  }
                  placeholder="e.g., General Medicine"
                  className="border-border"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProvider}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                >
                  {editingId ? "Update" : "Create"} Provider
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

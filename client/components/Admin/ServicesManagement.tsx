import { useState, useEffect } from "react";
import { Service, CustomField } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit2, Plus, X } from "lucide-react";

interface ServicesManagementProps {
  onClose: () => void;
}

export default function ServicesManagement({ onClose }: ServicesManagementProps) {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [token] = useState(() => localStorage.getItem("authToken") || "");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: 30,
    providers: [] as string[],
    customFields: [] as CustomField[],
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/services");
      const data = await response.json();
      setServices(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch services",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Service name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = editingId ? `/api/services/${editingId}` : "/api/services";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save service");

      toast({
        title: "Success",
        description: `Service ${editingId ? "updated" : "created"} successfully`,
      });

      setFormData({
        name: "",
        description: "",
        duration: 30,
        providers: [],
        customFields: [],
      });
      setEditingId(null);
      setShowForm(false);
      fetchServices();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save service",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (service: Service) => {
    setFormData({
      name: service.name,
      description: service.description,
      duration: service.duration,
      providers: service.providers || [],
      customFields: service.customFields || [],
    });
    setEditingId(service._id || null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      const response = await fetch(`/api/services/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete service");

      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
      fetchServices();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      });
    }
  };

  const handleAddField = () => {
    setFormData((prev) => ({
      ...prev,
      customFields: [
        ...prev.customFields,
        {
          name: "",
          type: "text",
          required: false,
          order: prev.customFields.length,
        },
      ],
    }));
  };

  const handleRemoveField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index),
    }));
  };

  const handleFieldChange = (index: number, key: string, value: any) => {
    setFormData((prev) => {
      const newFields = [...prev.customFields];
      newFields[index] = { ...newFields[index], [key]: value };
      return { ...prev, customFields: newFields };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2">
        <CardHeader className="sticky top-0 bg-background border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle>Services Management</CardTitle>
            <CardDescription>Create and manage appointment services</CardDescription>
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
                    description: "",
                    duration: 30,
                    providers: [],
                    customFields: [],
                  });
                  setEditingId(null);
                  setShowForm(true);
                }}
                className="mb-6 bg-primary hover:bg-primary/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Service
              </Button>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading services...
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No services yet. Create one to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {services.map((service) => (
                    <div
                      key={service._id}
                      className="p-4 border border-border rounded-lg flex items-start justify-between hover:bg-muted/50 transition"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {service.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {service.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Duration: {service.duration} min • Providers:{" "}
                          {service.providers?.length || 0} • Fields:{" "}
                          {service.customFields?.length || 0}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(service)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(service._id!)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">
                {editingId ? "Edit Service" : "New Service"}
              </h3>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Service Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., General Consultation"
                  className="border-border"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe this service"
                  className="border-border"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Duration (minutes)
                </label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration: parseInt(e.target.value) || 30,
                    })
                  }
                  min="15"
                  step="15"
                  className="border-border"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-foreground">
                    Custom Fields
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddField}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Field
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.customFields.map((field, index) => (
                    <div
                      key={index}
                      className="p-3 border border-border rounded-lg space-y-2"
                    >
                      <div className="flex gap-2">
                        <Input
                          placeholder="Field name"
                          value={field.name}
                          onChange={(e) =>
                            handleFieldChange(index, "name", e.target.value)
                          }
                          className="flex-1 border-border text-sm"
                        />
                        <select
                          value={field.type}
                          onChange={(e) =>
                            handleFieldChange(index, "type", e.target.value)
                          }
                          className="px-3 py-2 border border-border rounded-md text-sm bg-background"
                        >
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                          <option value="textarea">Textarea</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="select">Select</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveField(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            handleFieldChange(
                              index,
                              "required",
                              e.target.checked
                            )
                          }
                          className="rounded border-border cursor-pointer"
                        />
                        <span className="text-sm text-muted-foreground">
                          Required
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
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
                  onClick={handleSave}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                >
                  {editingId ? "Update" : "Create"} Service
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

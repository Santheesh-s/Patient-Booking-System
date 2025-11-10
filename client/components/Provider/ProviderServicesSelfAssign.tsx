import { useEffect, useState } from "react";
import { Service } from "@shared/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react"
interface Props {
  providerId: string;
  onClose: () => void;
}

export default function ProviderServicesSelfAssign({ providerId, onClose }: Props) {
  const { toast } = useToast();
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("authToken") || "";

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [srvRes, prvRes] = await Promise.all([
          fetch("/api/services"),
          fetch(`/api/providers/${providerId}`)
        ]);
        const services = srvRes.ok ? await srvRes.json() : [];
        setAllServices(services);
        if (prvRes.ok) {
          const provider = await prvRes.json();
          setSelected(provider?.services || []);
        }
      } catch {
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [providerId, toast]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    try {
      const res = await fetch(`/api/providers/${providerId}/services/self`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ services: selected })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast({ title: "Updated", description: "Your services were updated successfully" });
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to update", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-2 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage My Services</CardTitle>
            <CardDescription>Select services you can perform</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : allServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services available.</p>
          ) : (
            <div className="space-y-2">
              {allServices.map((s) => (
                <label
                  key={s._id}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${
                    selected.includes(s._id!) ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.includes(s._id!)}
                    onChange={() => toggle(s._id!)}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Duration: {s.duration} min</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90 text-white" onClick={save} disabled={loading}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
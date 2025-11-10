import { useEffect, useState } from "react";
import { Service } from "@shared/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Props {
  providerId: string;
  onClose: () => void;
}

export default function ProviderServicesList({ providerId, onClose }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [providerRes, servicesRes] = await Promise.all([
          fetch(`/api/providers/${providerId}`),
          fetch(`/api/services`)
        ]);
        const provider = providerRes.ok ? await providerRes.json() : null;
        const allServices: Service[] = servicesRes.ok ? await servicesRes.json() : [];
        const assignedIds = new Set(provider?.services || []);
        setServices(allServices.filter(s => s._id && assignedIds.has(s._id)));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [providerId]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-2 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Services</CardTitle>
            <CardDescription>Assigned to your provider profile</CardDescription>
          </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services assigned.</p>
          ) : (
            <div className="space-y-3">
              {services.map(s => (
                <div key={s._id} className="p-4 border rounded-lg border-border bg-muted/40">
                  <p className="font-semibold text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Duration: {s.duration} min • Fields: {s.customFields?.length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {s.description}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="pt-2">
            <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

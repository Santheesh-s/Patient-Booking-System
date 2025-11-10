import { Service } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface ServiceSelectorProps {
  services: Service[];
  selectedService: Service | null;
  onSelectService: (service: Service) => void;
  isLoading: boolean;
}

export default function ServiceSelector({
  services,
  selectedService,
  onSelectService,
  isLoading,
}: ServiceSelectorProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No services available at the moment. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {services.map((service) => (
        <Card
          key={service._id}
          className={`cursor-pointer transition-all border-2 ${
            selectedService?._id === service._id
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/30"
          }`}
          onClick={() => onSelectService(service)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{service.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {service.description}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Duration: {service.duration} minutes
                </p>
              </div>
              {selectedService?._id === service._id && (
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

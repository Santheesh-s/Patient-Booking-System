import { Provider } from "@shared/types";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

interface ProviderSelectorProps {
  providers: Provider[];
  selectedProvider: Provider | null;
  onSelectProvider: (provider: Provider) => void;
  isLoading: boolean;
}

export default function ProviderSelector({
  providers,
  selectedProvider,
  onSelectProvider,
  isLoading,
}: ProviderSelectorProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No providers available for this service.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <Card
          key={provider._id}
          className={`cursor-pointer transition-all border-2 ${
            selectedProvider?._id === provider._id
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/30"
          }`}
          onClick={() => onSelectProvider(provider)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{provider.name}</h3>
                <p className="text-sm text-muted-foreground">{provider.speciality}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {provider.email}
                </p>
              </div>
              {selectedProvider?._id === provider._id && (
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { AlertTriangle, Phone } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function EmergencyAlert() {
  return (
    <Alert variant="destructive" className="mx-4 md:mx-8 my-4 border-2">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="text-lg font-bold">Medical Emergency Detected</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>
          Based on your symptoms, you may need immediate medical attention. 
          Please contact emergency services right away.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" asChild>
            <a href="tel:911" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call 911 (US)
            </a>
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <a href="tel:108" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call 108 (India)
            </a>
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <a href="tel:999" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call 999 (UK)
            </a>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
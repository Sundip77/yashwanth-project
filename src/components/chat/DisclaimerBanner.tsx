import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DisclaimerBanner() {
  return (
    <div className="mx-4 md:mx-8 mt-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-full bg-muted/50 border-muted-foreground/20 hover:bg-muted/70"
          >
            [!]
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Medical Disclaimer
            </DialogTitle>
            <DialogDescription className="text-left">
              This AI provides general health information only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your physician for medical concerns.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
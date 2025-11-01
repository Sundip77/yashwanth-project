import { Activity, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ChatHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex items-center justify-between px-4 md:px-8 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="md:hidden" />
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-semibold text-lg text-foreground">Health Assistant</h1>
            <p className="text-xs text-muted-foreground">AI-powered medical guidance</p>
          </div>
        </div>

        <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Info className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h3 className="font-semibold">About MediShield AI</h3>
                <p className="text-sm text-muted-foreground">
                  This AI assistant provides health information for educational purposes. 
                  Always consult healthcare professionals for medical decisions.
                </p>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    <strong>Emergency:</strong> Call 911 (US), 108 (India), or your local emergency number
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
      </div>
    </header>
  );
}
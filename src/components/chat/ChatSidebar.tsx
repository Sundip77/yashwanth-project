import { Plus, History, Settings, LogOut, Moon, Sun, Languages, Activity, ChevronLeft, ChevronRight, Brain } from "lucide-react";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ConversationList } from "./ConversationList";
import { LanguageSelector } from "./LanguageSelector";
import { MemoryManager } from "./MemoryManager";

export function ChatSidebar() {
  const { open, setOpen } = useSidebar();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
      return;
    }
    navigate("/auth");
    toast.success("Signed out successfully");
  };

  const handleNewChat = () => {
    navigate("/");
  };

  const handleToggleSidebar = () => {
    setOpen(!open);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer transition-all duration-200"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleToggleSidebar}
          >
            {isHovered ? (
              open ? (
                <ChevronLeft className="h-6 w-6 text-primary" />
              ) : (
                <ChevronRight className="h-6 w-6 text-primary" />
              )
            ) : (
              <Activity className="h-6 w-6 text-primary" />
            )}
            {open && (
              <div>
                <h1 className="text-lg font-bold text-sidebar-foreground">MediShield</h1>
                <p className="text-xs text-muted-foreground">AI Health Assistant</p>
              </div>
            )}
          </div>
          {open && <SidebarTrigger className="ml-auto" />}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* New Chat Button */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild onClick={handleNewChat}>
                  <Button variant="default" className="w-full justify-start gap-2">
                    <Plus className="h-4 w-4" />
                    {open && <span>New Chat</span>}
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Conversation History */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <History className="h-4 w-4" />
            {open && <span>Recent Chats</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <ScrollArea className="h-[calc(100vh-400px)]">
              <ConversationList collapsed={!open} />
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Language Selector */}
        {open && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              <span>Language</span>
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <LanguageSelector />
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Memory Manager */}
        {open && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span>Memories</span>
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <MemoryManager />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          {/* Theme Toggle */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                {open && <span>Toggle Theme</span>}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Sign Out */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                {open && <span>Sign Out</span>}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
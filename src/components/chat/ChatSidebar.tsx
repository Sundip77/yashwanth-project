import { Plus, History, LogOut, Moon, Sun, Languages, Activity, Brain, PanelLeft } from "lucide-react";
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
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarResizeHandle } from "@/components/ui/sidebar-resize-handle";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ConversationList } from "./ConversationList";
import { LanguageSelector } from "./LanguageSelector";
import { MemoryManager } from "./MemoryManager";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ChatSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";

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
    navigate("/chat");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarRail />
      <SidebarResizeHandle />
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <div className="flex items-center justify-between gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={toggleSidebar}
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 shrink-0">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  {!isCollapsed && (
                    <div className="min-w-0">
                      <h1 className="text-lg font-bold text-sidebar-foreground truncate">MediShield</h1>
                      <p className="text-xs text-muted-foreground truncate">AI Health Assistant</p>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>MediShield - Click to expand</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSidebar();
                  }}
                >
                  <PanelLeft className="h-4 w-4" />
                  <span className="sr-only">Toggle Sidebar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{isCollapsed ? "Expand" : "Collapse"} Sidebar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-col gap-2">
        {/* New Chat Button */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton 
                        onClick={handleNewChat}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        tooltip={isCollapsed ? "New Chat" : undefined}
                      >
                        <Plus className="h-4 w-4 shrink-0" />
                        <span className={cn(isCollapsed && "sr-only")}>New Chat</span>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right">
                        <p>New Chat</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Conversation History */}
        <SidebarGroup className="flex-1 min-h-0">
          {!isCollapsed && (
            <SidebarGroupLabel className="flex items-center gap-2 px-2">
              <History className="h-4 w-4 shrink-0" />
              <span>Recent Chats</span>
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <ConversationList collapsed={isCollapsed} />
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Language Selector */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2 px-2">
              <Languages className="h-4 w-4 shrink-0" />
              <span>Language</span>
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <LanguageSelector />
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Memory Manager */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2 px-2">
              <Brain className="h-4 w-4 shrink-0" />
              <span>Memories</span>
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <MemoryManager collapsed={false} />
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Collapsed Icons */}
        {isCollapsed && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <LanguageSelector collapsed={true} />
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full">
                          <MemoryManager collapsed={true} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Manage Memories</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          {/* Theme Toggle */}
          <SidebarMenuItem>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton 
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    tooltip={isCollapsed ? "Toggle Theme" : undefined}
                  >
                    {theme === "light" || !theme ? (
                      <Moon className="h-4 w-4 shrink-0" />
                    ) : (
                      <Sun className="h-4 w-4 shrink-0" />
                    )}
                    <span className={cn(isCollapsed && "sr-only")}>Toggle Theme</span>
                  </SidebarMenuButton>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Toggle Theme</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </SidebarMenuItem>

          {/* Sign Out */}
          <SidebarMenuItem>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton 
                    onClick={handleSignOut}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    tooltip={isCollapsed ? "Sign Out" : undefined}
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span className={cn(isCollapsed && "sr-only")}>Sign Out</span>
                  </SidebarMenuButton>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Sign Out</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

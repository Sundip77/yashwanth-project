"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function SidebarResizeHandle() {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(200, Math.min(500, startWidthRef.current + diff));
      
      // Find all sidebar elements
      const sidebarContainer = document.querySelector('.group.peer') as HTMLElement;
      const sidebarFixed = sidebarContainer?.querySelector('.fixed') as HTMLElement;
      const sidebarSpacer = sidebarContainer?.querySelector('.relative') as HTMLElement;
      
      if (sidebarFixed && sidebarSpacer) {
        // Update CSS variable
        const root = document.documentElement;
        root.style.setProperty('--sidebar-width', `${newWidth}px`);
        
        // Update both elements directly
        sidebarFixed.style.width = `${newWidth}px`;
        sidebarSpacer.style.width = `${newWidth}px`;
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (!isDragging) {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const sidebarFixed = document.querySelector('.group.peer .fixed') as HTMLElement;
    if (!sidebarFixed) return;

    const currentWidth = sidebarFixed.offsetWidth;
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidth;
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        "absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:w-1.5 hover:bg-primary/30 transition-all z-30 group",
        isDragging && "bg-primary/50 w-1.5"
      )}
      style={{ 
        zIndex: 1000,
        touchAction: 'none'
      }}
    >
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-0.5 h-12 bg-border rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}


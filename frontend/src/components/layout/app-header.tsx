"use client"

import { Bell, Search, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"

export interface AppHeaderProps {
  mode?: 'dashboard' | 'organization'
  organizationName?: string
  onSettingsClick?: () => void
  showSettings?: boolean
}

export function AppHeader({ 
  mode = 'dashboard',
  organizationName,
  onSettingsClick,
  showSettings = false 
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-md">
      
      {/* 🟢 Mobile Sidebar Trigger - Hidden on desktop */}
      <div className="flex items-center gap-2 md:hidden">
        <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
        <span className="text-lg font-bold">OmniTask</span>
      </div>

      {/* 🟢 Desktop Search */}
      <div className="hidden md:flex flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder={mode === 'organization' ? `Search ${organizationName || 'workspace'}...` : "Search workspaces..."} 
          className="w-full h-11 pl-10 text-base rounded-full bg-muted/50 border-transparent hover:border-border focus-visible:ring-2 focus-visible:ring-primary/20 transition-all shadow-none"
        />
      </div>

      {/* 🟢 Right Actions */}
      <div className="flex items-center gap-3 ml-auto">
        {showSettings && onSettingsClick && (
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-full" onClick={onSettingsClick}>
            <Settings className="h-5 w-5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-full">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
      
    </header>
  )
}
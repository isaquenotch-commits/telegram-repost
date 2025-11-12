'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { Menu, PanelLeftClose } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar 
        isOpen={sidebarOpen} 
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 overflow-auto relative">
        {/* Botão hamburger para abrir sidebar - mobile */}
        {!sidebarOpen && (
          <div className="lg:hidden fixed top-3 left-3 z-30">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="h-10 w-10 bg-background/80 backdrop-blur-md border-border/50 shadow-lg hover:bg-background/90 transition-all"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        )}
        {/* Botão toggle sidebar - desktop */}
        <div className="hidden lg:block fixed top-4 left-4 z-30">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-10 w-10 bg-background/80 backdrop-blur-md border-border/50 shadow-lg hover:bg-background/90 transition-all"
          >
            {sidebarCollapsed ? (
              <Menu className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
        </div>
        {children}
      </main>
    </div>
  )
}


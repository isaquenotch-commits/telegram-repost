'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Hash, Moon, Sun, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/ThemeProvider'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Canais', href: '/canais', icon: Hash },
]

interface SidebarProps {
  isOpen: boolean
  isCollapsed?: boolean
  onClose: () => void
  onToggle?: () => void
}

export default function Sidebar({ isOpen, isCollapsed = false, onClose, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border/50 flex flex-col transition-all duration-300 ease-in-out shadow-xl",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "lg:w-16" : "w-64 lg:w-64"
        )}
      >
        <div className="p-4 border-b border-sidebar-border/50">
          <div className="flex items-center justify-between">
            <h1 className={cn(
              "text-lg font-bold text-sidebar-foreground transition-opacity",
              isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}>
              Bot Repost
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleTheme()
                }}
                className="h-8 w-8 hover:bg-sidebar-accent/50 transition-colors"
                title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                type="button"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-sidebar-foreground" />
                ) : (
                  <Moon className="h-4 w-4 text-sidebar-foreground" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 lg:hidden hover:bg-sidebar-accent/50"
              >
                <X className="h-4 w-4 text-sidebar-foreground" />
              </Button>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md transition-all text-sm group",
                  isActive
                    ? "bg-sidebar-accent/80 backdrop-blur-sm text-sidebar-accent-foreground font-medium shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className={cn(
                  "transition-opacity",
                  isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                )}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}


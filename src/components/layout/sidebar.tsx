'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/use-auth'
import type { UserRole } from '@/types/database'
import {
  LayoutDashboard, Users, Ruler, ShoppingBag, FileText,
  CreditCard, Truck, UserCheck, Wrench, Package,
  BarChart3, Bell, Settings, Scissors, ChevronRight,
  LogOut, Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: UserRole[]
  badge?: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Users, roles: ['admin', 'manager', 'receptionist'] },
  { label: 'Measurements', href: '/measurements', icon: Ruler, roles: ['admin', 'manager', 'receptionist'] },
  { label: 'Orders', href: '/orders', icon: ShoppingBag },
  { label: 'Billing', href: '/billing', icon: FileText, roles: ['admin', 'manager', 'accountant'] },
  { label: 'Payments', href: '/payments', icon: CreditCard, roles: ['admin', 'manager', 'accountant', 'receptionist'] },
  { label: 'Deliveries', href: '/deliveries', icon: Truck, roles: ['admin', 'manager', 'receptionist'] },
  { label: 'Employees', href: '/employees', icon: UserCheck, roles: ['admin', 'manager'] },
  { label: 'Services', href: '/services', icon: Wrench, roles: ['admin', 'manager'] },
  { label: 'Inventory', href: '/inventory', icon: Package, roles: ['admin', 'manager'] },
  { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'manager', 'accountant'] },
  { label: 'Notifications', href: '/notifications', icon: Bell, roles: ['admin', 'manager'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] },
]

interface SidebarProps {
  collapsed?: boolean
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()

  const filteredItems = navItems.filter(item =>
    !item.roles || !profile || item.roles.includes(profile.role)
  )

  return (
    <div className={cn(
      'flex flex-col h-full bg-sidebar border-r border-border transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 p-4 border-b border-border',
        collapsed && 'justify-center'
      )}>
        <div className="flex-shrink-0 p-2 bg-primary rounded-lg">
          <Scissors className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-bold text-foreground text-lg leading-tight">TailorMS</span>
            <p className="text-xs text-muted-foreground">Management System</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const navLink = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center px-2'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs">{item.badge}</Badge>
                    )}
                  </>
                )}
              </Link>
            )

            if (collapsed) {
              return (
                <li key={item.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                </li>
              )
            }
            return <li key={item.href}>{navLink}</li>
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className={cn(
        'p-3 border-t border-border',
        collapsed ? 'flex flex-col items-center gap-2' : ''
      )}>
        {profile && !collapsed && (
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-default mb-2">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile.full_name}</p>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
              </div>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className={cn(
            'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
            !collapsed && 'w-full justify-start gap-2'
          )}
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && 'Sign Out'}
        </Button>
      </div>
    </div>
  )
}

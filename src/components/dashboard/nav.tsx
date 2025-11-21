'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FileText,
  FileSignature,
  Folder,
  Settings,
  Shield,
  BarChart3,
} from 'lucide-react'

const navItems = [
  {
    key: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    key: 'documents',
    href: '/dashboard/documents',
    icon: FileText,
  },
  {
    key: 'folders',
    href: '/dashboard/folders',
    icon: Folder,
  },
  {
    key: 'signatures',
    href: '/dashboard/signatures',
    icon: FileSignature,
  },
  {
    key: 'users',
    href: '/dashboard/users',
    icon: Users,
  },
  {
    key: 'roles',
    href: '/dashboard/roles',
    icon: Shield,
  },
  {
    key: 'reports',
    href: '/dashboard/reports',
    icon: BarChart3,
  },
  {
    key: 'settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function DashboardNav() {
  const pathname = usePathname()
  const t = useTranslations('navigation')

  return (
    <nav className="w-64 border-r bg-gray-50 p-4">
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-gray-200 hover:text-gray-900'
              )}
            >
              <Icon className="h-5 w-5" />
              {t(item.key)}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

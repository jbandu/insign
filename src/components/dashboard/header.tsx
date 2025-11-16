'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut, Settings, User } from 'lucide-react'

interface DashboardHeaderProps {
  user: any
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="border-b bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-primary">Insign</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{user?.name || user?.email}</span>
          </div>

          <Button variant="ghost" size="sm" asChild>
            <a href="/dashboard/settings">
              <Settings className="h-4 w-4" />
            </a>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}

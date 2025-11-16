'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, Pencil, Trash2 } from 'lucide-react'
import { deleteRole } from '@/app/actions/roles'
import { useRouter } from 'next/navigation'

interface Role {
  id: string
  name: string
  description: string | null
  isSystem: boolean | null
  createdAt: Date | null
}

interface RolesListProps {
  roles: Role[]
}

export function RolesList({ roles }: RolesListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) {
      return
    }

    setDeletingId(roleId)
    const result = await deleteRole(roleId)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Failed to delete role')
    }
    setDeletingId(null)
  }

  if (roles.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No roles yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first custom role
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {roles.map((role) => (
        <div
          key={role.id}
          className="group rounded-lg border p-4 hover:border-primary hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Shield className="h-6 w-6 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{role.name}</h4>
                  {role.isSystem && (
                    <Badge variant="secondary" className="text-xs">
                      System
                    </Badge>
                  )}
                </div>
                {role.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {role.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {!role.isSystem && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Created {role.createdAt ? new Date(role.createdAt).toLocaleDateString() : 'N/A'}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/dashboard/roles/${role.id}/edit`)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(role.id)}
                  disabled={deletingId === role.id}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

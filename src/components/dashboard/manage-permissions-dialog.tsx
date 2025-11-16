'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  getDocumentPermissions,
  grantDocumentPermission,
  revokeDocumentPermission,
  updateDocumentPermission,
} from '@/app/actions/permissions'
import { Shield, Trash2, UserPlus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Permission {
  id: string
  documentId: string
  userId: string | null
  roleId: string | null
  permissionLevel: 'read' | 'write' | 'delete' | 'admin'
  expiresAt: Date | null
  grantedAt: Date | null
  user?: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  } | null
  role?: {
    id: string
    name: string
  } | null
  grantedByUser: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  }
}

interface ManagePermissionsDialogProps {
  documentId: string
  documentName: string
  children?: React.ReactNode
}

const PERMISSION_LEVELS = [
  { value: 'read', label: 'Read', description: 'Can view document' },
  { value: 'write', label: 'Write', description: 'Can view and edit document' },
  { value: 'delete', label: 'Delete', description: 'Can view, edit, and delete document' },
  { value: 'admin', label: 'Admin', description: 'Full access including permissions management' },
]

export function ManagePermissionsDialog({
  documentId,
  documentName,
  children,
}: ManagePermissionsDialogProps) {
  const [open, setOpen] = useState(false)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGrantForm, setShowGrantForm] = useState(false)

  // Grant form state
  const [grantType, setGrantType] = useState<'user' | 'role'>('user')
  const [userEmail, setUserEmail] = useState('')
  const [selectedPermissionLevel, setSelectedPermissionLevel] = useState<'read' | 'write' | 'delete' | 'admin'>('read')
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    if (open) {
      loadPermissions()
    }
  }, [open])

  const loadPermissions = async () => {
    setIsLoading(true)
    setError(null)
    const result = await getDocumentPermissions(documentId)
    if (result.success && result.data) {
      setPermissions(result.data as Permission[])
    } else {
      setError(result.error || 'Failed to load permissions')
    }
    setIsLoading(false)
  }

  const handleGrantPermission = async () => {
    if (!userEmail.trim() && grantType === 'user') {
      setError('User email is required')
      return
    }

    setIsLoading(true)
    setError(null)

    // Note: In a real implementation, we'd need to look up the user by email first
    // For now, this is a simplified version
    setError('This feature requires user lookup functionality to be implemented')
    setIsLoading(false)
  }

  const handleRevokePermission = async (permissionId: string) => {
    if (!confirm('Are you sure you want to revoke this permission?')) {
      return
    }

    setIsLoading(true)
    setError(null)
    const result = await revokeDocumentPermission(permissionId)

    if (result.success) {
      loadPermissions()
    } else {
      setError(result.error || 'Failed to revoke permission')
    }
    setIsLoading(false)
  }

  const getPermissionBadgeColor = (level: string) => {
    switch (level) {
      case 'read':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'write':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'delete':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatUserName = (user: Permission['user']) => {
    if (!user) return 'N/A'
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.email
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Shield className="h-4 w-4 mr-2" />
            Permissions
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Permissions - {documentName}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Grant Permission Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => setShowGrantForm(!showGrantForm)}
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Grant Permission
            </Button>
          </div>

          {/* Grant Permission Form */}
          {showGrantForm && (
            <div className="border rounded-lg p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
              <h3 className="text-sm font-medium">Grant New Permission</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Permission Type</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={grantType}
                    onChange={(e) => setGrantType(e.target.value as 'user' | 'role')}
                  >
                    <option value="user">User</option>
                    <option value="role">Role</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Permission Level</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={selectedPermissionLevel}
                    onChange={(e) => setSelectedPermissionLevel(e.target.value as any)}
                  >
                    {PERMISSION_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                {grantType === 'user' ? (
                  <div className="space-y-2">
                    <Label>User Email</Label>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <select className="w-full px-3 py-2 border rounded-md">
                      <option value="">Select a role...</option>
                      {/* Roles would be loaded dynamically */}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Expires At (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleGrantPermission} disabled={isLoading} size="sm">
                  Grant
                </Button>
                <Button
                  onClick={() => setShowGrantForm(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing Permissions */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Current Permissions ({permissions.length})</h3>

            {isLoading && permissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading permissions...</p>
            ) : permissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No permissions granted yet. Only the document owner has access.
              </p>
            ) : (
              <div className="space-y-2">
                {permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {permission.userId ? (
                          <span className="font-medium text-sm">
                            {formatUserName(permission.user)}
                          </span>
                        ) : (
                          <span className="font-medium text-sm flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {permission.role?.name || 'Unknown Role'}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPermissionBadgeColor(
                            permission.permissionLevel
                          )}`}
                        >
                          {permission.permissionLevel.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {permission.userId && permission.user && (
                          <span className="mr-3">{permission.user.email}</span>
                        )}
                        <span className="mr-3">
                          Granted by: {formatUserName(permission.grantedByUser)}
                        </span>
                        {permission.expiresAt && (
                          <span className="text-orange-600 dark:text-orange-400">
                            Expires: {new Date(permission.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokePermission(permission.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Permission Level Legend */}
          <div className="border-t pt-4">
            <h4 className="text-xs font-medium mb-2">Permission Levels:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {PERMISSION_LEVELS.map((level) => (
                <div key={level.value} className="flex items-start gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPermissionBadgeColor(
                      level.value
                    )}`}
                  >
                    {level.label.toUpperCase()}
                  </span>
                  <span className="text-muted-foreground">{level.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

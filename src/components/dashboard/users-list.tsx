'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pencil, Trash2, MoreVertical, Loader2 } from 'lucide-react'
import { deleteUser } from '@/app/actions/users'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  status: string | null
  createdAt: Date | null
  role?: {
    name: string
  } | null
}

interface UsersListProps {
  users: User[]
}

export function UsersList({ users }: UsersListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user)
    setConfirmDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return

    setDeletingId(userToDelete.id)
    setError(null)
    const result = await deleteUser(userToDelete.id)

    if (result.success) {
      setConfirmDeleteOpen(false)
      setUserToDelete(null)
      router.refresh()
    } else {
      setError(result.error || 'Failed to delete user')
    }
    setDeletingId(null)
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No users found</p>
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium">Email</th>
            <th className="pb-3 font-medium">Role</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Joined</th>
            <th className="pb-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map((user) => (
            <tr key={user.id} className="text-sm">
              <td className="py-3">
                {user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : 'N/A'}
              </td>
              <td className="py-3">{user.email}</td>
              <td className="py-3">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {user.role?.name || 'No Role'}
                </span>
              </td>
              <td className="py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    user.status === 'active'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-50 text-gray-700'
                  }`}
                >
                  {user.status || 'N/A'}
                </span>
              </td>
              <td className="py-3 text-muted-foreground">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </td>
              <td className="py-3">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/dashboard/users/${user.id}/edit`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(user)}
                    disabled={deletingId === user.id}
                  >
                    {deletingId === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <ConfirmDialog
      open={confirmDeleteOpen}
      onOpenChange={setConfirmDeleteOpen}
      title="Delete User"
      description={`Are you sure you want to delete ${userToDelete?.firstName} ${userToDelete?.lastName} (${userToDelete?.email})? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={handleDeleteConfirm}
      variant="destructive"
    />
  </>
  )
}

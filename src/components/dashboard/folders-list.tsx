'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Folder, Pencil, Trash2 } from 'lucide-react'
import { deleteFolder } from '@/app/actions/folders'
import { useRouter } from 'next/navigation'

interface Folder {
  id: string
  name: string
  path: string
  description: string | null
  createdAt: Date
}

interface FoldersListProps {
  folders: Folder[]
}

export function FoldersList({ folders }: FoldersListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? This will not delete documents inside.')) {
      return
    }

    setDeletingId(folderId)
    const result = await deleteFolder(folderId)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Failed to delete folder')
    }
    setDeletingId(null)
  }

  if (folders.length === 0) {
    return (
      <div className="text-center py-12">
        <Folder className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No folders yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Get started by creating your first folder
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="group relative rounded-lg border p-4 hover:border-primary hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Folder className="h-8 w-8 text-primary" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{folder.name}</h4>
                <p className="text-xs text-muted-foreground truncate">
                  {folder.path}
                </p>
                {folder.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {folder.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>{new Date(folder.createdAt).toLocaleDateString()}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/dashboard/folders/${folder.id}/edit`)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(folder.id)}
                disabled={deletingId === folder.id}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

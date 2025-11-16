'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getTags, createTag, updateTag, deleteTag } from '@/app/actions/tags'
import { TagBadge } from '@/components/ui/tag-badge'
import { Pencil, Trash2, Plus, Tags } from 'lucide-react'

interface Tag {
  id: string
  name: string
  color: string
  orgId: string
  createdBy: string
  createdAt: Date | null
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#6b7280', // gray
]

export function ManageTagsDialog({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadTags()
    }
  }, [open])

  const loadTags = async () => {
    setIsLoading(true)
    setError(null)
    const result = await getTags()
    if (result.success && result.data) {
      setTags(result.data as Tag[])
    } else {
      setError(result.error || 'Failed to load tags')
    }
    setIsLoading(false)
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      setError('Tag name is required')
      return
    }

    setIsLoading(true)
    setError(null)
    const result = await createTag({
      name: newTagName.trim(),
      color: newTagColor,
    })

    if (result.success) {
      setNewTagName('')
      setNewTagColor(PRESET_COLORS[0])
      loadTags()
    } else {
      setError(result.error || 'Failed to create tag')
    }
    setIsLoading(false)
  }

  const handleUpdateTag = async () => {
    if (!editingTag) return

    setIsLoading(true)
    setError(null)
    const result = await updateTag(editingTag.id, {
      name: editingTag.name,
      color: editingTag.color,
    })

    if (result.success) {
      setEditingTag(null)
      loadTags()
    } else {
      setError(result.error || 'Failed to update tag')
    }
    setIsLoading(false)
  }

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag? It will be removed from all documents.')) {
      return
    }

    setIsLoading(true)
    setError(null)
    const result = await deleteTag(tagId)

    if (result.success) {
      loadTags()
    } else {
      setError(result.error || 'Failed to delete tag')
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Tags className="h-4 w-4 mr-2" />
            Manage Tags
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Create New Tag */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="text-sm font-medium">Create New Tag</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tag-name">Tag Name</Label>
                <Input
                  id="tag-name"
                  placeholder="e.g., Urgent, Contract, Internal"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateTag()
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newTagColor === color ? 'border-black scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTagColor(color)}
                      aria-label={`Select ${color} color`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <Button onClick={handleCreateTag} disabled={isLoading || !newTagName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Tag
            </Button>
          </div>

          {/* Existing Tags */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Existing Tags ({tags.length})</h3>
            {isLoading && tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading tags...</p>
            ) : tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags created yet.</p>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    {editingTag?.id === tag.id ? (
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <Input
                            value={editingTag.name}
                            onChange={(e) =>
                              setEditingTag({ ...editingTag, name: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateTag()
                              } else if (e.key === 'Escape') {
                                setEditingTag(null)
                              }
                            }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              className={`w-6 h-6 rounded-full border transition-all ${
                                editingTag.color === color ? 'border-black scale-110' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => setEditingTag({ ...editingTag, color })}
                              aria-label={`Select ${color} color`}
                            />
                          ))}
                        </div>
                        <div className="col-span-2 flex gap-2">
                          <Button size="sm" onClick={handleUpdateTag} disabled={isLoading}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingTag(null)}
                            disabled={isLoading}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <TagBadge name={tag.name} color={tag.color} />
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTag(tag)}
                            disabled={isLoading}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTag(tag.id)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getTags, getDocumentTags, assignTagToDocument, removeTagFromDocument } from '@/app/actions/tags'
import { TagBadge } from '@/components/ui/tag-badge'
import { Plus, Check } from 'lucide-react'

interface DocumentTag {
  id: string
  name: string
  color: string
}

interface DocumentTagSelectorProps {
  documentId: string
  onTagsChange?: () => void
}

export function DocumentTagSelector({ documentId, onTagsChange }: DocumentTagSelectorProps) {
  const [open, setOpen] = useState(false)
  const [allTags, setAllTags] = useState<DocumentTag[]>([])
  const [documentTags, setDocumentTags] = useState<DocumentTag[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadTags()
    loadDocumentTags()
  }, [documentId])

  const loadTags = async () => {
    const result = await getTags()
    if (result.success && result.data) {
      setAllTags(result.data as DocumentTag[])
    }
  }

  const loadDocumentTags = async () => {
    const result = await getDocumentTags(documentId)
    if (result.success && result.data) {
      setDocumentTags(result.data as DocumentTag[])
    }
  }

  const handleAssignTag = async (tagId: string) => {
    setIsLoading(true)
    const result = await assignTagToDocument({ documentId, tagId })

    if (result.success) {
      loadDocumentTags()
      onTagsChange?.()
    } else {
      console.error('Failed to assign tag:', result.error)
    }
    setIsLoading(false)
  }

  const handleRemoveTag = async (tagId: string) => {
    setIsLoading(true)
    const result = await removeTagFromDocument(documentId, tagId)

    if (result.success) {
      loadDocumentTags()
      onTagsChange?.()
    } else {
      console.error('Failed to remove tag:', result.error)
    }
    setIsLoading(false)
  }

  const isTagAssigned = (tagId: string) => {
    return documentTags.some((t) => t.id === tagId)
  }

  const filteredTags = allTags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Display assigned tags */}
      {documentTags.map((tag) => (
        <TagBadge
          key={tag.id}
          name={tag.name}
          color={tag.color}
          size="sm"
          onRemove={() => handleRemoveTag(tag.id)}
        />
      ))}

      {/* Add tag button with dropdown */}
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          onClick={() => setOpen(!open)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Tag
        </Button>

        {open && (
          <div className="absolute top-full left-0 mt-1 w-[250px] bg-white dark:bg-gray-800 border rounded-md shadow-lg z-50 p-2">
            <div className="space-y-2">
              <Input
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8"
              />
              <div className="max-h-64 overflow-auto space-y-1">
                {filteredTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tags found.
                  </p>
                ) : (
                  filteredTags.map((tag) => {
                    const assigned = isTagAssigned(tag.id)
                    return (
                      <button
                        key={tag.id}
                        onClick={() => {
                          if (assigned) {
                            handleRemoveTag(tag.id)
                          } else {
                            handleAssignTag(tag.id)
                          }
                        }}
                        disabled={isLoading}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-sm">{tag.name}</span>
                        </div>
                        {assigned && <Check className="h-4 w-4" />}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

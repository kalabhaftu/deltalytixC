'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Edit2, Check, X, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TradeTag {
  id: string
  name: string
  color: string
}

interface TagManagerProps {
  isOpen: boolean
  onClose: () => void
  onRefresh?: () => void
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
]

export function TagManager({ isOpen, onClose, onRefresh }: TagManagerProps) {
  const [tags, setTags] = useState<TradeTag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0])
  const [isCreating, setIsCreating] = useState(false)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingColor, setEditingColor] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchTags()
    }
  }, [isOpen])

  const fetchTags = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/tags')
      if (!response.ok) throw new Error('Failed to fetch tags')
      const data = await response.json()
      setTags(data.tags || [])
    } catch (error) {
      console.error('Failed to fetch tags:', error)
      toast.error('Failed to load tags')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Tag name cannot be empty')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: selectedColor,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create tag')
      }

      const data = await response.json()
      setTags([...tags, data.tag])
      setNewTagName('')
      setSelectedColor(DEFAULT_COLORS[0])
      toast.success('Tag created successfully')
      onRefresh?.()
    } catch (error: any) {
      console.error('Failed to create tag:', error)
      toast.error(error.message || 'Failed to create tag')
    } finally {
      setIsCreating(false)
    }
  }

  const handleStartEdit = (tag: TradeTag) => {
    setEditingTagId(tag.id)
    setEditingName(tag.name)
    setEditingColor(tag.color)
  }

  const handleSaveEdit = async () => {
    if (!editingTagId) return
    if (!editingName.trim()) {
      toast.error('Tag name cannot be empty')
      return
    }

    try {
      const response = await fetch(`/api/tags/${editingTagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingName.trim(),
          color: editingColor,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update tag')
      }

      const data = await response.json()
      setTags(tags.map((t) => (t.id === editingTagId ? data.tag : t)))
      setEditingTagId(null)
      toast.success('Tag updated successfully')
      onRefresh?.()
    } catch (error: any) {
      console.error('Failed to update tag:', error)
      toast.error(error.message || 'Failed to update tag')
    }
  }

  const handleCancelEdit = () => {
    setEditingTagId(null)
    setEditingName('')
    setEditingColor('')
  }

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Delete this tag? It will be removed from all trades.')) {
      return
    }

    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete tag')

      setTags(tags.filter((t) => t.id !== tagId))
      toast.success('Tag deleted successfully')
      onRefresh?.()
    } catch (error) {
      console.error('Failed to delete tag:', error)
      toast.error('Failed to delete tag')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <DialogTitle>Manage Tags</DialogTitle>
          </div>
          <DialogDescription>
            Create and manage tags to categorize your trades
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create New Tag */}
          <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
            <h3 className="text-sm font-semibold">Create New Tag</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTag()
                }}
                className="flex-1"
              />
              <Button
                onClick={handleCreateTag}
                disabled={isCreating || !newTagName.trim()}
                size="sm"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      'w-8 h-8 rounded-md border-2 transition-all',
                      selectedColor === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:border-muted-foreground/50'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Existing Tags */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Your Tags ({tags.length})</h3>
            <ScrollArea className="h-[300px] border rounded-lg p-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : tags.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">
                    No tags yet. Create one above!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                    >
                      {editingTagId === tag.id ? (
                        <>
                          <div className="flex flex-wrap gap-1 mr-2">
                            {DEFAULT_COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => setEditingColor(color)}
                                className={cn(
                                  'w-5 h-5 rounded border',
                                  editingColor === color
                                    ? 'border-foreground ring-1 ring-foreground'
                                    : 'border-transparent'
                                )}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit()
                              if (e.key === 'Escape') handleCancelEdit()
                            }}
                            className="flex-1 h-8"
                          />
                          <Button
                            onClick={handleSaveEdit}
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge
                            style={{
                              backgroundColor: tag.color,
                              color: 'white',
                            }}
                            className="text-xs"
                          >
                            {tag.name}
                          </Badge>
                          <div className="flex-1" />
                          <Button
                            onClick={() => handleStartEdit(tag)}
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                          >
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteTag(tag.id)}
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


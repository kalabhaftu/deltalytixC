'use client'

import { useState } from 'react'
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
import { CircleNotch, Plus, Trash, PencilSimple, Check, X, Tag } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useTags } from '@/hooks/use-tags'

interface TagManagerProps {
  isOpen: boolean
  onClose: () => void
  onRefresh?: () => void
}

const DEFAULT_COLORS = [
  'hsl(var(--chart-1))', // blue
  'hsl(var(--chart-profit))', // green
  'hsl(var(--chart-4))', // amber
  'hsl(var(--chart-loss))', // red
  'hsl(var(--chart-2))', // purple
  'hsl(var(--chart-3))', // pink
  'hsl(var(--chart-5))', // cyan
  'hsl(var(--primary))', // lime
  'hsl(var(--muted-foreground))', // orange
  'hsl(var(--ring))', // indigo
]

export function TagManager({ isOpen, onClose, onRefresh }: TagManagerProps) {
  const { tags, isLoading, createTag, updateTag, deleteTag } = useTags()
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0])
  const [isCreating, setIsCreating] = useState(false)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingColor, setEditingColor] = useState('')

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Tag name cannot be empty')
      return
    }

    setIsCreating(true)
    try {
      await createTag(newTagName, selectedColor)
      setNewTagName('')
      setSelectedColor(DEFAULT_COLORS[0])
      toast.success('Tag created successfully')
      onRefresh?.()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create tag')
    } finally {
      setIsCreating(false)
    }
  }

  const handleStartEdit = (tag: { id: string; name: string; color: string }) => {
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
      await updateTag(editingTagId, editingName, editingColor)
      setEditingTagId(null)
      toast.success('Tag updated successfully')
      onRefresh?.()
    } catch (error: any) {
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
      await deleteTag(tagId)
      toast.success('Tag deleted successfully')
      onRefresh?.()
    } catch (error) {
      toast.error('Failed to delete tag')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" weight="light" />
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
                  <CircleNotch className="h-6 w-6 animate-spin text-muted-foreground" weight="light" />
                ) : (
                  <Plus className="h-4 w-4" weight="light" />
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
                  <CircleNotch className="h-6 w-6 animate-spin text-muted-foreground" weight="light" />
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
                            <Check className="h-4 w-4 text-profit" weight="light" />
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                          >
                            <X className="h-4 w-4 text-muted-foreground" weight="light" />
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
                            <PencilSimple className="h-4 w-4 text-muted-foreground" weight="light" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteTag(tag.id)}
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                          >
                            <Trash className="h-4 w-4 text-destructive" weight="light" />
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

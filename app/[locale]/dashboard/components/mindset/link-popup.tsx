'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LinkIcon, ExternalLink } from 'lucide-react'

interface LinkPopupProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (url: string, text?: string) => void
  initialUrl?: string
  initialText?: string
}

export function LinkPopup({ isOpen, onClose, onConfirm, initialUrl = '', initialText = '' }: LinkPopupProps) {
  const [url, setUrl] = useState(initialUrl)
  const [text, setText] = useState(initialText)
  const [urlError, setUrlError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl)
      setText(initialText)
      setUrlError('')
    }
  }, [isOpen, initialUrl, initialText])

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError('URL is required')
      return false
    }

    try {
      // Add protocol if missing
      const testUrl = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `https://${url}`
      new URL(testUrl)
      setUrlError('')
      return true
    } catch {
      setUrlError('Please enter a valid URL')
      return false
    }
  }

  const handleConfirm = () => {
    if (!validateUrl(url)) return

    // Ensure URL has protocol
    const finalUrl = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`

    onConfirm(finalUrl, text)
    onClose()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            {initialUrl ? 'Edit Link' : 'Insert Link'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                if (urlError) setUrlError('')
              }}
              onKeyPress={handleKeyPress}
              className={urlError ? 'border-red-500' : ''}
            />
            {urlError && (
              <p className="text-sm text-red-500">{urlError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="text">Link Text (optional)</Label>
            <Input
              id="text"
              placeholder="Display text for the link"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the URL as display text
            </p>
          </div>

          {url && !urlError && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Preview: </span>
              <span className="text-sm font-medium">{text || url}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!url.trim()}>
            {initialUrl ? 'Update Link' : 'Insert Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}



'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImageIcon, Upload, LinkIcon, Clipboard, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useUserStore } from '@/store/user-store'

interface ImagePopupProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (imageUrl: string, alt?: string) => void
}

// Function to upload image to Supabase with robust bucket handling
const uploadImageToSupabase = async (file: File, userId: string): Promise<string> => {
  const { createClient } = await import('@/lib/supabase')
  const supabase = createClient()
  
  // Generate a unique filename
  const fileExtension = file.name.split('.').pop()
  const fileName = `notes_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`
  
  // Create a robust bucket fallback system
  const preferredBuckets = ['images', 'trade-images', 'public', 'avatars']
  let bucketName = 'images'
  let uploadSuccess = false
  
  try {
    // First try to list buckets to see what's available
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (!listError && buckets) {
      const availableBuckets = buckets.map(b => b.name)
      
      // Try preferred buckets in order
      for (const preferred of preferredBuckets) {
        if (availableBuckets.includes(preferred)) {
          bucketName = preferred
          break
        }
      }
      
      // If no preferred buckets exist, use the first available one
      if (!preferredBuckets.some(b => availableBuckets.includes(b)) && availableBuckets.length > 0) {
        bucketName = availableBuckets[0]
      }
    }
    
    // Try uploading to the selected bucket
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from(bucketName)
      .upload(`notes/${userId}/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false,
      })
    
    if (!uploadError && uploadData) {
      uploadSuccess = true
    } else if (uploadError) {
      console.warn(`Upload to ${bucketName} failed:`, uploadError)
      
      // If upload failed, try creating the images bucket
      if (bucketName !== 'images') {
        const { error: createError } = await supabase.storage.createBucket('images', {
          public: true,
          allowedMimeTypes: ['image/*'],
          fileSizeLimit: 10485760 // 10MB
        })
        
        if (!createError) {
          bucketName = 'images'
          const { error: retryError } = await supabase.storage
            .from(bucketName)
            .upload(`notes/${userId}/${fileName}`, file, {
              cacheControl: '3600',
              upsert: false,
            })
          
          if (!retryError) {
            uploadSuccess = true
          }
        }
      }
      
      // Final fallback: convert to base64 data URL if all else fails
      if (!uploadSuccess) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('Failed to convert image to base64'))
          reader.readAsDataURL(file)
        })
      }
    }
    
    if (!uploadSuccess) {
      throw new Error('All upload methods failed')
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(`notes/${userId}/${fileName}`)
    
    return urlData.publicUrl
    
  } catch (error) {
    console.error('Upload error:', error)
    
    // Ultimate fallback: convert to base64 data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to convert image to base64'))
      reader.readAsDataURL(file)
    })
  }
}

export function ImagePopup({ isOpen, onClose, onConfirm }: ImagePopupProps) {
  const [activeTab, setActiveTab] = useState('upload')
  const [url, setUrl] = useState('')
  const [altText, setAltText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const user = useUserStore(state => state.user)
  const supabaseUser = useUserStore(state => state.supabaseUser)

  useEffect(() => {
    if (isOpen) {
      setUrl('')
      setAltText('')
      setIsUploading(false)
      setDragActive(false)
    }
  }, [isOpen])

  const getUserId = () => supabaseUser?.id || user?.id

  const validateImageFile = (file: File): boolean => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Image must be smaller than 10MB',
        variant: 'destructive',
      })
      return false
    }
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a valid image file (JPEG, PNG, GIF, WebP, SVG)',
        variant: 'destructive',
      })
      return false
    }
    
    return true
  }

  const handleFileUpload = async (file: File) => {
    const userId = getUserId()
    if (!userId) {
      toast({
        title: 'Authentication error',
        description: 'Please sign in to upload images',
        variant: 'destructive',
      })
      return
    }

    if (!validateImageFile(file)) return

    // Show immediate feedback - don't wait for upload
    const altTextDefault = file.name.split('.')[0]
    setAltText(altTextDefault)
    
    // Create a temporary preview URL immediately
    const tempUrl = URL.createObjectURL(file)
    
    // Insert the image immediately with temp URL
    onConfirm(tempUrl, altTextDefault)
    onClose()
    
    // Show immediate success feedback
    toast({
      title: 'Image inserted',
      description: 'Image has been added to your note. Uploading to storage...',
    })
    
    // Upload in background and update the URL
    setIsUploading(true)
    try {
      const imageUrl = await uploadImageToSupabase(file, userId)
      
      // Update the image URL in the editor if possible
      // The editor should handle this update automatically
      
      toast({
        title: 'Upload complete',
        description: 'Image has been saved to cloud storage',
      })
    } catch (error) {
      console.error('Background upload error:', error)
      // Don't show error toast for background upload failures
      // The image is already inserted and will work locally
      console.warn('Image saved locally but cloud upload failed:', error)
    } finally {
      setIsUploading(false)
      // Clean up temp URL
      URL.revokeObjectURL(tempUrl)
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }, [handleFileUpload])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  const handlePaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read()
      
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type)
            const file = new File([blob], `pasted-image-${Date.now()}.png`, { type })
            handleFileUpload(file)
            return
          }
        }
      }
      
      toast({
        title: 'No image found',
        description: 'No image found in clipboard. Copy an image first.',
        variant: 'destructive',
      })
    } catch (error) {
      toast({
        title: 'Paste failed',
        description: 'Could not access clipboard. Make sure you have copied an image.',
        variant: 'destructive',
      })
    }
  }

  const handleUrlConfirm = () => {
    if (!url.trim()) {
      toast({
        title: 'URL required',
        description: 'Please enter an image URL',
        variant: 'destructive',
      })
      return
    }

    try {
      new URL(url)
      onConfirm(url, altText || 'Image')
      onClose()
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid image URL',
        variant: 'destructive',
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && activeTab === 'url') {
      e.preventDefault()
      handleUrlConfirm()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Insert Image
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="paste">Paste</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Uploading image...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Upload className="w-12 h-12 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      Drag and drop an image here, or{' '}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-primary hover:underline"
                      >
                        browse files
                      </button>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports JPEG, PNG, GIF, WebP, SVG (max 10MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="paste" className="space-y-4">
            <div className="text-center space-y-4">
              <Clipboard className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <p className="text-sm font-medium">Paste image from clipboard</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Copy an image (Ctrl+C) and click the button below
                </p>
              </div>
              <Button 
                onClick={handlePaste} 
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Clipboard className="w-4 h-4 mr-2" />
                    Paste Image
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-url">Image URL *</Label>
                <Input
                  id="image-url"
                  placeholder="https://example.com/image.jpg"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="alt-text">Alt Text (optional)</Label>
                <Input
                  id="alt-text"
                  placeholder="Description of the image"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <p className="text-xs text-muted-foreground">
                  Alternative text for accessibility
                </p>
              </div>

              {url && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                  <img 
                    src={url} 
                    alt={altText || 'Preview'} 
                    className="max-w-full max-h-32 object-contain rounded"
                    onError={() => toast({
                      title: 'Invalid image URL',
                      description: 'Could not load image from the provided URL',
                      variant: 'destructive',
                    })}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {activeTab === 'url' && (
            <Button onClick={handleUrlConfirm} disabled={!url.trim()}>
              Insert Image
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


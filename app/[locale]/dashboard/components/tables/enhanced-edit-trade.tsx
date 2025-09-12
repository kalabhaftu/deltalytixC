'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Trade } from '@prisma/client'
import { Edit, Camera, X } from 'lucide-react'
import { useUserStore } from '@/store/user-store'

// Schema for limited editing (only notes, screenshots, links)
const editTradeSchema = z.object({
  comment: z.string().optional(),
  imageBase64: z.string().optional(),
  imageBase64Second: z.string().optional(),
  imageBase64Third: z.string().optional(),
  imageBase64Fourth: z.string().optional(),
  links: z.array(z.string().url()).optional(),
})

type EditTradeFormData = z.infer<typeof editTradeSchema>

interface EnhancedEditTradeProps {
  isOpen: boolean
  onClose: () => void
  trade: Trade | null
  onSave: (updatedTrade: Partial<Trade>) => Promise<void>
}

// File validation helpers
const validateImageFile = (file: File): void => {
  const maxSize = 5 * 1024 * 1024 // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  
  if (file.size > maxSize) {
    throw new Error('Image must be smaller than 5MB')
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG, and WebP images are allowed')
  }
}

// Generate a random 6-character alphanumeric ID
function generateShortId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const uploadImageToSupabase = async (file: File, userId: string, tradeId: string): Promise<string> => {
  const { createClient } = await import('@/lib/supabase')
  const supabase = createClient()
  
  // Generate a unique filename
  const fileExtension = file.name.split('.').pop()
  const fileName = `trades_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`
  
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
      .upload(`trades/${userId}/${tradeId}/${fileName}`, file, {
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
            .upload(`trades/${userId}/${tradeId}/${fileName}`, file, {
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
      .getPublicUrl(`trades/${userId}/${tradeId}/${fileName}`)
    
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

export default function EnhancedEditTrade({ 
  isOpen, 
  onClose, 
  trade, 
  onSave 
}: EnhancedEditTradeProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [additionalLinks, setAdditionalLinks] = useState<string[]>([])
  const [tradeId] = useState(() => {
    if (trade?.id?.includes('undefined')) {
      return generateShortId()
    }
    return trade?.id?.slice(0, 6) || generateShortId()
  })
  const { toast } = useToast()
  const user = useUserStore(state => state.user)
  const supabaseUser = useUserStore(state => state.supabaseUser)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<EditTradeFormData>({
    resolver: zodResolver(editTradeSchema),
    defaultValues: {
      comment: '',
      imageBase64: '',
      imageBase64Second: '',
      imageBase64Third: '',
      imageBase64Fourth: '',
    }
  })

  const watchedValues = watch()

  // Initialize form with trade data
  useEffect(() => {
    if (trade && isOpen) {
      reset({
        comment: trade.comment || '',
        imageBase64: trade.imageBase64 || '',
        imageBase64Second: trade.imageBase64Second || '',
        imageBase64Third: (trade as any).imageBase64Third || '',
        imageBase64Fourth: (trade as any).imageBase64Fourth || '',
      })

    }
  }, [trade, isOpen, reset])

  const handleImageUpload = async (field: 'imageBase64' | 'imageBase64Second' | 'imageBase64Third' | 'imageBase64Fourth', file: File) => {
    // Check for both user types - prioritize supabaseUser for auth, fallback to user.id
    const userId = supabaseUser?.id || user?.id
    
    if (!userId) {
      toast({
        title: 'Upload failed',
        description: 'User not authenticated. Please sign in again.',
        variant: 'destructive',
      })
      return
    }

    try {
      validateImageFile(file)
      
      // Create temporary URL for immediate display
      const tempUrl = URL.createObjectURL(file)
      setValue(field, tempUrl)
      
      // Show immediate success feedback
      toast({
        title: 'Image added',
        description: 'Image has been added. Uploading to storage...',
      })
      
      // Upload to Supabase in background
      try {
        const imageUrl = await uploadImageToSupabase(file, userId, tradeId)
        setValue(field, imageUrl) // Update with permanent URL
        
        toast({
          title: 'Upload complete',
          description: 'Image has been saved to cloud storage.',
        })
        
        // Clean up temp URL
        URL.revokeObjectURL(tempUrl)
      } catch (uploadError) {
        console.warn('Background upload failed, keeping local version:', uploadError)
        // Keep the temp URL - image will still work locally
      }
      
    } catch (error) {
      console.error('Image processing error:', error)
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to process image',
        variant: 'destructive',
      })
    }
  }

  const removeImage = (field: 'imageBase64' | 'imageBase64Second' | 'imageBase64Third' | 'imageBase64Fourth') => {
    setValue(field, '')
  }

  const addLink = () => {
    setAdditionalLinks(prev => [...prev, ''])
  }

  const updateLink = (index: number, value: string) => {
    setAdditionalLinks(prev => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }

  const removeLink = (index: number) => {
    setAdditionalLinks(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: EditTradeFormData) => {
    if (!trade) return

    setIsSubmitting(true)
    try {
      // Prepare the update data
      const updateData: Partial<Trade> = {
        comment: data.comment || null,
        imageBase64: data.imageBase64 || null,
        imageBase64Second: data.imageBase64Second || null,
        ...(data.imageBase64Third && { imageBase64Third: data.imageBase64Third }),
        ...(data.imageBase64Fourth && { imageBase64Fourth: data.imageBase64Fourth }),
      }

      // Call the save function
      await onSave(updateData)
      
      toast({
        title: 'Trade updated',
        description: 'Trade has been successfully updated.',
      })

      onClose()
    } catch (error) {
      console.error('Error updating trade:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update trade',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!trade) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="w-5 h-5 mr-2" />
              Edit Trade - {trade.instrument} {trade.side}
            </DialogTitle>
            <DialogDescription>
              Add notes and screenshots to enhance your trade analysis.
              Trade execution details cannot be modified.
            </DialogDescription>
          </DialogHeader>

          {/* Trade Summary (Read-only) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trade Summary (Read-only)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Date</Label>
                <p className="font-medium">{new Date(trade.entryDate).toLocaleDateString()}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">P&L</Label>
                <p className={`font-bold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${trade.pnl.toFixed(2)}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Entry → Close</Label>
                <p className="font-medium">{trade.entryPrice} → {trade.closePrice}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Quantity</Label>
                <p className="font-medium">{trade.quantity}</p>
              </div>
              {/* Close Reason (if available) */}
              {(trade as any).closeReason && (
                <div className="col-span-2">
                  <Label className="text-sm text-muted-foreground">Close Reason</Label>
                  <p className="font-medium capitalize">
                    {(trade as any).closeReason.replace(/[_-]/g, ' ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Trade Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trade Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="comment">Analysis & Reflections</Label>
                  <Textarea
                    {...register('comment')}
                    placeholder="Document your analysis, market conditions, and lessons learned from this trade..."
                    className="min-h-[200px] resize-none"
                    value={watchedValues.comment || ''}
                    onChange={(e) => setValue('comment', e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Document your analysis, market conditions, and lessons learned from this trade.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Screenshots */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Camera className="w-5 h-5 mr-2" />
                  Screenshots (Up to 4)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Screenshot */}
                  <div className="space-y-2">
                    <Label>Screenshot 1</Label>
                    <div className="relative">
                      <div className="border-2 border-dashed rounded-lg p-4 text-center aspect-video flex items-center justify-center min-h-[200px]">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="screenshot-1"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload('imageBase64', file)
                          }}
                        />
                        
                        {watchedValues.imageBase64 ? (
                          <div className="relative w-full h-full group">
                            <Image
                              src={watchedValues.imageBase64}
                              alt="Screenshot 1"
                              fill
                              className="object-cover rounded cursor-pointer"
                              onClick={() => setFullscreenImage(watchedValues.imageBase64!)}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              priority={false}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeImage('imageBase64')}
                                className="mr-2"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setFullscreenImage(watchedValues.imageBase64!)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <label
                            htmlFor="screenshot-1"
                            className="cursor-pointer flex flex-col items-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Camera className="w-8 h-8 mb-2" />
                            <span className="text-sm">Upload Screenshot 1</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Second Screenshot */}
                  <div className="space-y-2">
                    <Label>Screenshot 2</Label>
                    <div className="relative">
                      <div className="border-2 border-dashed rounded-lg p-4 text-center aspect-video flex items-center justify-center min-h-[200px]">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="screenshot-2"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload('imageBase64Second', file)
                          }}
                        />
                        
                        {watchedValues.imageBase64Second ? (
                          <div className="relative w-full h-full group">
                            <Image
                              src={watchedValues.imageBase64Second}
                              alt="Screenshot 2"
                              fill
                              className="object-cover rounded cursor-pointer"
                              onClick={() => setFullscreenImage(watchedValues.imageBase64Second!)}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              priority={false}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeImage('imageBase64Second')}
                                className="mr-2"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setFullscreenImage(watchedValues.imageBase64Second!)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <label
                            htmlFor="screenshot-2"
                            className="cursor-pointer flex flex-col items-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Camera className="w-8 h-8 mb-2" />
                            <span className="text-sm">Upload Screenshot 2</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Third Screenshot */}
                  <div className="space-y-2">
                    <Label>Screenshot 3</Label>
                    <div className="relative">
                      <div className="border-2 border-dashed rounded-lg p-4 text-center aspect-video flex items-center justify-center min-h-[200px]">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="screenshot-3"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload('imageBase64Third', file)
                          }}
                        />
                        
                        {watchedValues.imageBase64Third ? (
                          <div className="relative w-full h-full group">
                            <Image
                              src={watchedValues.imageBase64Third}
                              alt="Screenshot 3"
                              fill
                              className="object-cover rounded cursor-pointer"
                              onClick={() => setFullscreenImage(watchedValues.imageBase64Third!)}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              priority={false}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeImage('imageBase64Third')}
                                className="mr-2"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setFullscreenImage(watchedValues.imageBase64Third!)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <label
                            htmlFor="screenshot-3"
                            className="cursor-pointer flex flex-col items-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Camera className="w-8 h-8 mb-2" />
                            <span className="text-sm">Upload Screenshot 3</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Fourth Screenshot */}
                  <div className="space-y-2">
                    <Label>Screenshot 4</Label>
                    <div className="relative">
                      <div className="border-2 border-dashed rounded-lg p-4 text-center aspect-video flex items-center justify-center min-h-[200px]">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="screenshot-4"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload('imageBase64Fourth', file)
                          }}
                        />
                        
                        {watchedValues.imageBase64Fourth ? (
                          <div className="relative w-full h-full group">
                            <Image
                              src={watchedValues.imageBase64Fourth}
                              alt="Screenshot 4"
                              fill
                              className="object-cover rounded cursor-pointer"
                              onClick={() => setFullscreenImage(watchedValues.imageBase64Fourth!)}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              priority={false}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeImage('imageBase64Fourth')}
                                className="mr-2"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setFullscreenImage(watchedValues.imageBase64Fourth!)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <label
                            htmlFor="screenshot-4"
                            className="cursor-pointer flex flex-col items-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Camera className="w-8 h-8 mb-2" />
                            <span className="text-sm">Upload Screenshot 4</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Upload chart screenshots, trade setups, or market analysis images (JPG, PNG, max 5MB each).
                </p>
              </CardContent>
            </Card>



            {/* Form Actions */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Image 
              src={fullscreenImage} 
              alt="Fullscreen view" 
              fill
              className="object-contain"
              sizes="100vw"
              priority={true}
            />
          </div>
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-4 right-4"
            onClick={() => setFullscreenImage(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </>
  )
}

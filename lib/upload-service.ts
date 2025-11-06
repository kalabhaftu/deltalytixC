/**
 * Centralized upload service for handling media uploads
 * Fixes inconsistent bucket handling and provides robust fallbacks
 */

import { createClient } from '@/lib/supabase'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

export interface UploadOptions {
  userId: string
  folder: string // 'trades', 'notes', 'avatars'
  tradeId?: string
  maxSizeBytes?: number
  allowedTypes?: string[]
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024 // 10MB
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

export class MediaUploadService {
  private supabase = createClient()
  
  async uploadImage(file: File, options: UploadOptions): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file, options)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // Try Supabase storage first
      const supabaseResult = await this.uploadToSupabase(file, options)
      if (supabaseResult.success) {
        return supabaseResult
      }

      // Fallback to base64 if Supabase fails
      console.warn('Supabase upload failed, falling back to base64:', supabaseResult.error)
      return await this.convertToBase64(file)
      
    } catch (error) {
      console.error('Upload service error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      }
    }
  }

  private validateFile(file: File, options: UploadOptions): { valid: boolean; error?: string } {
    const maxSize = options.maxSizeBytes || DEFAULT_MAX_SIZE
    const allowedTypes = options.allowedTypes || DEFAULT_ALLOWED_TYPES

    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB` 
      }
    }

    if (!allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: `File type not supported. Allowed types: ${allowedTypes.join(', ')}` 
      }
    }

    return { valid: true }
  }

  private async uploadToSupabase(file: File, options: UploadOptions): Promise<UploadResult> {
    try {
      // Generate unique filename
      const fileExtension = file.name.split('.').pop() || 'jpg'
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substr(2, 9)
      const fileName = `${options.folder}_${timestamp}_${randomId}.${fileExtension}`

      // Create file path
      let filePath = `${options.folder}/${options.userId}/${fileName}`
      if (options.tradeId) {
        filePath = `${options.folder}/${options.userId}/${options.tradeId}/${fileName}`
      }

      // Try to get or create the appropriate bucket
      const bucketName = await this.ensureBucket()
      
      // Upload file
      const { error: uploadError, data } = await this.supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        return { success: false, error: uploadError.message }
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      return { success: true, url: urlData.publicUrl }

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Supabase upload failed' 
      }
    }
  }

  private async ensureBucket(): Promise<string> {
    try {
      // List existing buckets
      const { data: buckets, error } = await this.supabase.storage.listBuckets()
      
      if (error) {
        console.warn('Could not list buckets:', error.message)
        return 'images' // Default fallback
      }

      const existingBuckets = buckets?.map((b: any) => b.name) || []
      
      // Preferred bucket order
      const preferredBuckets = ['images', 'trade-images', 'public', 'avatars']
      
      // Find first existing preferred bucket
      for (const preferred of preferredBuckets) {
        if (existingBuckets.includes(preferred)) {
          return preferred
        }
      }

      // If no preferred bucket exists, try to create 'images'
      if (!existingBuckets.includes('images')) {
         const { error: createError } = await this.supabase.storage.createBucket('images')
        
        if (!createError) {
          return 'images'
        }
        
        console.warn('Could not create images bucket:', createError.message)
      }

      // Use first available bucket or default
      return existingBuckets[0] || 'images'
      
    } catch (error) {
      console.warn('Bucket handling error:', error)
      return 'images'
    }
  }

  private async convertToBase64(file: File): Promise<UploadResult> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      
      reader.onload = () => {
        resolve({ 
          success: true, 
          url: reader.result as string 
        })
      }
      
      reader.onerror = () => {
        resolve({ 
          success: false, 
          error: 'Failed to convert image to base64' 
        })
      }
      
      reader.readAsDataURL(file)
    })
  }
}

// Export singleton instance
export const uploadService = new MediaUploadService()



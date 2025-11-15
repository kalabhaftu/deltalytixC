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

      const supabaseResult = await this.uploadToSupabase(file, options)
      return supabaseResult
      
    } catch (error) {
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
      // Preserve original filename with uniqueness
      const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_') // Sanitize filename
      const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName
      const fileExtension = file.name.split('.').pop() || 'jpg'
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substr(2, 6)
      
      // Format: originalname_timestamp_randomid.ext
      // This preserves the original name while ensuring uniqueness
      const fileName = `${nameWithoutExt}_${timestamp}_${randomId}.${fileExtension}`

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
      const { data: buckets, error } = await this.supabase.storage.listBuckets()
      
      if (error) {
        return 'images'
      }

      const existingBuckets = buckets?.map((b: any) => b.name) || []
      const preferredBuckets = ['images', 'trade-images', 'public', 'avatars']
      
      for (const preferred of preferredBuckets) {
        if (existingBuckets.includes(preferred)) {
          return preferred
        }
      }

      if (!existingBuckets.includes('images')) {
         const { error: createError } = await this.supabase.storage.createBucket('images')
        
        if (!createError) {
          return 'images'
        }
      }

      return existingBuckets[0] || 'images'
      
    } catch (error) {
      return 'images'
    }
  }

  /* WebP Compression - Disabled
   * Enable when experiencing large image sizes
   * Recommended: Max 1920px, 95% quality, WebP format
   * Install: npm install browser-image-compression
   */
  
  // private async compressImage(file: File): Promise<File> {
  //   try {
  //     // Import compression library
  //     const imageCompression = (await import('browser-image-compression')).default
  //     
  //     const options = {
  //       maxWidthOrHeight: 1920,  // Preserves chart details
  //       useWebWorker: true,      // Better performance
  //       fileType: 'image/webp',  // Modern format
  //       initialQuality: 0.95,    // Visually lossless
  //     }
  //     
  //     const compressedFile = await imageCompression(file, options)
  //     
  //     // Log compression results
  //     console.log(`Compressed: ${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB`)
  //     
  //     return compressedFile
  //   } catch (error) {
  //     console.warn('Compression failed, using original:', error)
  //     return file
  //   }
  // }
  
  // To use compression, modify uploadToSupabase:
  // const compressedFile = await this.compressImage(file)
  // Then upload compressedFile instead of file
}

// Export singleton instance
export const uploadService = new MediaUploadService()



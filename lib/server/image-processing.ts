'use server'

import sharp from 'sharp'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export interface ServerImageOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp' | 'avif'
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  background?: string
  progressive?: boolean
  optimizeForWeb?: boolean
}

export interface ProcessedImageResult {
  buffer: Buffer
  metadata: {
    width: number
    height: number
    format: string
    size: number
    channels: number
    hasAlpha: boolean
  }
  originalSize: number
  processedSize: number
  compressionRatio: number
}

export class ServerImageProcessor {
  private static readonly UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads'
  private static readonly THUMBNAILS_DIR = join(this.UPLOAD_DIR, 'thumbnails')
  private static readonly COMPRESSED_DIR = join(this.UPLOAD_DIR, 'compressed')

  // Initialize directories
  static async initializeDirectories() {
    const dirs = [this.UPLOAD_DIR, this.THUMBNAILS_DIR, this.COMPRESSED_DIR]
    
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true })
      }
    }
  }

  // Process single image
  static async processImage(
    imageBuffer: Buffer,
    options: ServerImageOptions = {}
  ): Promise<ProcessedImageResult> {
    const {
      width,
      height,
      quality = 80,
      format = 'jpeg',
      fit = 'cover',
      background = '#ffffff',
      progressive = true,
      optimizeForWeb = true,
    } = options

    try {
      let processor = sharp(imageBuffer)

      // Get original metadata
      const originalMetadata = await processor.metadata()
      const originalSize = imageBuffer.length

      // Resize if dimensions specified
      if (width || height) {
        processor = processor.resize(width, height, {
          fit,
          background,
          withoutEnlargement: true,
        })
      }

      // Apply format-specific optimizations
      switch (format) {
        case 'jpeg':
          processor = processor.jpeg({
            quality,
            progressive,
            mozjpeg: optimizeForWeb,
            optimiseScans: optimizeForWeb,
          })
          break
        case 'png':
          processor = processor.png({
            quality,
            progressive,
            compressionLevel: optimizeForWeb ? 9 : 6,
            adaptiveFiltering: optimizeForWeb,
          })
          break
        case 'webp':
          processor = processor.webp({
            quality,
            effort: optimizeForWeb ? 6 : 4,
            smartSubsample: optimizeForWeb,
          })
          break
        case 'avif':
          processor = processor.avif({
            quality,
            effort: optimizeForWeb ? 6 : 4,
          })
          break
      }

      // Process the image
      const processedBuffer = await processor.toBuffer()
      const processedMetadata = await sharp(processedBuffer).metadata()

      const compressionRatio = ((originalSize - processedBuffer.length) / originalSize) * 100

      return {
        buffer: processedBuffer,
        metadata: {
          width: processedMetadata.width || 0,
          height: processedMetadata.height || 0,
          format: processedMetadata.format || format,
          size: processedBuffer.length,
          channels: processedMetadata.channels || 0,
          hasAlpha: processedMetadata.hasAlpha || false,
        },
        originalSize,
        processedSize: processedBuffer.length,
        compressionRatio,
      }
    } catch (error) {
      console.error('Image processing failed:', error)
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Create multiple sizes for responsive images
  static async createResponsiveSizes(
    imageBuffer: Buffer,
    baseName: string,
    sizes: Array<{ width: number; height?: number; suffix: string }> = [
      { width: 150, suffix: 'thumb' },
      { width: 400, suffix: 'small' },
      { width: 800, suffix: 'medium' },
      { width: 1200, suffix: 'large' },
    ]
  ): Promise<Array<{ path: string; size: number; width: number; height: number }>> {
    await this.initializeDirectories()

    const results = await Promise.all(
      sizes.map(async ({ width, height, suffix }) => {
        const result = await this.processImage(imageBuffer, {
          width,
          height,
          format: 'webp',
          quality: 85,
          optimizeForWeb: true,
        })

        const filename = `${baseName}_${suffix}.webp`
        const filepath = join(this.COMPRESSED_DIR, filename)
        
        await writeFile(filepath, result.buffer)

        return {
          path: `/uploads/compressed/${filename}`,
          size: result.processedSize,
          width: result.metadata.width,
          height: result.metadata.height,
        }
      })
    )

    return results
  }

  // Optimize for trade screenshots
  static async optimizeTradeScreenshot(
    imageBuffer: Buffer,
    filename: string
  ): Promise<{
    thumbnail: string
    preview: string
    fullSize: string
    metadata: any
  }> {
    await this.initializeDirectories()

    const baseName = filename.replace(/\.[^/.]+$/, '')
    
    // Create thumbnail (150x150)
    const thumbnailResult = await this.processImage(imageBuffer, {
      width: 150,
      height: 150,
      format: 'webp',
      quality: 75,
      fit: 'cover',
    })
    
    const thumbnailPath = join(this.THUMBNAILS_DIR, `${baseName}_thumb.webp`)
    await writeFile(thumbnailPath, thumbnailResult.buffer)

    // Create preview (800px wide)
    const previewResult = await this.processImage(imageBuffer, {
      width: 800,
      format: 'webp',
      quality: 80,
      fit: 'inside',
    })
    
    const previewPath = join(this.COMPRESSED_DIR, `${baseName}_preview.webp`)
    await writeFile(previewPath, previewResult.buffer)

    // Create full-size optimized version
    const fullSizeResult = await this.processImage(imageBuffer, {
      format: 'webp',
      quality: 85,
      optimizeForWeb: true,
    })
    
    const fullSizePath = join(this.COMPRESSED_DIR, `${baseName}_full.webp`)
    await writeFile(fullSizePath, fullSizeResult.buffer)

    return {
      thumbnail: `/uploads/thumbnails/${baseName}_thumb.webp`,
      preview: `/uploads/compressed/${baseName}_preview.webp`,
      fullSize: `/uploads/compressed/${baseName}_full.webp`,
      metadata: {
        original: {
          size: imageBuffer.length,
          format: 'original',
        },
        thumbnail: {
          size: thumbnailResult.processedSize,
          width: thumbnailResult.metadata.width,
          height: thumbnailResult.metadata.height,
          compressionRatio: thumbnailResult.compressionRatio,
        },
        preview: {
          size: previewResult.processedSize,
          width: previewResult.metadata.width,
          height: previewResult.metadata.height,
          compressionRatio: previewResult.compressionRatio,
        },
        fullSize: {
          size: fullSizeResult.processedSize,
          width: fullSizeResult.metadata.width,
          height: fullSizeResult.metadata.height,
          compressionRatio: fullSizeResult.compressionRatio,
        },
      },
    }
  }

  // Batch process images
  static async batchProcessImages(
    images: Array<{ buffer: Buffer; filename: string }>,
    options: ServerImageOptions = {}
  ): Promise<Array<ProcessedImageResult & { filename: string }>> {
    const results = await Promise.allSettled(
      images.map(async ({ buffer, filename }) => {
        const result = await this.processImage(buffer, options)
        return { ...result, filename }
      })
    )

    return results
      .filter((result): result is PromiseFulfilledResult<ProcessedImageResult & { filename: string }> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value)
  }

  // Convert to modern formats
  static async convertToModernFormats(
    imageBuffer: Buffer,
    baseName: string
  ): Promise<{ webp: string; avif?: string }> {
    await this.initializeDirectories()

    // Convert to WebP
    const webpResult = await this.processImage(imageBuffer, {
      format: 'webp',
      quality: 85,
      optimizeForWeb: true,
    })
    
    const webpPath = join(this.COMPRESSED_DIR, `${baseName}.webp`)
    await writeFile(webpPath, webpResult.buffer)

    const result: { webp: string; avif?: string } = {
      webp: `/uploads/compressed/${baseName}.webp`,
    }

    // Convert to AVIF if supported
    try {
      const avifResult = await this.processImage(imageBuffer, {
        format: 'avif',
        quality: 80,
        optimizeForWeb: true,
      })
      
      const avifPath = join(this.COMPRESSED_DIR, `${baseName}.avif`)
      await writeFile(avifPath, avifResult.buffer)
      
      result.avif = `/uploads/compressed/${baseName}.avif`
    } catch (error) {
      console.warn('AVIF conversion failed, skipping:', error)
    }

    return result
  }

  // Clean up old files
  static async cleanupOldFiles(daysOld: number = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    // Implementation would involve scanning upload directories
    // and removing files older than the cutoff date
    // This is a placeholder for the actual implementation
    console.log(`Cleanup would remove files older than ${cutoffDate.toISOString()}`)
  }

  // Get image info without processing
  static async getImageInfo(imageBuffer: Buffer): Promise<{
    width: number
    height: number
    format: string
    size: number
    channels: number
    hasAlpha: boolean
    density?: number
  }> {
    try {
      const metadata = await sharp(imageBuffer).metadata()
      
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: imageBuffer.length,
        channels: metadata.channels || 0,
        hasAlpha: metadata.hasAlpha || false,
        density: metadata.density,
      }
    } catch (error) {
      throw new Error(`Failed to get image info: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Validate image
  static async validateImage(imageBuffer: Buffer): Promise<{
    isValid: boolean
    error?: string
    info?: any
  }> {
    try {
      const info = await this.getImageInfo(imageBuffer)
      
      // Basic validation
      if (info.width === 0 || info.height === 0) {
        return { isValid: false, error: 'Invalid image dimensions' }
      }
      
      if (info.size > 50 * 1024 * 1024) { // 50MB limit
        return { isValid: false, error: 'Image too large (max 50MB)' }
      }

      const supportedFormats = ['jpeg', 'png', 'webp', 'tiff', 'gif']
      if (!supportedFormats.includes(info.format.toLowerCase())) {
        return { isValid: false, error: `Unsupported format: ${info.format}` }
      }

      return { isValid: true, info }
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      }
    }
  }
}

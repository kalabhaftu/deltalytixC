'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { ImageCompressor, useImageCompression, CompressionResult } from '@/lib/image-compression'
import { Upload, Image as ImageIcon, Trash2, Download, Zap, Info } from 'lucide-react'
import Image from 'next/image'

interface ImageUploadWithCompressionProps {
  onImagesUploaded?: (results: CompressionResult[]) => void
  maxFiles?: number
  acceptedTypes?: string[]
  compressionOptions?: {
    maxSizeMB?: number
    maxWidthOrHeight?: number
    quality?: number
  }
  showPreview?: boolean
  showCompressionStats?: boolean
  className?: string
}

export function ImageUploadWithCompression({
  onImagesUploaded,
  maxFiles = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  compressionOptions = {},
  showPreview = true,
  showCompressionStats = true,
  className = '',
}: ImageUploadWithCompressionProps) {
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string
    original: File
    compressed?: File
    result?: CompressionResult
    preview?: string
    error?: string
  }>>([])
  
  const [isDragOver, setIsDragOver] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  
  const {
    compressMultiple,
    isCompressing,
    compressionHistory,
  } = useImageCompression()

  // Handle file selection
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    
    // Validate file count
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      toast({
        title: 'Too many files',
        description: `Maximum ${maxFiles} files allowed`,
        variant: 'destructive',
      })
      return
    }

    // Validate file types
    const invalidFiles = fileArray.filter(file => !acceptedTypes.includes(file.type))
    if (invalidFiles.length > 0) {
      toast({
        title: 'Invalid file types',
        description: 'Only JPEG, PNG, and WebP images are allowed',
        variant: 'destructive',
      })
      return
    }

    // Create file entries
    const newFiles = fileArray.map(file => ({
      id: crypto.randomUUID(),
      original: file,
      preview: URL.createObjectURL(file),
    }))

    setUploadedFiles(prev => [...prev, ...newFiles])

    try {
      // Compress images
      const results = await compressMultiple(fileArray, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        quality: 0.85,
        ...compressionOptions,
      })

      // Update file entries with compression results
      setUploadedFiles(prev => prev.map((file, index) => {
        const resultIndex = prev.length - newFiles.length + index
        const result = results[resultIndex]
        
        if (result && newFiles.find(nf => nf.id === file.id)) {
          return {
            ...file,
            compressed: result.compressedFile,
            result,
          }
        }
        return file
      }))

      // Notify parent component
      if (onImagesUploaded) {
        onImagesUploaded(results)
      }

      toast({
        title: 'Images compressed successfully',
        description: `${results.length} images processed`,
      })
    } catch (error) {
      console.error('Compression failed:', error)
      toast({
        title: 'Compression failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }, [uploadedFiles.length, maxFiles, acceptedTypes, compressionOptions, compressMultiple, onImagesUploaded, toast])

  // File input change handler
  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFiles(event.target.files)
    }
  }, [handleFiles])

  // Drag and drop handlers
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    
    if (event.dataTransfer.files) {
      handleFiles(event.dataTransfer.files)
    }
  }, [handleFiles])

  // Remove file
  const removeFile = useCallback((id: string) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(file => file.id !== id)
      // Revoke object URLs to prevent memory leaks
      const fileToRemove = prev.find(file => file.id === id)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return updated
    })
  }, [])

  // Download compressed file
  const downloadCompressed = useCallback((file: typeof uploadedFiles[0]) => {
    if (!file.compressed) return

    const url = URL.createObjectURL(file.compressed)
    const a = document.createElemen"Loading..."
    a.href = url
    a.download = `compressed_${file.original.name}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  // Calculate total compression stats
  const totalStats = uploadedFiles.reduce(
    (acc, file) => {
      if (file.result) {
        acc.originalSize += file.result.originalSize
        acc.compressedSize += file.result.compressedSize
        acc.filesProcessed += 1
      }
      return acc
    },
    { originalSize: 0, compressedSize: 0, filesProcessed: 0 }
  )

  const overallCompressionRatio = totalStats.originalSize > 0 
    ? ((totalStats.originalSize - totalStats.compressedSize) / totalStats.originalSize) * 100 
    : 0

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <Card className={`border-2 border-dashed transition-colors ${
        isDragOver 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
      }`}>
        <CardContent
          className="p-8 text-center cursor-pointer"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileInput}
            className="hidden"
          />
          
          <div className="space-y-4">
            <Upload className="h-12 w-12 mx-auto text-gray-400" />
            <div>
              <p className="text-lg font-medium">
                Drop images here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports JPEG, PNG, and WebP files up to 50MB each
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Images will be automatically compressed for optimal performance
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compression Progress */}
      {isCompressing && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Zap className="h-5 w-5 text-blue-600 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium">Compressing images...</p>
                <Progress value={overallProgress} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Stats */}
      {showCompressionStats && totalStats.filesProcessed > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Compression Summary</span>
              </div>
              <Badge variant="outline">
                {overallCompressionRatio.toFixed(1)}% savings
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
              <div>
                <p className="text-gray-500">Original Size</p>
                <p className="font-medium">
                  {ImageCompressor.formatFileSize(totalStats.originalSize)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Compressed Size</p>
                <p className="font-medium">
                  {ImageCompressor.formatFileSize(totalStats.compressedSize)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Files Processed</p>
                <p className="font-medium">{totalStats.filesProcessed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          {uploadedFiles.map((file) => (
            <Card key={file.id}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  {/* Preview */}
                  {showPreview && file.preview && (
                    <div className="flex-shrink-0">
                      <Image
                        src={file.preview}
                        alt={file.original.name}
                        width={60}
                        height={60}
                        className="rounded-lg object-cover border"
                      />
                    </div>
                  )}

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium truncate">
                        {file.original.name}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {file.result && (
                          <Badge variant="outline" className="text-xs">
                            {file.result.compressionRatio.toFixed(1)}% smaller
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(file.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Compression Details */}
                    {file.result && (
                      <div className="mt-2 grid grid-cols-2 gap-4 text-xs text-gray-500">
                        <div>
                          <span>Original: </span>
                          <span className="font-medium">
                            {ImageCompressor.formatFileSize(file.result.originalSize)}
                          </span>
                        </div>
                        <div>
                          <span>Compressed: </span>
                          <span className="font-medium">
                            {ImageCompressor.formatFileSize(file.result.compressedSize)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {file.compressed && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadCompressed(file)}
                          className="text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download Compressed
                        </Button>
                      </div>
                    )}

                    {/* Error */}
                    {file.error && (
                      <Alert className="mt-2">
                        <AlertDescription className="text-xs">
                          {file.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Clear All */}
      {uploadedFiles.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              uploadedFiles.forEach(file => {
                if (file.preview) {
                  URL.revokeObjectURL(file.preview)
                }
              })
              setUploadedFiles([])
            }}
          >
            Clear All Files
          </Button>
        </div>
      )}
    </div>
  )
}

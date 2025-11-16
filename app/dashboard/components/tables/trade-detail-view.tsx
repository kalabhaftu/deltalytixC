'use client'

import React from 'react'
import { Trade } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Badge } from '@/components/ui/badge'
import { Eye, Calendar, Clock, TrendingUp, TrendingDown, DollarSign, Hash, User, Download, X } from 'lucide-react'
import { cn, formatCurrency, formatNumber, formatQuantity, formatTradeData } from '@/lib/utils'
import Image from 'next/image'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { toast } from 'sonner'

interface TradeDetailViewProps {
  isOpen: boolean
  onClose: () => void
  trade: Trade | null
}

// Helper function to extract mime type from base64 data URL
function getMimeTypeFromBase64(base64: string): string {
  const match = base64.match(/^data:(image\/[a-zA-Z+]+);base64,/)
  return match ? match[1] : 'image/png'
}

// Helper function to extract extension from mime type
function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
  }
  return map[mimeType] || 'png'
}

// Helper function to download image with original quality and filename
async function downloadImage(imageData: string, trade: Trade, imageIndex: number) {
  try {
    let blob: Blob
    let extension = 'png'
    let filename = ''
    
    // Check if it's a storage URL or base64
    if (imageData.startsWith('http')) {
      // Storage URL - fetch the image
      const response = await fetch(imageData)
      if (!response.ok) throw new Error('Failed to fetch image')
      
      blob = await response.blob()
      
      // Extract extension from URL or blob type
      const urlMatch = imageData.match(/\.([a-z]+)(?:\?|$)/i)
      if (urlMatch) {
        extension = urlMatch[1]
      } else {
        extension = getExtensionFromMimeType(blob.type)
      }
      
      // Determine if it's migrated (generated name) or new upload (original name)
      // Migrated images have pattern: imageBase64Fifth_1763210693765_b381uwhsc.png
      // New uploads should preserve their original names
      const urlParts = imageData.split('/')
      const storageFilename = urlParts[urlParts.length - 1].split('?')[0] // Remove query params
      
      // Check if it's a migrated image (has timestamp pattern and random ID)
      const isMigratedPattern = /^image.*_\d{13}_[a-z0-9]+\./i.test(storageFilename)
      
      if (isMigratedPattern) {
        // Migrated image - use descriptive format: INSTRUMENT_SIDE_DATE_1.ext
        const date = new Date(trade.entryDate).toISOString().split('T')[0]
        filename = `${trade.instrument}_${trade.side}_${date}_${imageIndex}.${extension}`
      } else {
        // New upload - extract original filename
        // Format is: originalname_timestamp_randomid.ext
        // We want to extract the original name before the timestamp
        
        // Remove extension first
        const nameWithoutExt = storageFilename.substring(0, storageFilename.lastIndexOf('.'))
        
        // Try to extract original name (everything before _timestamp_randomid pattern)
        const timestampMatch = nameWithoutExt.match(/^(.+)_\d{13}_[a-z0-9]+$/i)
        
        if (timestampMatch && timestampMatch[1]) {
          // Found original name - reconstruct with extension
          filename = `${timestampMatch[1]}.${extension}`
        } else {
          // Fallback - couldn't parse, use full filename
          filename = storageFilename
        }
      }
    } else {
      // Base64 - convert to blob (legacy, shouldn't happen after migration)
      const mimeType = getMimeTypeFromBase64(imageData)
      extension = getExtensionFromMimeType(mimeType)
      
      const base64Content = imageData.split(',')[1]
      const byteCharacters = atob(base64Content)
      const byteNumbers = new Array(byteCharacters.length)
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      
      const byteArray = new Uint8Array(byteNumbers)
      blob = new Blob([byteArray], { type: mimeType })
      
      // Base64 images use descriptive format
      const date = new Date(trade.entryDate).toISOString().split('T')[0]
      filename = `${trade.instrument}_${trade.side}_${date}_${imageIndex}.${extension}`
    }
    
    // Create object URL and download
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up object URL
    setTimeout(() => URL.revokeObjectURL(objectUrl), 100)
    
    toast.success(`Downloaded ${filename}`)
  } catch (error) {
    toast.error('Failed to download image')
  }
}

export function TradeDetailView({ isOpen, onClose, trade }: TradeDetailViewProps) {
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = React.useState<number>(0)

  if (!trade) return null

  // Use unified trade data formatter
  const formatted = formatTradeData(trade)

  const images = [
    trade.imageBase64,
    trade.imageBase64Second,
    trade.imageBase64Third,
    trade.imageBase64Fourth,
    (trade as any).imageBase64Fifth,
    (trade as any).imageBase64Sixth,
    (trade as any).cardPreviewImage
  ].filter((img): img is string => Boolean(img) && typeof img === 'string')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (timeInPosition: number) => {
    const hours = Math.floor(timeInPosition / 3600)
    const minutes = Math.floor((timeInPosition % 3600) / 60)
    const seconds = Math.floor(timeInPosition % 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-6xl h-[90vh] max-h-[90vh] overflow-y-auto p-4 sm:p-6 z-[10000]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
              Trade Details - {trade.instrument} {trade.side?.toUpperCase()}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Comprehensive view of trade execution, analysis, and supporting materials.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Column - Trade Data */}
            <div className="lg:col-span-2 space-y-6">
              {/* Trade Execution Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Execution Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-sm">
                  <div>
                    <Label className="text-sm text-muted-foreground">Instrument</Label>
                    <p className="font-medium text-lg">{formatted.instrument}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Side</Label>
                    <Badge variant={trade.side?.toLowerCase() === 'buy' ? 'default' : 'secondary'}>
                      {formatted.side}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Quantity</Label>
                    <p className="font-medium">
                      {formatted.quantityWithUnit}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Entry Price</Label>
                    <p className="font-medium">{formatted.entryPrice}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Exit Price</Label>
                    <p className="font-medium">{formatted.closePrice}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">P&L</Label>
                    <p className={cn(
                      "font-bold text-lg",
                      trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {formatCurrency(trade.pnl)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Timing & Account Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Timing & Account Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Entry Date</Label>
                    <p className="font-medium">{formatDate(trade.entryDate)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Exit Date</Label>
                    <p className="font-medium">{formatDate(trade.closeDate)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Time in Position</Label>
                    <p className="font-medium">{formatDuration(trade.timeInPosition || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Account Number</Label>
                    <div className="group relative">
                      <p className="font-medium cursor-help">
                        {trade.accountNumber.length > 12 
                          ? `${trade.accountNumber.slice(0, 8)}...${trade.accountNumber.slice(-4)}`
                          : trade.accountNumber
                        }
                      </p>
                      {trade.accountNumber.length > 12 && (
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50">
                          <div className="bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                            {trade.accountNumber}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Commission</Label>
                    <p className="font-medium">{formatCurrency(trade.commission || 0)}</p>
                  </div>
                  {trade.closeReason && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Close Reason</Label>
                      <Badge variant="outline" className="capitalize">
                        {trade.closeReason.replace(/[_-]/g, ' ')}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Trade Analysis */}
              {trade.comment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Trade Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                      {trade.comment}
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>

            {/* Right Column - Images */}
            <div className="space-y-6">
              {images.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Screenshots ({images.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {images.map((image, index) => {
                        const isPreview = index === images.length - 1 && (trade as any).cardPreviewImage
                        return (
                          <div key={index} className="relative group">
                            <div
                              className="aspect-video relative rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-foreground transition-colors"
                              onClick={() => {
                                setSelectedImage(image)
                                setSelectedImageIndex(index + 1)
                              }}
                            >
                              <Image
                                src={image}
                                alt={isPreview ? 'Card Preview' : `Trade screenshot ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="w-8 h-8 text-white" />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 text-center">
                              {isPreview ? 'Card Preview' : `Screenshot ${index + 1}`}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Trade Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Key Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Risk/Reward</span>
                    <span className="font-medium">
                      {trade.pnl >= 0 ? '+' : '-'} {formatCurrency(Math.abs(trade.pnl))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Price Movement</span>
                    <span className="font-medium">
                      {formatNumber((parseFloat(trade.closePrice) - parseFloat(trade.entryPrice)) / parseFloat(trade.entryPrice) * 100, 2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Net Profit</span>
                    <span className={cn(
                      "font-medium",
                      (trade.pnl - (trade.commission || 0)) >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {formatCurrency(trade.pnl - (trade.commission || 0))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => {
          setSelectedImage(null)
          setSelectedImageIndex(0)
        }}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 gap-0 z-[10002]">
            <DialogHeader className="px-4 pt-4 pb-2">
              <DialogTitle>Image Viewer - {trade.instrument} {trade.side?.toUpperCase()}</DialogTitle>
              <DialogDescription className="flex items-center justify-between">
                <span>Click and drag to pan • Scroll to zoom • Double-click to reset</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation()
                    await downloadImage(selectedImage, trade, selectedImageIndex)
                  }}
                  className="gap-1.5 shrink-0"
                  title="Download image with original quality"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-xs">Download</span>
                </Button>
              </DialogDescription>
            </DialogHeader>
            <div className="relative w-full h-[85vh] px-2 pb-2">
              <TransformWrapper
                initialScale={1}
                minScale={0.1}
                maxScale={5}
                centerOnInit
                limitToBounds={false}
                smooth
                doubleClick={{ mode: "reset" }}
              >
                <TransformComponent
                  wrapperClass="!w-full !h-full"
                  contentClass="!w-full !h-full flex items-center justify-center"
                >
                  <Image
                    src={selectedImage}
                    alt="Full screen view"
                    className="max-w-full max-h-full object-contain"
                    fill
                    sizes="95vw"
                  />
                </TransformComponent>
              </TransformWrapper>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

export default TradeDetailView


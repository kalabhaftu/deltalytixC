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
import { Badge } from '@/components/ui/badge'
import { Eye, Calendar, Clock, TrendingUp, TrendingDown, DollarSign, Hash, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

interface TradeDetailViewProps {
  isOpen: boolean
  onClose: () => void
  trade: Trade | null
}

export function TradeDetailView({ isOpen, onClose, trade }: TradeDetailViewProps) {
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null)

  if (!trade) return null

  const images = [
    trade.imageBase64,
    trade.imageBase64Second,
    trade.imageBase64Third,
    trade.imageBase64Fourth
  ].filter((img): img is string => Boolean(img) && typeof img === 'string')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Trade Details - {trade.instrument} {trade.side?.toUpperCase()}
            </DialogTitle>
            <DialogDescription>
              Comprehensive view of trade execution, analysis, and supporting materials.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Instrument</Label>
                    <p className="font-medium text-lg">{trade.instrument}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Side</Label>
                    <Badge variant={trade.side?.toLowerCase() === 'buy' ? 'default' : 'secondary'}>
                      {trade.side?.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Quantity</Label>
                    <p className="font-medium">
                      {trade.quantity < 1 ? parseFloat(trade.quantity.toString()) : trade.quantity.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Entry Price</Label>
                    <p className="font-medium">${parseFloat(trade.entryPrice).toFixed(4)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Exit Price</Label>
                    <p className="font-medium">${parseFloat(trade.closePrice).toFixed(4)}</p>
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

              {/* Tags */}
              {trade.tags && trade.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Hash className="w-5 h-5" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {trade.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
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
                    <div className="grid grid-cols-1 gap-4">
                      {images.map((image, index) => (
                        <div key={index} className="relative group">
                          <div 
                            className="aspect-video relative rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary transition-colors"
                            onClick={() => setSelectedImage(image)}
                          >
                            <Image
                              src={image}
                              alt={`Trade screenshot ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="w-8 h-8 text-white" />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 text-center">
                            Screenshot {index + 1}
                          </p>
                        </div>
                      ))}
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
                      {trade.pnl >= 0 ? '+' : '-'} ${Math.abs(trade.pnl).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Price Movement</span>
                    <span className="font-medium">
                      {((parseFloat(trade.closePrice) - parseFloat(trade.entryPrice)) / parseFloat(trade.entryPrice) * 100).toFixed(2)}%
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
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
            <DialogHeader className="sr-only">
              <DialogTitle>Image Viewer</DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-[85vh]">
              <Button
                variant="outline"
                size="icon"
                className="absolute top-2 right-2 z-10"
                onClick={() => setSelectedImage(null)}
              >
                <X className="w-4 h-4" />
              </Button>
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


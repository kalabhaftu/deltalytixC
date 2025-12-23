'use client'

import React, { useState, useRef } from 'react'
import { Trade } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  TrendingUp, TrendingDown, DollarSign, Clock, Calendar,
  Target, Minus, X, Download, ExternalLink,
  BarChart3, Newspaper, AlertCircle, Zap, ShoppingCart, Tag as TagIcon, Play
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import Image from 'next/image'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { toast } from 'sonner'
import { useTags } from '@/context/tags-provider'
import { getNewsById } from '@/lib/major-news-events'
import { getTradingSession, formatTimeInZone, DEFAULT_TIMEZONE } from '@/lib/time-utils'
import { useUserStore } from '@/store/user-store'
import TradeReplay from '../trades/trade-replay'

interface TradeDetailViewProps {
  isOpen: boolean
  onClose: () => void
  trade: Trade | null
}

// Helper to download image
async function downloadImage(imageUrl: string, trade: Trade, imageIndex: number) {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error('Failed to fetch image')

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date(trade.entryDate).toISOString().split('T')[0]
    a.download = `${trade.instrument}_${trade.side}_${date}_${imageIndex}.png`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    toast.success('Image downloaded')
  } catch (error) {
    toast.error('Failed to download image')
  }
}

export function TradeDetailView({ isOpen, onClose, trade }: TradeDetailViewProps) {
  const { tags } = useTags()
  const timezone = useUserStore((state) => state.timezone)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const imageDialogOpenRef = useRef(false)
  const [showReplay, setShowReplay] = useState(false)

  if (!trade) return null

  // Parse trade data
  const tradeData = trade as any
  const netPnL = trade.pnl - (trade.commission || 0)
  const isWin = netPnL > 0
  const isLoss = netPnL < 0

  // Format timeframe for display
  const formatTimeframe = (tf: string) => {
    const map: Record<string, string> = {
      '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min',
      '1h': '1H', '4h': '4H', 'd': 'D', 'w': 'W', 'm': 'M',
    }
    return map[tf] || tf
  }

  // Get all images - filter out null, undefined, and empty strings
  const images = [
    tradeData.cardPreviewImage,
    tradeData.imageOne,
    tradeData.imageTwo,
    tradeData.imageThree,
    tradeData.imageFour,
    tradeData.imageFive,
    tradeData.imageSix,
  ].filter((img) => img && String(img).trim() !== '')

  // Parse chart links
  const chartLinks = tradeData.chartLinks
    ? tradeData.chartLinks.split(',').filter((l: string) => l.trim())
    : []

  // Parse news events
  const newsEventIds = tradeData.selectedNews
    ? tradeData.selectedNews.split(',').filter(Boolean)
    : []
  const newsEvents = newsEventIds.map((id: string) => getNewsById(id)).filter(Boolean)

  // Parse tags - tags is now an array
  const tradeTags = Array.isArray(tradeData.tags)
    ? tradeData.tags.filter(Boolean).map((id: string) => tags.find(t => t.id === id)).filter(Boolean)
    : []

  // Get session
  const session = trade.entryTime ? getTradingSession(trade.entryTime) : null

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          // Only close if image viewer is not open
          if (!open && !imageDialogOpenRef.current) {
            onClose()
          }
        }}
      >
        <DialogContent
          className="max-w-6xl h-[90vh] flex flex-col p-0"
          onInteractOutside={(e) => {
            // Prevent closing when image viewer is open
            if (imageDialogOpenRef.current) {
              e.preventDefault()
            }
          }}
        >
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-3">
              <span className="text-2xl font-bold">{trade.instrument}</span>
              <Badge variant={trade.side === 'BUY' ? 'default' : 'destructive'} className="text-sm">
                {trade.side}
              </Badge>
              <Badge variant={isWin ? 'default' : isLoss ? 'destructive' : 'secondary'} className="text-sm">
                {formatCurrency(netPnL)}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Comprehensive view of trade execution, analysis, and supporting materials
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Execution Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Execution Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Entry Price</Label>
                      <p className="text-lg font-semibold">{trade.entryPrice}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Exit Price</Label>
                      <p className="text-lg font-semibold">{trade.closePrice}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Quantity</Label>
                      <p className="text-lg font-semibold">{trade.quantity} lots</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">P&L</Label>
                      <p className={cn("text-lg font-semibold", isWin ? "text-green-600" : isLoss ? "text-red-600" : "")}>
                        {formatCurrency(netPnL)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timing & Context Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Timing Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="h-4 w-4" />
                      Timing & Session
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-muted-foreground">Entry</Label>
                      <span className="font-medium">{formatTimeInZone(trade.entryDate, 'MMM dd, yyyy HH:mm', timezone)}</span>
                    </div>
                    <div className="flex justify-between">
                      <Label className="text-muted-foreground">Exit</Label>
                      <span className="font-medium">{formatTimeInZone(trade.closeDate, 'MMM dd, yyyy HH:mm', timezone)}</span>
                    </div>
                    <div className="flex justify-between">
                      <Label className="text-muted-foreground">Duration</Label>
                      <span className="font-medium">{Math.floor(trade.timeInPosition / 60)}m {Math.floor(trade.timeInPosition % 60)}s</span>
                    </div>
                    {session && (
                      <>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <Label className="text-muted-foreground">Session</Label>
                          <Badge variant="secondary">{session}</Badge>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Strategy & Context */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="h-4 w-4" />
                      Strategy & Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {tradeData.marketBias && (
                      <div className="flex justify-between items-center">
                        <Label className="text-muted-foreground">Market Bias</Label>
                        <Badge variant="outline" className={cn(
                          "capitalize",
                          tradeData.marketBias === 'BULLISH' && "border-green-500 text-green-600",
                          tradeData.marketBias === 'BEARISH' && "border-red-500 text-red-600",
                        )}>
                          {tradeData.marketBias === 'BULLISH' && <TrendingUp className="h-3 w-3 mr-1" />}
                          {tradeData.marketBias === 'BEARISH' && <TrendingDown className="h-3 w-3 mr-1" />}
                          {tradeData.marketBias === 'UNDECIDED' && <Minus className="h-3 w-3 mr-1" />}
                          {tradeData.marketBias.toLowerCase()}
                        </Badge>
                      </div>
                    )}

                    {tradeData.orderType && (
                      <div className="flex justify-between items-center">
                        <Label className="text-muted-foreground">Order Type</Label>
                        <Badge variant="outline">
                          {tradeData.orderType === 'market' && <Zap className="h-3 w-3 mr-1" />}
                          {tradeData.orderType === 'limit' && <ShoppingCart className="h-3 w-3 mr-1" />}
                          {tradeData.orderType === 'market' ? 'Market Order' : 'Limit Order'}
                        </Badge>
                      </div>
                    )}

                    {trade.closeReason && (
                      <div className="flex justify-between items-center">
                        <Label className="text-muted-foreground">Close Reason</Label>
                        <Badge variant="secondary" className="capitalize">{trade.closeReason}</Badge>
                      </div>
                    )}

                    {tradeTags.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-muted-foreground text-xs mb-2 block">Tags</Label>
                          <div className="flex flex-wrap gap-1">
                            {tradeTags.map((tag: any) => (
                              <Badge key={tag.id} style={{ backgroundColor: tag.color + '20', borderColor: tag.color, color: tag.color }} variant="outline" className="text-xs">
                                <TagIcon className="h-3 w-3 mr-1" />
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Timeframes - Only show if at least one is set */}
              {(tradeData.biasTimeframe || tradeData.narrativeTimeframe || tradeData.driverTimeframe || tradeData.entryTimeframe || tradeData.structureTimeframe) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="h-4 w-4" />
                      Multi-Timeframe Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {tradeData.entryTimeframe && (
                        <div className="flex flex-col gap-1">
                          <Label className="text-muted-foreground text-xs">Entry</Label>
                          <Badge variant="default" className="w-fit">{formatTimeframe(tradeData.entryTimeframe)}</Badge>
                        </div>
                      )}
                      {tradeData.biasTimeframe && (
                        <div className="flex flex-col gap-1">
                          <Label className="text-muted-foreground text-xs">Bias</Label>
                          <Badge variant="secondary" className="w-fit">{formatTimeframe(tradeData.biasTimeframe)}</Badge>
                        </div>
                      )}
                      {tradeData.narrativeTimeframe && (
                        <div className="flex flex-col gap-1">
                          <Label className="text-muted-foreground text-xs">Narrative</Label>
                          <Badge variant="secondary" className="w-fit">{formatTimeframe(tradeData.narrativeTimeframe)}</Badge>
                        </div>
                      )}
                      {tradeData.driverTimeframe && (
                        <div className="flex flex-col gap-1">
                          <Label className="text-muted-foreground text-xs">Driver</Label>
                          <Badge variant="secondary" className="w-fit">{formatTimeframe(tradeData.driverTimeframe)}</Badge>
                        </div>
                      )}
                      {tradeData.structureTimeframe && (
                        <div className="flex flex-col gap-1">
                          <Label className="text-muted-foreground text-xs">Structure</Label>
                          <Badge variant="secondary" className="w-fit">{formatTimeframe(tradeData.structureTimeframe)}</Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Chart Links */}
              {chartLinks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-4 w-4" />
                      TradingView Chart Analysis ({chartLinks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {chartLinks.map((link: string, index: number) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-blue-500/50 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
                        >
                          <BarChart3 className="h-4 w-4" />
                          Chart {index + 1}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* News Events */}
              {tradeData.newsDay && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Newspaper className="h-4 w-4" />
                      News Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {newsEvents.length > 0 ? (
                      <>
                        {newsEvents.map((event: any) => (
                          <div key={event.id} className="flex items-start gap-2 p-3 rounded-md border bg-muted/30">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{event.name}</span>
                                <Badge variant="outline" className="text-[10px] px-1">{event.country}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                            </div>
                          </div>
                        ))}

                        {tradeData.newsTraded && (
                          <div className="flex items-center gap-2 p-2 rounded border border-amber-500/50 bg-amber-500/10">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-600">Traded during news release</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">News day but no specific events selected</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Trade Notes */}
              {trade.comment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Trade Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{trade.comment}</p>
                  </CardContent>
                </Card>
              )}

              {/* Screenshots */}
              {images.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Screenshots ({images.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {images.map((img, index) => (
                        <div key={index} className="group relative aspect-video rounded-md overflow-hidden border bg-muted cursor-pointer" onClick={() => {
                          imageDialogOpenRef.current = true
                          setSelectedImage(img)
                          setSelectedImageIndex(index + 1)
                        }}>
                          <Image
                            src={img}
                            alt={`Screenshot ${index + 1}`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                            unoptimized
                            loading={index === 0 ? "eager" : "lazy"}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                            <Button variant="secondary" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              View Full Size
                            </Button>
                          </div>
                          <Badge className="absolute top-2 right-2 text-xs">
                            {index === 0 ? 'Preview' : `#${index}`}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="flex justify-between gap-2 px-6 py-4 border-t shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowReplay(true)}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Trade Replay
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trade Replay Modal */}
      {showReplay && trade && (
        <Dialog open={showReplay} onOpenChange={setShowReplay}>
          <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-background">
            <div className="max-h-[85vh] overflow-y-auto p-1">
              <TradeReplay
                trade={trade}
                onClose={() => setShowReplay(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Image Viewer Modal - Separate Dialog to prevent closing parent */}
      {selectedImage && (
        <Dialog
          open={!!selectedImage}
          onOpenChange={(open) => {
            // Update ref to track image dialog state
            imageDialogOpenRef.current = open
            // Only handle inner dialog state, don't propagate to parent
            if (!open) {
              setSelectedImage(null)
              // Small delay to ensure ref is updated before parent dialog checks it
              setTimeout(() => {
                imageDialogOpenRef.current = false
              }, 0)
            }
          }}
          modal={true}
        >
          <DialogContent
            className="max-w-[95vw] max-h-[95vh] p-0 gap-0 z-[100]"
            onInteractOutside={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setSelectedImage(null)
            }}
            onEscapeKeyDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setSelectedImage(null)
            }}
            onPointerDownOutside={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setSelectedImage(null)
            }}
          >
            <DialogHeader className="px-4 pt-4 pb-2">
              <DialogTitle>Screenshot {selectedImageIndex}</DialogTitle>
              <VisuallyHidden>
                <DialogDescription>Full size image viewer</DialogDescription>
              </VisuallyHidden>
            </DialogHeader>
            <div className="relative flex-1 bg-black">
              <TransformWrapper>
                <TransformComponent wrapperClass="!w-full !h-[calc(95vh-8rem)]" contentClass="!w-full !h-full flex items-center justify-center">
                  <Image
                    src={selectedImage}
                    alt={`Screenshot ${selectedImageIndex}`}
                    width={1920}
                    height={1080}
                    className="max-w-full max-h-full object-contain"
                    unoptimized
                    loading="eager"
                  />
                </TransformComponent>
              </TransformWrapper>
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-4 right-4"
                onClick={() => downloadImage(selectedImage, trade, selectedImageIndex)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}


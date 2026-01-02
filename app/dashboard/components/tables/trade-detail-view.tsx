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
import Link from 'next/link'
import { cn, formatCurrency, BREAK_EVEN_THRESHOLD, classifyTrade } from '@/lib/utils'
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
  const outcome = classifyTrade(netPnL)
  const isWin = outcome === 'win'
  const isLoss = outcome === 'loss'

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

          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="max-w-4xl mx-auto space-y-12">
              {/* Execution Summary */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-foreground">Execution Details</h3>
                    <p className="text-sm text-muted-foreground">Key metrics and transaction data.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Entry Price</Label>
                    <p className="text-xl font-mono">{trade.entryPrice}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Exit Price</Label>
                    <p className="text-xl font-mono">{trade.closePrice}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Quantity</Label>
                    <p className="text-xl font-mono">{trade.quantity} <span className="text-sm font-normal text-muted-foreground">lots</span></p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Net P&L</Label>
                    <p className={cn("text-xl font-mono font-bold", isWin ? "text-long" : isLoss ? "text-short" : "text-muted-foreground")}>
                      {formatCurrency(netPnL)}
                    </p>
                  </div>
                </div>
              </section>

              {/* Multi-Timeframe Analysis */}
              {(tradeData.biasTimeframe || tradeData.narrativeTimeframe || tradeData.entryTimeframe || tradeData.structureTimeframe) && (
                <section className="space-y-6 pt-8 border-t border-border/40">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-foreground">Multi-Timeframe Analysis</h3>
                    <p className="text-sm text-muted-foreground">Analysis stages from bias to execution.</p>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {tradeData.biasTimeframe && (
                      <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted/20 border border-border/40 transition-colors hover:bg-muted/30">
                        <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Bias</Label>
                        <span className="text-base font-semibold font-mono">{formatTimeframe(tradeData.biasTimeframe)}</span>
                      </div>
                    )}
                    {tradeData.structureTimeframe && (
                      <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted/20 border border-border/40 transition-colors hover:bg-muted/30">
                        <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Structure</Label>
                        <span className="text-base font-semibold font-mono">{formatTimeframe(tradeData.structureTimeframe)}</span>
                      </div>
                    )}
                    {tradeData.narrativeTimeframe && (
                      <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted/20 border border-border/40 transition-colors hover:bg-muted/30">
                        <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Narrative</Label>
                        <span className="text-base font-semibold font-mono">{formatTimeframe(tradeData.narrativeTimeframe)}</span>
                      </div>
                    )}
                    {tradeData.entryTimeframe && (
                      <div className="flex flex-col gap-2 p-4 rounded-xl bg-primary/10 border border-primary/20 transition-colors hover:bg-primary/[0.15]">
                        <Label className="text-[10px] uppercase font-bold tracking-wider text-primary">Entry</Label>
                        <span className="text-base font-semibold font-mono text-primary">{formatTimeframe(tradeData.entryTimeframe)}</span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-border/40">
                {/* Timing & Session */}
                <section className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">Timing & Context</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <Label className="text-muted-foreground">Entry Time</Label>
                      <span className="text-sm font-medium">{formatTimeInZone(trade.entryDate, 'MMM dd, HH:mm', timezone)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <Label className="text-muted-foreground">Exit Time</Label>
                      <span className="text-sm font-medium">{formatTimeInZone(trade.closeDate, 'MMM dd, HH:mm', timezone)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <Label className="text-muted-foreground">Duration</Label>
                      <span className="text-sm font-medium">{Math.floor(trade.timeInPosition / 60)}m {Math.floor(trade.timeInPosition % 60)}s</span>
                    </div>
                    {session && (
                      <div className="flex justify-between items-center py-2">
                        <Label className="text-muted-foreground">Market Session</Label>
                        <Badge variant="secondary" className="bg-muted/50 font-medium px-2.5 py-0.5">{session}</Badge>
                      </div>
                    )}
                  </div>
                </section>

                {/* Strategy Details */}
                <section className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">Strategy & Tags</h3>
                  </div>
                  <div className="space-y-4">
                    {tradeData.marketBias && (
                      <div className="flex justify-between items-center py-2 border-b border-border/30">
                        <Label className="text-muted-foreground">Market Sentiment</Label>
                        <Badge variant="outline" className={cn(
                          "capitalize font-medium border-border/50 bg-background/50",
                          tradeData.marketBias === 'BULLISH' && "text-long border-long/30 bg-long/5",
                          tradeData.marketBias === 'BEARISH' && "text-short border-short/30 bg-short/5",
                        )}>
                          {tradeData.marketBias.toLowerCase()}
                        </Badge>
                      </div>
                    )}
                    {tradeData.orderType && (
                      <div className="flex justify-between items-center py-2 border-b border-border/30">
                        <Label className="text-muted-foreground">Execution Model</Label>
                        <span className="text-sm font-medium capitalize">{tradeData.orderType} Order</span>
                      </div>
                    )}
                    {tradeTags.length > 0 && (
                      <div className="py-2">
                        <Label className="text-muted-foreground block mb-3">Active Tags</Label>
                        <div className="flex flex-wrap gap-2">
                          {tradeTags.map((tag: any) => (
                            <div key={tag.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all" style={{ backgroundColor: tag.color + '15', borderColor: tag.color + '30', color: tag.color }}>
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                              {tag.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Chart Links & News */}
              {(chartLinks.length > 0 || tradeData.newsDay) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-border/40">
                  {/* Chart Analysis */}
                  {chartLinks.length > 0 && (
                    <section className="space-y-6">
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold">Analysis Links</h3>
                        <p className="text-xs text-muted-foreground">{chartLinks.length} active chart link{chartLinks.length > 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {chartLinks.map((link: string, index: number) => (
                          <a
                            key={index}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-border transition-all"
                          >
                            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                            Chart {index + 1}
                            <ExternalLink className="h-3 w-3 opacity-40" />
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* News Context */}
                  {tradeData.newsDay && (
                    <section className="space-y-6">
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold">Economic Context</h3>
                      </div>
                      <div className="space-y-3">
                        {newsEvents.length > 0 ? (
                          <>
                            {newsEvents.map((event: any) => (
                              <div key={event.id} className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold">{event.name}</span>
                                  <Badge variant="outline" className="text-[9px] px-1 py-0">{event.country}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1">{event.description}</p>
                              </div>
                            ))}
                            {tradeData.newsTraded && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-700">
                                <Zap className="h-4 w-4 fill-orange-500 text-orange-500" />
                                <span className="text-xs font-bold uppercase tracking-tight">Active News Trader</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="p-3 rounded-lg border border-dashed border-border/60 text-center">
                            <p className="text-xs text-muted-foreground italic">High impact news day, no events logged.</p>
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* Trade Notes & Screenshots */}
              <div className="space-y-12 pt-8 border-t border-border/40">
                {trade.comment && (
                  <section className="space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-foreground">Trade Journal</h3>
                    </div>
                    <div className="relative p-6 rounded-2xl bg-muted/10 border border-border/40">
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {trade.comment}
                      </p>
                    </div>
                  </section>
                )}

                {images.length > 0 && (
                  <section className="space-y-6 pb-12">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-foreground">Visual Evidence</h3>
                      <p className="text-sm text-muted-foreground">{images.length} supporting images captured.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {images.map((img, index) => (
                        <div key={index} className="group relative aspect-video rounded-2xl overflow-hidden border border-border/40 bg-muted/30 cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[0.98]" onClick={() => {
                          imageDialogOpenRef.current = true
                          setSelectedImage(img)
                          setSelectedImageIndex(index + 1)
                        }}>
                          <Image
                            src={img}
                            alt={`Screenshot ${index + 1}`}
                            fill
                            className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                            unoptimized
                            loading={index === 0 ? "eager" : "lazy"}
                          />
                          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform">
                            <span className="text-[10px] text-white/90 font-bold uppercase tracking-widest">
                              {index === 0 ? 'Featured Preview' : `Supporting View #${index}`}
                            </span>
                          </div>
                          <Badge className="absolute top-3 right-3 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] pointer-events-none">
                            View HD
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center px-8 py-5 border-t border-border/40 bg-muted/5 shrink-0">
            <Link href={`/dashboard/table?view=replay&tradeId=${trade.id}`}>
              <Button
                variant="default"
                className="gap-2.5 h-11 px-6 rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all font-semibold"
              >
                <Play className="h-4 w-4 fill-current" />
                Launch Trade Replay
              </Button>
            </Link>
            <Button variant="ghost" onClick={onClose} className="h-11 px-6 rounded-xl text-muted-foreground hover:text-foreground">
              Close View
            </Button>
          </div>
        </DialogContent>
      </Dialog>



      {/* Image Viewer Modal - Separate Dialog to prevent closing parent */}
      {
        selectedImage && (
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
        )
      }
    </>
  )
}


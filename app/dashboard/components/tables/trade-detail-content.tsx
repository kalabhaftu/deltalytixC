'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useTags } from '@/context/tags-provider'
import { getNewsById } from '@/lib/major-news-events'
import { formatTimeInZone, getKillzoneBadge, getTradingSession } from '@/lib/time-utils'
import { classifyTrade, cn, formatCurrency, cleanContent } from '@/lib/utils'
import { useUserStore } from '@/store/user-store'
import {
  ChartBar,
  Download,
  Lightning,
  Play,
  X
} from '@phosphor-icons/react'
import { Trade } from '@prisma/client'
import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'

interface TradeDetailContentProps {
  trade: Trade | null
  onClose?: () => void
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

export function TradeDetailContent({ trade, onClose }: TradeDetailContentProps) {
  const { tags } = useTags()
  const timezone = useUserStore((state) => state.timezone)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const isImageViewerOpenRef = useRef(false)

  if (!trade) return null

  // Parse trade data
  const tradeData = trade as any
  const netPnL = trade.pnl - (trade.commission || 0)
  const outcome = classifyTrade(netPnL)
  const isWin = outcome === 'win'
  const isLoss = outcome === 'loss'

  // Get all images
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

  // Parse tags
  const tradeTags = Array.isArray(tradeData.tags)
    ? tradeData.tags.filter(Boolean).map((id: string) => tags.find(t => t.id === id)).filter(Boolean)
    : []

  // Get session and killzone
  const session = trade.entryTime ? getTradingSession(trade.entryTime) : null
  const killzone = trade.entryTime ? getKillzoneBadge(trade.entryTime, trade.symbol || undefined) : null

  return (
    <>
      <div className="w-full bg-card sm:border sm:shadow-md sm:rounded-2xl relative flex flex-col p-0 transition-all mx-auto min-h-screen sm:min-h-[90vh]">
        <div className="px-4 sm:px-8 py-6 border-b shrink-0 flex items-center justify-between bg-muted/20">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <span className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">{trade.instrument}</span>
              <Badge variant={trade.side === 'BUY' ? 'default' : 'destructive'} className="text-[10px] sm:text-xs font-black uppercase px-2 py-0.5">
                {trade.side}
              </Badge>
              <Badge variant={isWin ? 'default' : isLoss ? 'destructive' : 'secondary'} className="text-[10px] sm:text-xs font-black uppercase px-2 py-0.5">
                {formatCurrency(netPnL)}
              </Badge>
              {session && session !== 'Outside Session' && (
                <Badge variant="outline" className="text-[10px] sm:text-xs font-bold uppercase border-primary/20 bg-primary/5 text-primary px-2 py-0.5">
                  {session}
                </Badge>
              )}
              {killzone && (
                <Badge variant="outline" className="text-[10px] sm:text-xs font-bold uppercase border-warning/20 bg-warning/5 text-warning px-2 py-0.5">
                  {killzone}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-lg">
              Detailed trade execution analysis from your journal. 
            </p>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-full shrink-0 hover:bg-muted/20">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="flex-1 px-4 sm:px-10 py-8 sm:py-10">
          <div className="max-w-5xl mx-auto space-y-12 sm:space-y-16">
            {/* Execution Summary */}
            <section className="space-y-6 sm:space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground">Execution Audit</h3>
                  <div className="h-1 w-12 bg-primary rounded-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Entry Price</Label>
                  <p className="text-xl sm:text-2xl font-black font-mono tracking-tighter">{trade.entryPrice}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Exit Price</Label>
                  <p className="text-xl sm:text-2xl font-black font-mono tracking-tighter">{trade.closePrice}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Quantity</Label>
                  <p className="text-xl sm:text-2xl font-black font-mono tracking-tighter">{trade.quantity} <span className="text-xs font-bold uppercase text-muted-foreground ml-1">Lots</span></p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Net Profit/Loss</Label>
                  <p className={cn("text-xl sm:text-2xl font-black font-mono tracking-tighter", isWin ? "text-long" : isLoss ? "text-short" : "text-muted-foreground")}>
                    {formatCurrency(netPnL)}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-20 pt-8 sm:pt-12 border-t border-border/40">
              {/* Timing & Session */}
              <section className="space-y-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground/40">Timing Context</h3>
                <div className="space-y-5">
                  <div className="flex justify-between items-center py-2 border-b border-border/20">
                    <Label className="text-muted-foreground/70 text-[11px] uppercase font-black">Entry Window</Label>
                    <span className="text-sm font-black font-mono">{formatTimeInZone(trade.entryDate, 'MMM dd, HH:mm', timezone)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/20">
                    <Label className="text-muted-foreground/70 text-[11px] uppercase font-black">Exit Window</Label>
                    <span className="text-sm font-black font-mono">{formatTimeInZone(trade.closeDate, 'MMM dd, HH:mm', timezone)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/20">
                    <Label className="text-muted-foreground/70 text-[11px] uppercase font-black">Time In Position</Label>
                    <span className="text-sm font-black font-mono">{Math.floor(trade.timeInPosition / 60)}m {Math.floor(trade.timeInPosition % 60)}s</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <Label className="text-muted-foreground/70 text-[11px] uppercase font-black">Execution Zone</Label>
                    <div className="flex gap-2">
                      {session && (
                        <Badge variant="secondary" className="bg-muted/80 text-[10px] font-black uppercase px-2.5 py-1">{session}</Badge>
                      )}
                      {killzone && (
                        <Badge variant="outline" className="border-warning/30 bg-warning/5 text-warning text-[10px] font-black uppercase px-2.5 py-1">{killzone}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Strategy Details */}
              <section className="space-y-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground/40">Strategy Validation</h3>
                <div className="space-y-5">
                  {tradeData.marketBias && (
                    <div className="flex justify-between items-center py-2 border-b border-border/20">
                      <Label className="text-muted-foreground/70 text-[11px] uppercase font-black">H1 Bias</Label>
                      <Badge variant="outline" className={cn(
                        "text-[10px] font-black uppercase px-2 py-0.5 border-border/50 bg-background/50",
                        tradeData.marketBias === 'BULLISH' && "text-long border-long/30 bg-long/5",
                        tradeData.marketBias === 'BEARISH' && "text-short border-short/30 bg-short/5",
                      )}>
                        {tradeData.marketBias}
                      </Badge>
                    </div>
                  )}
                  {tradeData.orderType && (
                    <div className="flex justify-between items-center py-2 border-b border-border/20">
                      <Label className="text-muted-foreground/70 text-[11px] uppercase font-black">Execution Method</Label>
                      <span className="text-[11px] font-black uppercase tracking-tight">{tradeData.orderType} Execution</span>
                    </div>
                  )}
                  {tradeTags.length > 0 && (
                    <div className="py-2">
                      <Label className="text-muted-foreground/70 text-[11px] uppercase font-black block mb-4">Assigned Setup Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {tradeTags.map((tag: any) => (
                          <div key={tag.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all" style={{ backgroundColor: tag.color + '10', borderColor: tag.color + '20', color: tag.color }}>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                            {tag.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Trade Notes & Screenshots */}
            <div className="space-y-12 sm:space-y-16 pt-8 sm:pt-12 border-t border-border/40">
              {trade.comment && (
                <section className="space-y-6">
                  <div className="space-y-1.5">
                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground">Post-Trade Review</h3>
                    <div className="h-1 w-12 bg-primary rounded-full" />
                  </div>
                  <div className="relative p-6 sm:p-8 rounded-3xl bg-muted/30 border border-border shadow-sm">
                    <p className="text-sm sm:text-base text-foreground/90 whitespace-pre-wrap leading-relaxed font-medium">
                      {cleanContent(trade.comment)}
                    </p>
                  </div>
                </section>
              )}

              {images.length > 0 && (
                <section className="space-y-6 pb-10">
                  <div className="space-y-1.5">
                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground">Visual Audit</h3>
                    <div className="h-1 w-12 bg-primary rounded-full" />
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-2">{images.length} verification screenshots captured.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {images.map((img, index) => (
                      <div key={index} className="group relative aspect-video rounded-3xl overflow-hidden border border-border bg-muted/20 cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[0.98]" onClick={(e) => {
                        e.stopPropagation()
                        setSelectedImage(img)
                        setSelectedImageIndex(index + 1)
                      }}>
                        <Image
                          src={img}
                          alt={`Screenshot ${index + 1}`}
                          fill
                          className="object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-out"
                          unoptimized
                        />
                        <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[9px] text-white font-black uppercase tracking-[0.2em]">
                            {index === 0 ? 'Featured Preview' : `Detailed View #${index}`}
                          </span>
                        </div>
                        <Badge className="absolute top-4 right-4 bg-zinc-900 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Open HD
                        </Badge>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between items-center px-4 sm:px-10 py-6 sm:py-8 border-t border-border bg-muted/20 shrink-0 gap-4 sm:gap-0 mt-auto">
          <Link href={`/dashboard/table?view=replay&tradeId=${trade.id}`} className="w-full sm:w-auto">
            <Button
              variant="default"
              className="gap-3 h-12 sm:h-14 px-8 rounded-2xl shadow-md transition-all font-black uppercase tracking-widest text-[11px] w-full sm:w-auto"
            >
              <Play className="h-4 w-4" weight="fill" />
              Launch Trade Replay
            </Button>
          </Link>
          {onClose ? (
            <Button variant="ghost" onClick={onClose} className="h-12 px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground w-full sm:w-auto">
              Return to Journal
            </Button>
          ) : (
            <Link href="/dashboard/journal" className="w-full sm:w-auto">
              <Button variant="ghost" className="h-12 px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground w-full sm:w-auto">
                Back to Journal
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <Dialog
          open={!!selectedImage}
          onOpenChange={(open) => {
            if (!open) setSelectedImage(null)
          }}
          modal={true}
        >
          <DialogContent
            className="max-w-[98vw] max-h-[98vh] p-0 gap-0 z-[100] bg-black border-none"
          >
            <DialogHeader className="hidden">
              <DialogTitle>Screenshot {selectedImageIndex}</DialogTitle>
              <DialogDescription>Full size image viewer</DialogDescription>
            </DialogHeader>
            <div className="relative w-full h-screen bg-black flex items-center justify-center">
              <TransformWrapper>
                <TransformComponent wrapperClass="!w-screen !h-screen" contentClass="!w-screen !h-screen flex items-center justify-center">
                  <Image
                    src={selectedImage || ''}
                    alt={`Screenshot ${selectedImageIndex}`}
                    width={2560}
                    height={1440}
                    className="max-w-full max-h-full object-contain"
                    unoptimized
                  />
                </TransformComponent>
              </TransformWrapper>
              <div className="absolute top-6 right-6 flex gap-3">
                <button
                  className="rounded-full h-12 w-12 bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800 transition-colors"
                  onClick={() => downloadImage(selectedImage!, trade, selectedImageIndex)}
                >
                  <Download className="h-5 w-5 text-white" />
                </button>
                <button
                  className="rounded-full h-12 w-12 bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800 transition-colors"
                  onClick={() => setSelectedImage(null)}
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

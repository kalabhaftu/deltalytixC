'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { useTags } from '@/context/tags-provider'
import { useNewsEvents } from '@/hooks/use-news-events'
import { formatTimeInZone, getKillzoneBadge, getTradingSession } from '@/lib/time-utils'
import { classifyTrade, cn, formatCurrency, cleanContent } from '@/lib/utils'
import { useUserStore } from '@/store/user-store'
import {
  ChartBar,
  Download,
  Lightning,
  PencilSimple,
  Play,
  X
} from '@phosphor-icons/react'
import { Trade } from '@prisma/client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import { toast } from 'sonner'

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
  const { getNewsById } = useNewsEvents()
  const timezone = useUserStore((state) => state.timezone)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const isImageViewerOpenRef = useRef(false)
  const [showReplay, setShowReplay] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  useEffect(() => {
    if (isOpen) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollBarWidth}px`
      return () => {
        document.body.style.overflow = ''
        document.body.style.paddingRight = ''
      }
    }
  }, [isOpen])

  if (!trade) return null

  const handleEdit = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('action', 'edit')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Parse trade data
  const tradeData = trade as any
  const netPnL = trade.pnl - (trade.commission || 0)
  const outcome = classifyTrade(netPnL)
  const isWin = outcome === 'win'
  const isLoss = outcome === 'loss'

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

  // Get session and killzone
  const session = trade.entryTime ? getTradingSession(trade.entryTime) : null
  const killzone = trade.entryTime ? getKillzoneBadge(trade.entryTime) : null

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-background flex flex-col overflow-hidden overscroll-none"
      >
        <div
          className="w-full h-full max-w-7xl mx-auto flex flex-col flex-1 relative transition-all z-10 p-0"
        >
          <div className="px-4 sm:px-6 py-4 border-b shrink-0 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-xl sm:text-2xl font-bold truncate max-w-[150px] sm:max-w-none">{trade.instrument}</span>
                <Badge variant={trade.side === 'BUY' ? 'default' : 'destructive'} className="text-xs sm:text-sm">
                  {trade.side}
                </Badge>
                <Badge variant={isWin ? 'default' : isLoss ? 'destructive' : 'secondary'} className="text-xs sm:text-sm">
                  {formatCurrency(netPnL)}
                </Badge>
                {session && session !== 'Outside Session' && (
                  <Badge variant="outline" className="text-xs sm:text-sm border-primary/20 bg-primary/5 text-primary">
                    {session}
                  </Badge>
                )}
                {killzone && (
                  <Badge variant="outline" className="text-xs sm:text-sm border-warning/20 bg-warning/5 text-warning">
                    {killzone}
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Comprehensive view of trade execution, analysis, and supporting materials
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant="secondary" onClick={handleEdit} className="h-9 px-4 rounded-lg text-foreground transition-all font-semibold hidden sm:flex">
                <PencilSimple className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6">
            <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
              {/* Execution Summary */}
              <section className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-semibold text-foreground">Execution Details</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Key metrics and transaction data.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
                  <div className="space-y-1.5 text-center sm:text-left">
                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Entry Price</Label>
                    <p className="text-lg sm:text-xl font-mono">{trade.entryPrice}</p>
                  </div>
                  <div className="space-y-1.5 text-center sm:text-left">
                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Exit Price</Label>
                    <p className="text-lg sm:text-xl font-mono">{trade.closePrice}</p>
                  </div>
                  <div className="space-y-1.5 text-center sm:text-left">
                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Quantity</Label>
                    <p className="text-lg sm:text-xl font-mono">{trade.quantity} <span className="text-sm font-normal text-muted-foreground">lots</span></p>
                  </div>
                  <div className="space-y-1.5 text-center sm:text-left">
                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Net P&L</Label>
                    <p className={cn("text-lg sm:text-xl font-mono font-bold", isWin ? "text-long" : isLoss ? "text-short" : "text-muted-foreground")}>
                      {formatCurrency(netPnL)}
                    </p>
                  </div>
                </div>
              </section>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 pt-6 sm:pt-8 border-t border-border/40">
                {/* Timing & Session */}
                <section className="space-y-4 sm:space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">Timing & Context</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <Label className="text-muted-foreground text-sm">Entry Time</Label>
                      <span className="text-sm font-medium">{formatTimeInZone(trade.entryDate, 'MMM dd, HH:mm', timezone)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <Label className="text-muted-foreground text-sm">Exit Time</Label>
                      <span className="text-sm font-medium">{formatTimeInZone(trade.closeDate, 'MMM dd, HH:mm', timezone)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <Label className="text-muted-foreground text-sm">Duration</Label>
                      <span className="text-sm font-medium">{Math.floor(trade.timeInPosition / 60)}m {Math.floor(trade.timeInPosition % 60)}s</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <Label className="text-muted-foreground text-sm">Market Session</Label>
                      <div className="flex gap-2">
                        {session && (
                          <Badge variant="secondary" className="bg-muted/50 font-medium px-2.5 py-0.5">{session}</Badge>
                        )}
                        {killzone && (
                          <Badge variant="outline" className="border-warning/30 bg-warning/5 text-warning font-medium px-2.5 py-0.5">{killzone}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Strategy Details */}
                <section className="space-y-4 sm:space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">Strategy & Tags</h3>
                  </div>
                  <div className="space-y-4">
                    {tradeData.marketBias && (
                      <div className="flex justify-between items-center py-2 border-b border-border/30">
                        <Label className="text-muted-foreground text-sm">Market Sentiment</Label>
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
                        <Label className="text-muted-foreground text-sm">Execution Model</Label>
                        <span className="text-sm font-medium capitalize">{tradeData.orderType} Order</span>
                      </div>
                    )}
                    {tradeTags.length > 0 && (
                      <div className="py-2">
                        <Label className="text-muted-foreground text-sm block mb-3">Active Tags</Label>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 pt-6 sm:pt-8 border-t border-border/40">
                  {/* Chart Analysis */}
                  {chartLinks.length > 0 && (
                    <section className="space-y-4 sm:space-y-6">
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
                            <ChartBar className="h-3.5 w-3.5 text-muted-foreground" weight="light" />
                            Chart {index + 1}
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* News Context */}
                  {tradeData.newsDay && (
                    <section className="space-y-4 sm:space-y-6">
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
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 text-warning">
                                <Lightning className="h-4 w-4 fill-warning text-warning" weight="fill" />
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
              <div className="space-y-8 sm:space-y-12 pt-6 sm:pt-8 border-t border-border/40">
                {trade.comment && (
                  <section className="space-y-4 sm:space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-semibold text-foreground">Trade Journal</h3>
                    </div>
                    <div className="relative p-4 sm:p-6 rounded-2xl bg-muted/10 border border-border/40 overflow-hidden">
                      <div 
                        className="text-sm text-foreground/80 prose prose-sm dark:prose-invert max-w-none break-words" 
                        dangerouslySetInnerHTML={{ __html: cleanContent(trade.comment || '') }} 
                      />
                    </div>
                  </section>
                )}

                {images.length > 0 && (
                  <section className="space-y-4 sm:space-y-6 pb-6 sm:pb-12">
                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-semibold text-foreground">Visual Evidence</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">{images.length} supporting images captured.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {images.map((img, index) => (
                        <div key={index} className="group relative aspect-video rounded-2xl overflow-hidden border border-border/40 bg-muted/30 cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[0.98]" onClick={(e) => {
                          e.stopPropagation() // Prevent bubbling
                          isImageViewerOpenRef.current = true
                          setIsImageViewerOpen(true)
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
                          <div className="absolute inset-x-0 bottom-0 p-4 bg-background translate-y-full group-hover:translate-y-0 transition-transform">
                            <span className="text-[10px] text-foreground font-bold uppercase tracking-widest">
                              {index === 0 ? 'Featured Preview' : `Supporting View #${index}`}
                            </span>
                          </div>
                          <Badge className="absolute top-3 right-3 bg-black border border-white/20 text-white text-[10px] pointer-events-none">
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

          <div className="flex flex-col-reverse sm:flex-row justify-between items-center px-4 sm:px-8 py-4 sm:py-5 border-t border-border/40 bg-muted/5 shrink-0 gap-3 sm:gap-0 mt-auto">
            <Link href={`/dashboard/table?view=replay&tradeId=${trade.id}&backUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="w-full sm:w-auto">
              <Button
                variant="default"
                className="gap-2.5 h-10 sm:h-11 px-6 rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all font-semibold w-full sm:w-auto"
              >
                <Play className="h-4 w-4" weight="fill" />
                Launch Trade Replay
              </Button>
            </Link>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="secondary" onClick={handleEdit} className="h-10 sm:h-11 px-6 rounded-xl text-foreground w-full sm:w-auto transition-all font-semibold sm:hidden">
                <PencilSimple className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="ghost" onClick={onClose} className="h-10 sm:h-11 px-6 rounded-xl text-muted-foreground hover:text-foreground w-full sm:w-auto">
                Close View
              </Button>
            </div>
          </div>
        </div>
      </div>


      {/* Image Viewer Modal - Separate Dialog to prevent closing parent */}
      {
        selectedImage && (
          <Dialog
            open={!!selectedImage}
            onOpenChange={(open) => {
              // Capture open state for UI but leave ref alone if closing until timeout
              setIsImageViewerOpen(open)

              if (open) {
                isImageViewerOpenRef.current = true
              } else {
                // Extended delay for mobile to ensure parent doesn't catch the close event
                setTimeout(() => {
                  setSelectedImage(null)
                  // Reset ref after a longer delay to safely bridge the event bubbling phase
                  setTimeout(() => {
                    isImageViewerOpenRef.current = false
                  }, 250)
                }, 150)
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
                      src={selectedImage || ''}
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
                  onClick={() => downloadImage(selectedImage!, trade, selectedImageIndex)}
                >
                  <Download className="h-4 w-4 mr-2" weight="light" />
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


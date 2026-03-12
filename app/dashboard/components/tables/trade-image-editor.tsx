"use client"

import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/ui/dropzone'
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { useData } from '@/context/data-provider'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { STORAGE_BUCKETS } from '@/lib/constants/storage'
import { createClient } from '@/lib/supabase'
import { cn } from "@/lib/utils"
import { useUserStore } from '@/store/user-store'
import { MagnifyingGlassMinus, MagnifyingGlassPlus, Plus, Trash, UploadSimple, X } from "@phosphor-icons/react"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { TransformWrapper } from "react-zoom-pan-pinch"
import { toast } from 'sonner'

const supabase = createClient()

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// Generate a random 6-character alphanumeric ID
function generateShortId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface TradeImageEditorProps {
  trade: any
  tradeIds: string[]
}

export function TradeImageEditor({ trade, tradeIds }: TradeImageEditorProps) {
  const user = useUserStore(state => state.user)
  const supabaseUser = useUserStore(state => state.supabaseUser)
  const { updateTrades } = useData()
  const [isOpen, setIsOpen] = useState(false)
  const [scale, setScale] = useState(1)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [isSecondImage, setIsSecondImage] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [uploadKey, setUploadKey] = useState(0)

  const [generatedId] = useState(() => {
    if (tradeIds[0]?.includes('undefined')) {
      return generateShortId()
    }
    // Take first 6 characters of the trade ID
    return tradeIds[0].slice(0, 6)
  })

  // Get the correct user ID for upload paths
  const userId = supabaseUser?.id || user?.id

  // Create separate upload instances for first and second images
  const firstImageUploadProps = useSupabaseUpload({
    bucketName: STORAGE_BUCKETS.GENERAL,
    path: userId + '/' + generatedId,
    allowedMimeTypes: ACCEPTED_IMAGE_TYPES,
    maxFileSize: MAX_FILE_SIZE,
    maxFiles: 1,
  })

  const secondImageUploadProps = useSupabaseUpload({
    bucketName: STORAGE_BUCKETS.GENERAL,
    path: userId + '/' + generatedId,
    allowedMimeTypes: ACCEPTED_IMAGE_TYPES,
    maxFileSize: MAX_FILE_SIZE,
    maxFiles: 1,
  })

  // Use the appropriate upload props based on which image slot we're uploading to
  const uploadProps = isSecondImage ? secondImageUploadProps : firstImageUploadProps

  const handleRemoveImage = async (isSecondImage: boolean, imageUrl?: string | null) => {
    try {
      const update = {
        [isSecondImage ? 'imageTwo' : 'imageOne']: null
      }
      await updateTrades(tradeIds, update)
      
      if (imageUrl) {
        const path = imageUrl.split('T')[1]
        if (path) {
          await supabase.storage.from(STORAGE_BUCKETS.TRADES).remove([path])
        }
      }
    } catch (error) {
      console.error("Failed to remove image:", error)
    }
  }

  const handleRemoveAllImages = async () => {
    try {
      const update: any = {
        imageOne: null,
        imageTwo: null
      }
      await updateTrades(tradeIds, update)
      
      const imagesToRemove: string[] = []
      const tradeAny = trade as any
      if (tradeAny.imageOne) {
        const path = tradeAny.imageOne.split('T')[1]
        if (path) imagesToRemove.push(path)
      }
      if (tradeAny.imageTwo) {
        const path = tradeAny.imageTwo.split('T')[1]
        if (path) imagesToRemove.push(path)
      }
      
      if (imagesToRemove.length > 0) {
        await supabase.storage.from(STORAGE_BUCKETS.TRADES).remove(imagesToRemove)
      }
    } catch (error) {
      console.error("Failed to remove all images:", error)
    }
  }

  const handleUpdateImage = useCallback(async (imageUrl: string, isSecondImage: boolean) => {
    const update = {
      [isSecondImage ? 'imageTwo' : 'imageOne']: imageUrl
    }
    await updateTrades(tradeIds, update)
  }, [updateTrades, tradeIds])

  useEffect(() => {
    if (firstImageUploadProps.isSuccess && firstImageUploadProps.files.length > 0) {
      const file = firstImageUploadProps.files[0]
      const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKETS.TRADES}/${userId}/${generatedId}/${file.name}`
      handleUpdateImage(imageUrl, false)
      setUploadDialogOpen(false)
      toast.success("Image uploaded successfully")
      firstImageUploadProps.setFiles([])
      firstImageUploadProps.setErrors([])
    } else if (firstImageUploadProps.errors.length > 0) {
      toast.error("Image upload failed")
    }
  }, [firstImageUploadProps, handleUpdateImage, userId, generatedId])

  useEffect(() => {
    if (secondImageUploadProps.isSuccess && secondImageUploadProps.files.length > 0) {
      const file = secondImageUploadProps.files[0]
      const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKETS.TRADES}/${userId}/${generatedId}/${file.name}`
      handleUpdateImage(imageUrl, true)
      setUploadDialogOpen(false)
      toast.success("Second image uploaded successfully")
      secondImageUploadProps.setFiles([])
      secondImageUploadProps.setErrors([])
    } else if (secondImageUploadProps.errors.length > 0) {
      toast.error("Second image upload failed")
    }
  }, [secondImageUploadProps, handleUpdateImage, userId, generatedId])

  useEffect(() => {
    if (!uploadDialogOpen) {
      firstImageUploadProps.setFiles([])
      firstImageUploadProps.setErrors([])
      secondImageUploadProps.setFiles([])
      secondImageUploadProps.setErrors([])
    }
  }, [uploadDialogOpen, firstImageUploadProps, secondImageUploadProps])

  const tradeImages = [trade.imageOne, trade.imageTwo].filter(Boolean)

  const handleUploadClick = () => {
    setIsSecondImage(tradeImages.length === 1)
    setUploadKey(prev => prev + 1)
    setUploadDialogOpen(true)
  }

  return (
    <>
      <div className="flex gap-2">
        {tradeImages.length > 0 ? (
          <div className="relative group">
            <button
              onClick={() => setIsOpen(true)}
              className="relative w-10 h-10 rounded-lg overflow-hidden border border-border/50 hover:border-border transition-all duration-200"
              aria-label="View image"
            >
              <Image
                src={tradeImages[0]}
                alt="Trade image"
                className="object-cover w-full h-full"
                width={40}
                height={40}
              />
              {tradeImages.length > 1 && (
                <span className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
                  {tradeImages.length}
                </span>
              )}
            </button>

            {tradeImages.length === 1 && (
              <HoverCard openDelay={200}>
                <HoverCardTrigger asChild>
                  <button
                    onClick={handleUploadClick}
                    className="absolute -top-1 -right-1 bg-background border border-border rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                    aria-label="Add second image"
                  >
                    <Plus weight="bold" className="h-2 w-2" />
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-40 p-2 text-xs">
                  Add second image to this trade
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
        ) : (
          <button
            onClick={handleUploadClick}
            className="w-10 h-10 rounded-lg border border-dashed border-border flex items-center justify-center hover:bg-muted/50 transition-colors"
            title="Upload image"
          >
            <UploadSimple weight="light" className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        {tradeImages.length > 0 && tradeImages.length < 2 && (
          <HoverCard>
            <HoverCardTrigger asChild>
              <button
                onClick={handleUploadClick}
                className="w-10 h-10 rounded-lg border border-dashed border-border flex items-center justify-center hover:bg-muted/50 transition-colors"
                title="Add second image"
              >
                <Plus weight="light" className="h-4 w-4 text-muted-foreground" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-40 p-2 text-xs">
              Add second image
            </HoverCardContent>
          </HoverCard>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[90vw] h-[90vh] p-0 overflow-hidden bg-black/95 border-none">
          <DialogHeader className="absolute top-4 left-4 right-4 z-50 flex-row items-center justify-between pointer-events-none">
            <DialogTitle className="text-white drop-shadow-md text-sm font-medium pointer-events-auto">
              Trade Evidence {tradeImages.length > 1 ? `(${selectedImageIndex + 1}/${tradeImages.length})` : ""}
            </DialogTitle>
            <div className="flex items-center gap-2 pointer-events-auto">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash weight="light" className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X weight="light" className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="relative w-full h-full flex flex-col pt-16">
            <div className="flex-1 min-h-0">
              <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                centerOnInit
              >
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <div className="relative w-full h-full flex flex-col">
                    <div className="flex items-center justify-center w-full h-full">
                      <Image
                        src={tradeImages[selectedImageIndex]}
                        alt="Trade image"
                        width={800}
                        height={600}
                        className="object-contain max-h-full transition-transform duration-200"
                        style={{ transform: `scale(${scale})` }}
                        priority
                      />
                    </div>

                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 z-50">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 h-8 w-8"
                        onClick={() => zoomOut()}
                      >
                        <MagnifyingGlassMinus weight="light" className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 h-8 w-8"
                        onClick={() => zoomIn()}
                      >
                        <MagnifyingGlassPlus weight="light" className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20 text-xs px-2 h-7"
                        onClick={() => resetTransform()}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                )}
              </TransformWrapper>
            </div>

            <div className="border-t p-4">
              <Carousel className="w-full">
                <CarouselContent className="w-full flex items-center justify-center gap-2">
                  {tradeImages.map((image, index) => (
                    <CarouselItem key={index} className="basis-auto">
                      <div 
                        className={cn(
                          "relative aspect-square w-12 h-12 cursor-pointer rounded overflow-hidden border-2 transition-all",
                          selectedImageIndex === index ? "border-white" : "border-transparent opacity-50 hover:opacity-100"
                        )}
                        onClick={() => setSelectedImageIndex(index)}
                      >
                        <Image
                          src={image}
                          alt={`Thumbnail ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                  {tradeImages.length < 2 && (
                    <CarouselItem className="basis-auto">
                      <Button
                        size={'icon'}
                        className="w-12 h-12 rounded border border-dashed border-white/30 bg-transparent hover:bg-white/10 hover:border-white/50 text-white/50 hover:text-white"
                        onClick={handleUploadClick}
                      >
                        <Plus weight="light" className="h-5 w-5" />
                      </Button>
                    </CarouselItem>
                  )}
                </CarouselContent>
                {tradeImages.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </>
                )}
              </Carousel>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Image</DialogTitle>
            <DialogDescription>
              Select which image you want to delete. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {trade.imageOne && (
              <button
                onClick={() => {
                  handleRemoveImage(false, trade.imageOne)
                  setShowDeleteConfirm(false)
                }}
                className="relative group aspect-square rounded-lg overflow-hidden border-2 border-destructive/50 hover:border-destructive transition-colors"
              >
                <Image
                  src={trade.imageOne}
                  alt="First image"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Delete First Image</span>
                </div>
              </button>
            )}
            {trade.imageTwo && (
              <button
                onClick={() => {
                  handleRemoveImage(true, trade.imageTwo)
                  setShowDeleteConfirm(false)
                }}
                className="relative group aspect-square rounded-lg overflow-hidden border-2 border-destructive/50 hover:border-destructive transition-colors"
              >
                <Image
                  src={trade.imageTwo}
                  alt="Second image"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Delete Second Image</span>
                </div>
              </button>
            )}
          </div>
          <div className="flex justify-between">
            <Button
              variant="destructive"
              onClick={async () => {
                await handleRemoveAllImages()
                setShowDeleteConfirm(false)
                toast.success("All images deleted successfully")
              }}
              disabled={!trade.imageOne && !trade.imageTwo}
            >
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {isSecondImage ? "Upload Second Image" : "Upload Image"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Dropzone key={uploadKey} {...uploadProps}>
              {uploadProps.files.length > 0 ? (
                <DropzoneContent />
              ) : (
                <DropzoneEmptyState />
              )}
            </Dropzone>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}


import React from 'react'
import Image from 'next/image'
import { Control, Controller } from 'react-hook-form'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Plus, X, Loader2 } from 'lucide-react'
import { TradeImagesGallery, ImageField } from './trade-images-gallery'

interface TradeNotesTabProps {
    control: Control<any>
    cardPreviewImage: string | null
    images: Record<string, string | null>
    onUpload: (field: string, file: File) => void
    onRemove: (field: string) => void
    imageErrors: Record<string, boolean>
    setImageError: (field: string, hasError: boolean) => void
    uploadingField: string | null
}

export function TradeNotesTab({
    control,
    cardPreviewImage,
    images,
    onUpload,
    onRemove,
    imageErrors,
    setImageError,
    uploadingField
}: TradeNotesTabProps) {
    return (
        <div className="space-y-8 px-1">
            {/* Trade Notes */}
            <div className="space-y-3">
                <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Trade Notes</h3>
                    <p className="text-xs text-muted-foreground">Document your thoughts, market conditions, and key takeaways.</p>
                </div>
                <Controller
                    name="comment"
                    control={control}
                    render={({ field }) => (
                        <Textarea
                            {...field}
                            placeholder="What did you see? What did you learn?"
                            className="min-h-[160px] resize-none bg-muted/20 border-border/50 focus:bg-background transition-all"
                        />
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Card Preview Image */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-foreground">Featured Analysis</h3>
                        <p className="text-xs text-muted-foreground">The primary image shown in your journal feed.</p>
                    </div>
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-border/50 bg-muted/30 group">
                        {cardPreviewImage && String(cardPreviewImage).trim() !== '' ? (
                            <>
                                {!imageErrors.cardPreviewImage ? (
                                    <Image
                                        src={cardPreviewImage}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                        unoptimized
                                        loading="eager"
                                        onError={() => setImageError('cardPreviewImage', true)}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                        <X className="h-8 w-8 text-destructive/50 mb-2" />
                                        <p className="text-xs text-muted-foreground">Image link broken</p>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-4 px-4 backdrop-blur-[2px]">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="h-9 px-4 text-xs font-semibold shadow-xl border-white/20 hover:bg-white hover:text-black transition-all"
                                        onClick={() => {
                                            const input = document.createElement('input')
                                            input.type = 'file'
                                            input.accept = 'image/*'
                                            input.onchange = (e) => {
                                                const file = (e.target as HTMLInputElement).files?.[0]
                                                if (file) onUpload('cardPreviewImage', file)
                                            }
                                            input.click()
                                        }}
                                    >
                                        <Pencil className="h-3.5 w-3.5 mr-2" />
                                        Replace
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="h-9 px-4 text-xs font-semibold shadow-xl hover:bg-red-600 transition-all"
                                        onClick={() => onRemove('cardPreviewImage')}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                                        Remove
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-muted/50 transition-colors">
                                <Plus className="h-8 w-8 text-muted-foreground/40 mb-2" />
                                <span className="text-xs text-muted-foreground">Upload preview</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) onUpload('cardPreviewImage', file)
                                    }}
                                    disabled={uploadingField === 'cardPreviewImage'}
                                />
                            </label>
                        )}
                        {uploadingField === 'cardPreviewImage' && (
                            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Additional Screenshots - using the extracted component */}
                <TradeImagesGallery
                    images={images}
                    onUpload={(field, file) => onUpload(field, file)}
                    onRemove={(field) => onRemove(field)}
                    imageErrors={imageErrors}
                    setImageError={setImageError}
                    uploadingField={uploadingField}
                />
            </div>
        </div>
    )
}

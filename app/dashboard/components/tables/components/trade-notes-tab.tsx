
import React from 'react'
import Image from 'next/image'
import { Control, Controller } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Button } from '@/components/ui/button'
import { Pencil, Trash, Plus, X, CircleNotch } from '@phosphor-icons/react'
import { FileDropzone } from '@/components/ui/file-dropzone'
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
    chartLinks: string[]
    setChartLinks: (links: string[]) => void
}

export function TradeNotesTab({
    control,
    cardPreviewImage,
    images,
    onUpload,
    onRemove,
    imageErrors,
    setImageError,
    uploadingField,
    chartLinks,
    setChartLinks
}: TradeNotesTabProps) {
    return (
        <div className="space-y-8 px-1">
            {/* Trade Notes */}
            <div className="space-y-3">
                <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 sm:gap-2">
                    <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-foreground">Trade Notes</h3>
                        <p className="text-xs text-muted-foreground">Document your thoughts, market conditions, and key takeaways.</p>
                    </div>
                    <Controller
                        name="comment"
                        control={control}
                        render={({ field }) => (
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto shrink-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] uppercase font-bold tracking-tight bg-muted/20 shrink-0"
                                    onClick={() => {
                                        // Only override if empty to prevent accidental loss
                                        if (!field.value || field.value === '<p></p>') {
                                            field.onChange('<p><strong>What did I see?</strong></p><p></p><p><strong>What did I do?</strong></p><p></p><p><strong>What did I learn?</strong></p><p></p>')
                                        }
                                    }}
                                >
                                    Standard Review
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] uppercase font-bold tracking-tight bg-muted/20 shrink-0"
                                    onClick={() => {
                                        if (!field.value || field.value === '<p></p>') {
                                            field.onChange('<p><strong>Emotional State:</strong></p><p></p><p><strong>Focus Level (1-10):</strong></p><p></p><p><strong>Mistakes Made:</strong></p><p></p>')
                                        }
                                    }}
                                >
                                    Mental Check-in
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] uppercase font-bold tracking-tight bg-muted/20 shrink-0"
                                    onClick={() => {
                                        if (!field.value || field.value === '<p></p>') {
                                            field.onChange('<p><strong>Higher Timeframe Context:</strong></p><p></p><p><strong>Execution Trigger:</strong></p><p></p><p><strong>Trade Management:</strong></p><p></p>')
                                        }
                                    }}
                                >
                                    Technical Breakdown
                                </Button>
                            </div>
                        )}
                    />
                </div>
                <Controller
                    name="comment"
                    control={control}
                    render={({ field }) => (
                        <RichTextEditor
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="What did you see? What did you learn?"
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
                                        <X className="h-8 w-8 text-destructive/50 mb-2" weight="light" />
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
                                        <Pencil className="h-3.5 w-3.5 mr-2" weight="light" />
                                        Replace
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="h-9 px-4 text-xs font-semibold shadow-xl hover:bg-red-600 transition-all"
                                        onClick={() => onRemove('cardPreviewImage')}
                                    >
                                        <Trash className="h-3.5 w-3.5 mr-2" weight="light" />
                                        Remove
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <FileDropzone
                                variant="default"
                                onDrop={(files) => {
                                    const file = files[0]
                                    if (file) onUpload('cardPreviewImage', file)
                                }}
                                accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }}
                                className="h-full border-none bg-transparent hover:bg-muted/10"
                                description="Drag & drop or click to upload preview"
                                icon={<Plus className="h-8 w-8 text-muted-foreground/40 mb-2" weight="light" />}
                                disabled={uploadingField === 'cardPreviewImage'}
                            />
                        )}
                        {uploadingField === 'cardPreviewImage' && (
                            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                                <CircleNotch className="h-5 w-5 animate-spin text-primary" weight="light" />
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

            {/* Chart Links */}
            <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Chart Analysis Links</h3>
                    <p className="text-xs text-muted-foreground">Add links to your TradingView chart analysis (up to 8)</p>
                </div>
                <div className="space-y-3 max-w-2xl">
                    {chartLinks.map((link, index) => (
                        <div key={index} className="flex items-center gap-2 group">
                            <div className="flex-1">
                                <Input
                                    type="text"
                                    placeholder="https://www.tradingview.com/x/..."
                                    value={link}
                                    onChange={(e) => {
                                        const newLinks = [...chartLinks]
                                        newLinks[index] = e.target.value
                                        setChartLinks(newLinks)
                                    }}
                                    className="text-sm h-9 bg-muted/20 border-border/50 focus:bg-background transition-all"
                                />
                            </div>
                            {index >= 4 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-muted-foreground hover:text-destructive transition-colors"
                                    onClick={() => {
                                        const newLinks = chartLinks.filter((_, i) => i !== index)
                                        setChartLinks(newLinks)
                                    }}
                                >
                                    <X className="h-4 w-4" weight="light" />
                                </Button>
                            )}
                        </div>
                    ))}
                    {chartLinks.length < 8 && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setChartLinks([...chartLinks, ''])}
                            className="w-full h-9 border-dashed border-border/60 hover:border-primary/50 text-muted-foreground hover:text-primary transition-all"
                        >
                            <Plus className="h-4 w-4 mr-2" weight="light" />
                            Add Analysis Link ({chartLinks.length}/8)
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}


import React from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Plus, X, Loader2 } from 'lucide-react'
import { FileDropzone } from '@/components/ui/file-dropzone'

export type ImageField = 'imageOne' | 'imageTwo' | 'imageThree' | 'imageFour' | 'imageFive' | 'imageSix'

interface TradeImagesGalleryProps {
    images: Record<string, string | null>
    onUpload: (field: ImageField, file: File) => void
    onRemove: (field: ImageField) => void
    imageErrors: Record<string, boolean>
    setImageError: (field: string, hasError: boolean) => void
    uploadingField: string | null
}

const IMAGE_FIELDS: ImageField[] = ['imageOne', 'imageTwo', 'imageThree', 'imageFour', 'imageFive', 'imageSix']

export function TradeImagesGallery({
    images,
    onUpload,
    onRemove,
    imageErrors,
    setImageError,
    uploadingField
}: TradeImagesGalleryProps) {
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Gallery</h3>
                <p className="text-xs text-muted-foreground">Detailed chart views and execution proofs.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {IMAGE_FIELDS.map((field, idx) => {
                    const imageUrl = images[field]

                    return (
                        <div key={field} className="relative aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/20 group">
                            {imageUrl && String(imageUrl).trim() !== '' ? (
                                <>
                                    {!imageErrors[field] ? (
                                        <Image
                                            src={imageUrl}
                                            alt={`Screenshot ${idx + 1}`}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                            loading="eager"
                                            onError={() => setImageError(field, true)}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <X className="h-4 w-4 text-destructive/40" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-[1px]">
                                        <InputButton
                                            icon={<Pencil className="h-3.5 w-3.5" />}
                                            onClick={(file) => onUpload(field, file)}
                                            className="bg-white/20 border-white/20 hover:bg-white hover:text-black text-white"
                                            title="Edit"
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="h-8 w-8 rounded-full bg-red-500/40 border-red-500/20 hover:bg-red-500 transition-all scale-90 group-hover:scale-100"
                                            title="Delete"
                                            onClick={() => onRemove(field)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <FileDropzone
                                    variant="mini"
                                    onDrop={(files) => {
                                        const file = files[0]
                                        if (file) onUpload(field, file)
                                    }}
                                    accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }}
                                    className="h-full w-full bg-muted/10 hover:bg-muted/30 border-dashed"
                                    icon={<Plus className="h-5 w-5 text-muted-foreground/30" />}
                                    disabled={uploadingField === field}
                                />
                            )}
                            {uploadingField === field && (
                                <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function InputButton({ icon, onClick, className, title }: { icon: React.ReactNode, onClick: (file: File) => void, className?: string, title?: string }) {
    return (
        <Button
            type="button"
            variant="secondary"
            size="icon"
            className={`h-8 w-8 rounded-full transition-all scale-90 group-hover:scale-100 ${className}`}
            title={title}
            onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) onClick(file)
                }
                input.click()
            }}
        >
            {icon}
        </Button>
    )
}

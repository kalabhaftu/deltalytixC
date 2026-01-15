'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, Loader2, FileArchive, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react'
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useData } from '@/context/data-provider'
import { useAccounts } from '@/hooks/use-accounts'
import { FileDropzone } from '@/components/ui/file-dropzone'

export function ImportDialog() { // Kept name for compatibility
  const { refreshTrades } = useData()
  const { refetch: refetchAccounts } = useAccounts()
  const [isOpen, setIsOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResults, setImportResults] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.zip')) {
        toast.error('Please select a valid Backup ZIP file')
        return
      }
      setSelectedFile(file)
      setImportResults(null)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return

    try {
      setIsImporting(true)
      toast.info('Restoring system data...', {
        description: 'Please wait while your data is being restored. This may take a minute.',
        duration: Infinity
      })

      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/data/import', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Restore failed')
      }

      setImportResults(data) // API returns { success: true, imported: N, skipped: M }

      toast.success('System Restore Complete!', {
        description: `Restored ${data.imported || 0} trades. Skipped ${data.skipped || 0} duplicates.`
      })

      // Refresh data
      setTimeout(() => {
        refreshTrades()
        refetchAccounts()
      }, 1000)

    } catch (error) {
      toast.error('Restore Failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred'
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setImportResults(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    handleReset()
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) handleReset()
    }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" /> Restore Backup
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Restore System Backup</DialogTitle>
          <DialogDescription>
            Restore your database from a previously exported ZIP backup.
            This process reconstructs accounts, trades, and images.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Selection */}
          {!importResults && (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Safe Restore:</strong> This process will <strong>not</strong> overwrite existing data. It only adds missing records. Duplicates are automatically skipped.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <FileDropzone
                  onDrop={(files) => {
                    const file = files[0]
                    if (file) {
                      if (!file.name.endsWith('.zip')) {
                        toast.error('Please select a valid Backup ZIP file')
                        return
                      }
                      setSelectedFile(file)
                      setImportResults(null)
                    }
                  }}
                  accept={{ 'application/zip': ['.zip'] }}
                  variant="default"
                  description="Drag & drop your backup ZIP file here, or click to browse"
                  value={selectedFile}
                  onClear={handleReset}
                  isLoading={isImporting}
                />
              </div>
            </>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-4">
              <Alert className="border-long/20 bg-long/5">
                <CheckCircle2 className="h-4 w-4 text-long" />
                <AlertDescription className="text-long">
                  <strong>Restore operation completed successfully.</strong>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                  <span className="text-sm font-medium text-muted-foreground">Imported</span>
                  <span className="text-2xl font-bold text-long">
                    {importResults.imported || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                  <span className="text-sm font-medium text-muted-foreground">Skipped (Duplicates)</span>
                  <span className="text-2xl font-bold text-amber-600">
                    {importResults.skipped || 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button onClick={handleReset}>
                  Restore Another
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!importResults && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Start Restore
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

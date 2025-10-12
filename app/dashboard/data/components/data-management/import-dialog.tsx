'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, Loader2, FileArchive, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useData } from '@/context/data-provider'
import { useAccounts } from '@/hooks/use-accounts'

export function ImportDialog() {
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
        toast.error('Please select a valid ZIP file')
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
      toast('Importing data...', { 
        id: 'import',
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
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
        throw new Error(data.error || 'Import failed')
      }

      setImportResults(data.results)
      toast.success('Data imported successfully!', { id: 'import' })

      // Refresh data
      setTimeout(() => {
        refreshTrades()
        refetchAccounts()
      }, 1000)

    } catch (error) {
      console.error('Import error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to import data', { id: 'import' })
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
          <Upload className="mr-2 h-4 w-4" /> Import Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Upload a previously exported ZIP file to restore your data. All accounts, trades, backtests, and notes will be imported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Selection */}
          {!importResults && (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> This will create new records in your account. Existing data will not be affected or overwritten.
                </AlertDescription>
              </Alert>

              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> Large imports (1000+ trades) may take 1-2 minutes. The dialog will show &ldquo;Importing...&rdquo; until complete. 
                  Check the browser console (F12) to see detailed progress.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 space-y-4">
                {selectedFile ? (
                  <>
                    <FileArchive className="h-16 w-16 text-primary" />
                    <div className="text-center">
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleReset}
                    >
                      Choose Different File
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload className="h-16 w-16 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium mb-2">Select a ZIP file to import</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Only files exported from Deltalytix are supported
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="import-file-input"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Browse Files
                    </Button>
                  </>
                )}
              </div>
            </>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>Import completed successfully!</strong>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(importResults).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-lg font-bold text-primary">
                      {value as number}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-4 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button onClick={handleReset}>
                  Import Another File
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
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}


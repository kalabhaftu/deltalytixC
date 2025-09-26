'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { useToast } from "@/hooks/use-toast"
import { UploadIcon, type UploadIconHandle } from '@/components/animated-icons/upload'
import { Trade } from '@prisma/client'
import { saveAndLinkTrades } from '@/server/accounts'
import ImportTypeSelection, { ImportType } from './import-type-selection'
import FileUpload from './file-upload'
import HeaderSelection from './header-selection'
import AccountSelection from './account-selection'
import { useData } from '@/context/data-provider'
import ColumnMapping from './column-mapping'
import { ImportDialogHeader } from './components/import-dialog-header'
import { ImportDialogFooter } from './components/import-dialog-footer'
import { platforms } from './config/platforms'
import { FormatPreview } from './components/format-preview'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/user-store'
import { useTradesStore } from '@/store/trades-store'
import { usePdfProcessingStore } from '@/store/pdf-processing-store'
import PdfUpload from './ibkr-pdf/pdf-upload'
import PdfProcessing from './ibkr-pdf/pdf-processing'
import { motion } from 'framer-motion'

import { generateTradeHash } from '@/lib/utils'

type ColumnConfig = {
  [key: string]: {
    defaultMapping: string[];
    required: boolean;
  };
};

const columnConfig: ColumnConfig = {
  "accountNumber": { defaultMapping: ["account", "accountnumber"], required: false },
  "instrument": { defaultMapping: ["symbol", "ticker"], required: true },
  "entryId": { defaultMapping: ["entryId", "entryorderid"], required: false },
  "closeId": { defaultMapping: ["closeId", "closeorderid"], required: false },
  "quantity": { defaultMapping: ["qty", "amount"], required: true },
  "entryPrice": { defaultMapping: ["entryprice", "entryprice"], required: true },
  "closePrice": { defaultMapping: ["closeprice", "exitprice"], required: true },
  "entryDate": { defaultMapping: ["entrydate", "entrydate"], required: true },
  "closeDate": { defaultMapping: ["closedate", "exitdate"], required: true },
  "pnl": { defaultMapping: ["pnl", "profit"], required: true },
  "timeInPosition": { defaultMapping: ["timeinposition", "duration"], required: false },
  "side": { defaultMapping: ["side", "direction"], required: false },
  "commission": { defaultMapping: ["commission", "fee"], required: false },
}

export type Step = 
  | 'select-import-type'
  | 'upload-file'
  | 'select-headers'
  | 'map-columns'
  | 'select-account'
  | 'preview-trades'
  | 'complete'
  | 'process-file'

export default function ImportButton() {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [step, setStep] = useState<Step>('select-import-type')
  const [importType, setImportType] = useState<ImportType>('')
  const [files, setFiles] = useState<File[]>([])
  const [rawCsvData, setRawCsvData] = useState<string[][]>([])
  const [csvData, setCsvData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<{ [key: string]: string }>({})
  const [accountNumber, setAccountNumber] = useState<string>('')
  const [newAccountNumber, setNewAccountNumber] = useState<string>('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [processedTrades, setProcessedTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const uploadIconRef = useRef<UploadIconHandle>(null)
  const [text, setText] = useState<string>('')

  const { toast } = useToast()
  const user = useUserStore(state => state.user)
  const supabaseUser = useUserStore(state => state.supabaseUser)
  const trades = useTradesStore(state => state.trades)
  const { refreshTrades, updateTrades } = useData()


  const handleSave = async () => {
    // Use either the user from our database or the Supabase user as fallback
    const currentUser = user || supabaseUser
    if (!currentUser?.id) {
      toast({
        title: "Authentication Error",
        description: "User not authenticated. Please log in and try again.",
        variant: "destructive",
      })
      return
    }

    // Require account selection for linking
    if (!selectedAccountId) {
      toast({
        title: "Account Selection Required",
        description: "Please select an account to link trades to before importing.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    
    try {
      // Show processing indicator
      toast({
        title: "Processing Trades",
        description: "Saving and linking trades to account...",
        duration: 3000,
      })

      // Atomic save and link operation
      const result = await saveAndLinkTrades(selectedAccountId, processedTrades)

      // Close dialog immediately for better UX
      setIsOpen(false)
      
      // Reset the import process
      resetImportState()
      
      // Update the trades and wait for completion
      await refreshTrades()
      
      // Show success message
      toast({
        title: "Import Successful",
        description: `Successfully imported and linked ${result.linkedCount} trades to ${result.accountName}`,
        duration: 5000,
      })

    } catch (error) {
      console.error('Error in save and link trades:', error)
      toast({
         title: "Import Failed",
         description: error instanceof Error ? error.message : "An error occurred while importing trades. No trades were saved.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const resetImportState = () => {
    setImportType('')
    setStep('select-import-type')
    setRawCsvData([])
    setCsvData([])
    setHeaders([])
    setMappings({})
    setAccountNumber('')
    setNewAccountNumber('')
    setSelectedAccountId('')
    setProcessedTrades([])
    setError(null)
  }

  const handleNextStep = () => {
    const platform = platforms.find(p => p.type === importType) || platforms.find(p => p.platformName === 'csv-ai')
    if (!platform) return

    const currentStepIndex = platform.steps.findIndex(s => s.id === step)
    if (currentStepIndex === -1) return

    // Handle PDF upload step
    if (step === 'upload-file' && importType === 'pdf') {
      if (files.length === 0) {
         setError("Please select files to upload")
        return
      }
      setStep('process-file')
      return
    }

    // Handle standard flow
    const nextStep = platform.steps[currentStepIndex + 1]
    if (!nextStep) {
      handleSave()
      return
    }

    setStep(nextStep.id)
  }

  const handleBackStep = () => {
    const platform = platforms.find(p => p.type === importType) || platforms.find(p => p.platformName === 'csv-ai')
    if (!platform) return

    const currentStepIndex = platform.steps.findIndex(s => s.id === step)
    if (currentStepIndex <= 0) return

    const prevStep = platform.steps[currentStepIndex - 1]
    if (!prevStep) return

    setStep(prevStep.id)
  }

  const renderStep = () => {
    const platform = platforms.find(p => p.type === importType) || platforms.find(p => p.platformName === 'csv-ai')
    if (!platform) return null

    const currentStep = platform.steps.find(s => s.id === step)
    if (!currentStep) return null

    const Component = currentStep.component

    // Handle special cases for components that need specific props
    if (Component === ImportTypeSelection) {
      return (
        <div className="flex flex-col gap-4 h-full">
          <Component
            selectedType={importType}
            setSelectedType={setImportType}
            setIsOpen={setIsOpen}
          />
        </div>
      )
    }
    if (Component === PdfUpload) {
      return (
        <Component
          setText={setText}
          setFiles={setFiles}
        />
      )
    }

    if (Component === FileUpload) {
      return (
        <Component
          importType={importType}
          setRawCsvData={setRawCsvData}
          setCsvData={setCsvData}
          setHeaders={setHeaders}
          setStep={setStep}
          setError={setError}
        />
      )
    }



    if (Component === HeaderSelection) {
      return (
        <Component
          rawCsvData={rawCsvData}
          setCsvData={setCsvData}
          setHeaders={setHeaders}
          setError={setError}
        />
      )
    }

    if (Component === AccountSelection) {
      return (
        <Component
          accountNumber={accountNumber}
          setAccountNumber={setAccountNumber}
          selectedAccountId={selectedAccountId}
          setSelectedAccountId={setSelectedAccountId}
        />
      )
    }

    if (Component === ColumnMapping) {
      return (
        <Component
          headers={headers}
          csvData={csvData}
          mappings={mappings}
          setMappings={setMappings}
          error={error}
          importType={importType}
        />
      )
    }

    if (Component === FormatPreview) {
      return (
        <Component
          trades={csvData}
          processedTrades={processedTrades}
          setProcessedTrades={setProcessedTrades}
          setIsLoading={setIsLoading}
          isLoading={isLoading}
          headers={headers}
          mappings={mappings}
        />
      )
    }
    
    if (Component === PdfProcessing) {
      return (
        <Component
          setError={setError}
          setStep={setStep}
          processedTrades={processedTrades}
          setProcessedTrades={setProcessedTrades}
          extractedText={text}
        />
      )
    }
    
    // Handle processor components - only if the current step component is the processor
    if (platform.processorComponent && Component === platform.processorComponent) {
      return (
        <platform.processorComponent
          csvData={csvData}
          headers={headers}
          setProcessedTrades={setProcessedTrades}
          accountNumber={accountNumber || newAccountNumber}
        />
      )
    }

    // Handle custom components
    if (platform.customComponent) {
      return <platform.customComponent setIsOpen={setIsOpen} />
    }

    return null
  }

  const isNextDisabled = () => {
    if (isLoading) return true
    
    const platform = platforms.find(p => p.type === importType) || platforms.find(p => p.platformName === 'csv-ai')
    if (!platform) return true

    const currentStep = platform.steps.find(s => s.id === step)
    if (!currentStep) return true

    // File upload step
    if (currentStep.component === FileUpload && csvData.length === 0) return true
    
    // PDF upload step
    if (currentStep.component === PdfUpload && text.length === 0) return true
    
    // Account selection for platforms - require account ID for linking
    if (currentStep.component === AccountSelection && !selectedAccountId) return true

    return false
  }

  return (
    <div>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          variant="default"
          className={cn(
            "justify-start text-left font-medium w-full transition-all duration-200 bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/20 border-border/50 backdrop-blur-sm",
          )}
          id="import-data"
          onMouseEnter={() => uploadIconRef.current?.startAnimation()}
          onMouseLeave={() => uploadIconRef.current?.stopAnimation()}
        >
          <UploadIcon ref={uploadIconRef} className="h-4 w-4 mr-2 transition-transform duration-200" />
           <span className='hidden md:block'>Import Trades</span>
        </Button>
      </motion.div>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex flex-col max-w-[85vw] h-[85vh] p-0 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl">
          <VisuallyHidden>
            <DialogTitle>Import Data</DialogTitle>
          </VisuallyHidden>
          <ImportDialogHeader step={step} importType={importType} />
          
          <div className="flex-1 overflow-hidden">
            {renderStep()}
          </div>

          <ImportDialogFooter
            step={step}
            importType={importType}
            onBack={handleBackStep}
            onNext={handleNextStep}
            isSaving={isSaving}
            isNextDisabled={isNextDisabled()}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { UploadIcon, type UploadIconHandle } from '@/components/animated-icons/upload'
import { Trade } from '@prisma/client'
import { saveTradesAction } from '@/server/database'
import ImportTypeSelection, { ImportType } from './import-type-selection'
import FileUpload from './file-upload'
import HeaderSelection from './header-selection'
import AccountSelection from './account-selection'
import { useData } from '@/context/data-provider'
import ColumnMapping from './column-mapping'
import { useI18n } from "@/locales/client"
import { platforms } from './config/platforms-card'
import { FormatPreview } from './components/format-preview'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/user-store'
import { useTradesStore } from '@/store/trades-store'
import { usePdfProcessingStore } from '@/store/pdf-processing-store'
import PdfUpload from './ibkr-pdf/pdf-upload'
import PdfProcessing from './ibkr-pdf/pdf-processing'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'

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

interface ImportTradesCardProps {
  accountId: string
}

export default function ImportTradesCard({ accountId }: ImportTradesCardProps) {
  const [step, setStep] = useState<Step>('select-import-type')
  const [importType, setImportType] = useState<ImportType>('')
  const [files, setFiles] = useState<File[]>([])
  const [rawCsvData, setRawCsvData] = useState<string[][]>([])
  const [csvData, setCsvData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<{ [key: string]: string }>({})
  const [accountNumber, setAccountNumber] = useState<string>('')
  const [newAccountNumber, setNewAccountNumber] = useState<string>('')
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
  const t = useI18n()
  const router = useRouter()
  const params = useParams()

  const handleSave = async () => {
    // Use either the user from our database or the Supabase user as fallback
    const currentUser = user || supabaseUser
    if (!currentUser?.id) {
      toast({
        title: t('import.error.auth'),
        description: t('import.error.authDescription'),
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      let newTrades: Trade[] = []
          newTrades = processedTrades.map(trade => {
            // Clean up the trade object to remove undefined values
            const cleanTrade = Object.fromEntries(
              Object.entries(trade).filter(([_, value]) => value !== undefined)
            ) as Partial<Trade>
            
            return {
              ...cleanTrade,
              accountNumber: cleanTrade.accountNumber || accountNumber || newAccountNumber || accountId,
              userId: currentUser.id,
              id: generateTradeHash({ ...cleanTrade, userId: currentUser.id }),
              // Ensure required fields have default values
              instrument: cleanTrade.instrument || '',
              entryPrice: cleanTrade.entryPrice || '',
              closePrice: cleanTrade.closePrice || '',
              entryDate: cleanTrade.entryDate || '',
              closeDate: cleanTrade.closeDate || '',
              quantity: cleanTrade.quantity || 0,
              pnl: cleanTrade.pnl || 0,
              timeInPosition: cleanTrade.timeInPosition || 0,
              side: cleanTrade.side || '',
              commission: cleanTrade.commission || 0,
              entryId: cleanTrade.entryId || null,
              closeId: cleanTrade.closeId || null,
              comment: cleanTrade.comment || null,
              videoUrl: cleanTrade.videoUrl || null,
              tags: cleanTrade.tags || [],
              imageBase64: cleanTrade.imageBase64 || null,
              imageBase64Second: cleanTrade.imageBase64Second || null,
              groupId: cleanTrade.groupId || null,
              createdAt: cleanTrade.createdAt || new Date(),
            } as Trade
          })
     
          // Filter out empty trades
          newTrades = newTrades.filter(trade => {
            // Check if all required fields are present and not empty
            return trade.accountNumber &&
              trade.instrument &&
              trade.quantity !== 0 &&
              (trade.entryPrice || trade.closePrice) &&
              (trade.entryDate || trade.closeDate);
          });

      // Remove debug logging - trades are being saved successfully
      const result = await saveTradesAction(newTrades)
      if(result.error){
        if (result.error === "DUPLICATE_TRADES") {
          toast({
            title: t('import.error.duplicateTrades'),
            description: t('import.error.duplicateTradesDescription'),
            variant: "destructive",
          })
        } else if (result.error === "NO_TRADES_ADDED") {
          toast({
            title: t('import.error.noTradesAdded'),
            description: t('import.error.noTradesAddedDescription'),
            variant: "destructive",
          })
        } else if (result.error === "DATABASE_ERROR") {
          toast({
            title: "Database Error",
            description: (result.details as string) || "A database error occurred during import",
            variant: "destructive",
          })
        } else {
          toast({
            title: t('import.error.failed'),
            description: t('import.error.failedDescription'),
            variant: "destructive",
          })
        }
        return
      }
      // Update the trades and wait for completion
      await refreshTrades()
      
      // Force a small delay to ensure state updates propagate
      await new Promise(resolve => setTimeout(resolve, 200))
      
      toast({
        title: t('import.success'),
        description: `Successfully imported ${result.numberOfTradesAdded} trades`,
      })
      
      // Reset the import process
      resetImportState()
      
      // Navigate back to trades list
      router.push(`/dashboard/prop-firm/accounts/${accountId}/trades`)

    } catch (error) {
      console.error('Error saving trades:', error)
      toast({
        title: t('import.error.failed'),
        description: t('import.error.failedDescription'),
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
        setError(t('import.errors.noFilesSelected'))
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
            setIsOpen={() => {}} // No-op for card version
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
          accounts={Array.from(new Set(trades.map(trade => trade.accountNumber)))}
          accountNumber={accountNumber}
          setAccountNumber={setAccountNumber}
          newAccountNumber={newAccountNumber}
          setNewAccountNumber={setNewAccountNumber}
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
          accountNumber={accountNumber || newAccountNumber || accountId}
        />
      )
    }

    // Handle custom components
    if (platform.customComponent) {
      return <platform.customComponent setIsOpen={() => {}} /> // No-op for card version
    }
    
    // Handle custom card components
    if (platform.customCardComponent && Component === platform.customCardComponent) {
      return <platform.customCardComponent accountId={accountId} />
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
    
    // Account selection for platforms
    if (currentStep.component === AccountSelection && !accountNumber && !newAccountNumber) return true

    return false
  }

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Import Trades</CardTitle>
            <CardDescription>Choose a method to import your trades</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/prop-firm/accounts/${accountId}/trades`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trades
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <div className="flex flex-col h-[75vh]">
          <div className="flex-1 overflow-hidden">
            {renderStep()}
          </div>

          <div className="flex-none p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-[68px]">
            <div className="flex justify-end items-center gap-4">
              {step !== 'select-import-type' && (
                <Button 
                  variant="outline" 
                  onClick={handleBackStep}
                  className="w-fit min-w-[100px]"
                >
                  {t('import.button.back')}
                </Button>
              )}
              {step !== 'select-import-type' && (
                <Button 
                  onClick={handleNextStep}
                  className="w-fit min-w-[100px]"
                  disabled={isNextDisabled()}
                >
                  {isSaving ? t('import.button.saving') : 
                   step === 'preview-trades' || step === 'process-file' ? t('import.button.save') : 
                   t('import.button.next')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
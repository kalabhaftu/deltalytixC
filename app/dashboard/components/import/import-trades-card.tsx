'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { UploadIcon, type UploadIconHandle } from '@/components/animated-icons/upload'
import { Trade } from '@prisma/client'
import { linkTradesToCurrentPhase, checkPhaseProgression, checkAccountBreaches } from '@/server/accounts'
import ImportTypeSelection, { ImportType } from './import-type-selection'
import FileUpload from './file-upload'
import HeaderSelection from './header-selection'
import AccountSelection from './account-selection'
import { useData } from '@/context/data-provider'
import ColumnMapping from './column-mapping'
import { platforms } from './config/platforms-card'
import { FormatPreview } from './components/format-preview'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/user-store'
import { useTradesStore } from '@/store/trades-store'
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
  "instrument": { defaultMapping: ["symbol", "ticker"], required: true },
  "entryId": { defaultMapping: ["id", "tradeid", "orderid"], required: false },
  "quantity": { defaultMapping: ["qty", "amount", "volume"], required: true },
  "entryPrice": { defaultMapping: ["entryprice", "openprice"], required: true },
  "closePrice": { defaultMapping: ["closeprice", "exitprice"], required: true },
  "entryDate": { defaultMapping: ["entrydate", "opentime"], required: true },
  "closeDate": { defaultMapping: ["closedate", "exitdate", "closetime"], required: true },
  "pnl": { defaultMapping: ["pnl", "profit"], required: true },
  "timeInPosition": { defaultMapping: ["timeinposition", "duration"], required: false },
  "side": { defaultMapping: ["side", "direction"], required: false },
  "commission": { defaultMapping: ["commission", "fee"], required: false },
  "stopLoss": { defaultMapping: ["stoploss", "sl", "stop"], required: false },
  "takeProfit": { defaultMapping: ["takeprofit", "tp", "target"], required: false },
  "closeReason": { defaultMapping: ["closereason", "reason", "exitreason"], required: false },
  "symbol": { defaultMapping: ["symbol", "ticker", "instrument"], required: false },
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
  | 'process-trades'

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
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [processedTrades, setProcessedTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const uploadIconRef = useRef<UploadIconHandle>(null)
  const [text, setText] = useState<string>('')

  const user = useUserStore(state => state.user)
  const supabaseUser = useUserStore(state => state.supabaseUser)
  const trades = useTradesStore(state => state.trades)
  const { refreshTrades, updateTrades } = useData()
  const router = useRouter()
  const params = useParams()

  const handleSave = async () => {
    // Use either the user from our database or the Supabase user as fallback
    const currentUser = user || supabaseUser
    if (!currentUser?.id) {
      toast.error("Authentication Error", {
        description: "User not authenticated. Please log in and try again.",
      })
      return
    }

    setIsSaving(true)
    
    try {
      // Show processing indicator (auto-dismiss after 3 seconds)
      toast.info("Processing Trades", {
        description: "Checking for duplicates and saving trades...",
        duration: 3000,
      })
      let newTrades: Trade[] = []
          newTrades = processedTrades.map(trade => {
            // Clean up the trade object to remove undefined values
            const cleanTrade = Object.fromEntries(
              Object.entries(trade).filter(([_, value]) => value !== undefined)
            ) as Partial<Trade>
            
            return {
              ...cleanTrade,
              accountNumber: cleanTrade.accountNumber || accountNumber || accountId,
              userId: currentUser.id,
              id: generateTradeHash({ ...cleanTrade, userId: currentUser.id }),
              // Ensure required fields have default values
              instrument: cleanTrade.instrument || '',
              entryPrice: cleanTrade.entryPrice || '',
              closePrice: cleanTrade.closePrice || '',
              entryDate: cleanTrade.entryDate || '',
              closeDate: cleanTrade.closeDate || '',
              quantity: cleanTrade.quantity ?? 0,
              pnl: cleanTrade.pnl || 0,
              timeInPosition: cleanTrade.timeInPosition || 0,
              side: cleanTrade.side || '',
              commission: cleanTrade.commission || 0,
              entryId: cleanTrade.entryId || null,
              comment: cleanTrade.comment || null,
              groupId: cleanTrade.groupId || null,
              createdAt: cleanTrade.createdAt || new Date(),
            } as Trade
          })
     
          // Filter out empty trades
          newTrades = newTrades.filter(trade => {
            // Check if all required fields are present and not empty
            return trade.accountNumber &&
              trade.instrument &&
              trade.quantity !== null && trade.quantity !== undefined &&
              (trade.entryPrice || trade.closePrice) &&
              (trade.entryDate || trade.closeDate);
          });

      // Link trades to current active phase instead of direct database save
      let result
      try {
        result = await linkTradesToCurrentPhase(accountId, newTrades)
      } catch (linkError: any) {
        
        // Handle specific error cases with user-friendly messages
        const errorMessage = linkError?.message || String(linkError)
        
        if (errorMessage.includes('No active phase')) {
          toast.error("No Active Phase", {
            description: "This account doesn't have an active phase. Please set up account phases first.",
            duration: 5000,
          })
        } else if (errorMessage.includes('not found')) {
          toast.error("Account Not Found", {
            description: "The selected account could not be found. Please try again or create the account first.",
            duration: 5000,
          })
        } else if (errorMessage.includes('inactive')) {
          toast.error("Inactive Phase", {
            description: "Cannot add trades to an inactive phase. Please activate the phase first.",
            duration: 5000,
          })
        } else {
          toast.error("Import Failed", {
            description: errorMessage.length > 100 ? "An error occurred while importing trades. Please try again." : errorMessage,
            duration: 5000,
          })
        }
        
        setIsSaving(false)
        return
      }

      if (!result?.success) {
        toast.error("Import Failed", {
          description: "Failed to link trades to account phase. Please try again.",
        })
        setIsSaving(false)
        return
      }
      
      // Show appropriate success message based on the result
      const importedCount = result.linkedCount || 0
      
      if (importedCount === 0) {
        toast.info("No New Trades", {
          description: `All ${newTrades.length} trades have already been imported to this account. No duplicates were added.`,
          duration: 5000,
        })
        setIsSaving(false)
        
        // Still reset and navigate back
        resetImportState()
        router.push(`/dashboard/prop-firm/accounts/${accountId}/trades`)
        return
      }
      
      // Reset the import process immediately for better UX
      resetImportState()
      
      // Navigate back to trades list immediately
      router.push(`/dashboard/prop-firm/accounts/${accountId}/trades`)
      
      // Update the trades in background
      refreshTrades()
      
      // Check for account breaches after successful import
      try {
        const breachResult = await checkAccountBreaches(accountId)
        if (breachResult && typeof breachResult === 'object' && 'isFailed' in breachResult && breachResult.isFailed) {
          toast.error("Account Failed!", {
            description: `Account failed due to rule breach: Account rules violated`,
          })
        }
      } catch (breachError) {
        // Don't fail the import if breach check fails
      }

      // Check for phase progression after successful import
      try {
        const progressResult = await checkPhaseProgression(accountId)
        if (progressResult && typeof progressResult === 'object' && 'canProgress' in progressResult) {
          if (progressResult.canProgress) {
            toast.success("Phase Target Reached!", {
              description: `Account has reached the profit target for phase ${(progressResult as any).currentPhase?.phaseNumber}. Phase progression will be processed.`,
            })
          }
        }
      } catch (progressError) {
        // Don't fail the import if phase progression check fails
      }

      // Show success message with phase information
      toast.success("Import Completed", {
        description: `Successfully imported ${importedCount} ${importedCount === 1 ? 'trade' : 'trades'}.`,
        duration: 5000,
      })

    } catch (error: any) {
      
      // User-friendly error messages
      const errorMessage = error?.message || String(error)
      
      if (errorMessage.includes('Authentication')) {
        toast.error("Authentication Error", {
          description: "Your session has expired. Please log in again.",
        })
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        toast.error("Connection Error", {
          description: "Unable to connect to the server. Please check your internet connection and try again.",
        })
      } else {
        toast.error("Import Failed", {
          description: "An unexpected error occurred. Please try again or contact support if the issue persists.",
        })
      }
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
        setError("Please select a PDF file to continue")
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
    
    // Handle processor components - only if the current step component is the processor
    if (platform.processorComponent && Component === platform.processorComponent) {
      return (
        <platform.processorComponent
          csvData={csvData}
          headers={headers}
          setProcessedTrades={setProcessedTrades}
          accountNumber={accountNumber || accountId}
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
    if (!platform) {
      // Only disable if no import type is selected and we're not on the first step
      return step === 'select-import-type' && !importType
    }

    const currentStep = platform.steps.find(s => s.id === step)
    if (!currentStep) return true

    // For import type selection, require a type to be selected
    if (currentStep.component === ImportTypeSelection && !importType) return true
    
    // File upload step
    if (currentStep.component === FileUpload && csvData.length === 0) return true
    
    // Account selection for platforms
    if (currentStep.component === AccountSelection && !accountNumber) return true

    // FormatPreview step - require processed trades before saving
    if (currentStep.component === FormatPreview && processedTrades.length === 0) return true

    return false
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Trades</CardTitle>
        <CardDescription>Choose a method to import your trades</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-6">
          {renderStep()}
        </div>

        <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex justify-end items-center gap-4">
            {step !== 'select-import-type' && (
              <Button 
                variant="outline" 
                onClick={handleBackStep}
                className="w-fit min-w-[100px]"
              >
                {"Back"}
              </Button>
            )}
            {(step !== 'select-import-type' || (step === 'select-import-type' && importType)) && (
              <Button 
                onClick={handleNextStep}
                className="w-fit min-w-[100px]"
                disabled={isNextDisabled()}
              >
                {isSaving ? "Saving..." : 
                 step === 'preview-trades' || step === 'process-file' ? "Save" : 
                 "Next"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
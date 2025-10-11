'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { toast } from "sonner"
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
import { ImportLoading } from './components/import-loading'
import { platforms } from './config/platforms'
import { PartyPopper } from 'lucide-react'
import { FormatPreview } from './components/format-preview'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/user-store'
import { useTradesStore } from '@/store/trades-store'
import { motion } from 'framer-motion'

import { generateTradeHash } from '@/lib/utils'
import { PhaseTransitionDialog } from '@/app/dashboard/components/prop-firm/phase-transition-dialog'

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
  
  // Phase transition state
  const [showPhaseTransitionDialog, setShowPhaseTransitionDialog] = useState(false)
  const [phaseTransitionData, setPhaseTransitionData] = useState<{
    masterAccountId: string
    currentPhase: {
      phaseNumber: number
      profitTargetPercent?: number
      currentPnL: number
      phaseId: string
    }
    nextPhaseNumber: number
    propFirmName: string
    accountName: string
  } | null>(null)

  const user = useUserStore(state => state.user)
  const supabaseUser = useUserStore(state => state.supabaseUser)
  const trades = useTradesStore(state => state.trades)
  const { refreshTrades, updateTrades } = useData()


  const handleSave = async () => {
    // Use either the user from our database or the Supabase user as fallback
    const currentUser = user || supabaseUser
    if (!currentUser?.id) {
      toast.error("Authentication Error", {
        description: "User not authenticated. Please log in and try again.",
      })
      return
    }

    // Require account selection for linking
    if (!selectedAccountId) {
      toast.error("Account Selection Required", {
        description: "Please select an account to link trades to before importing.",
      })
      return
    }

    setIsSaving(true)
    setIsLoading(true)
    
    try {
      // Show processing indicator
      toast.info("Processing Trades", {
        description: "Saving and linking trades to account...",
        duration: 3000,
      })

      // Atomic save and link operation
      const result = await saveAndLinkTrades(selectedAccountId, processedTrades)

      // Invalidate accounts cache to trigger refresh
      const { invalidateAccountsCache } = await import("@/hooks/use-accounts")
      invalidateAccountsCache('trades imported')

      // Close dialog immediately for better UX
      setIsOpen(false)

      // Reset the import process
      resetImportState()
      
      // Update the trades and wait for completion
      await refreshTrades()
      
      // Handle duplicate trades case
      if (result.isDuplicate) {
        toast.info("No New Trades", {
          description: 'message' in result ? result.message : `All ${result.totalTrades} trades already exist in this account`,
          duration: 5000,
        })
        return
      }

      // Show success message with evaluation result
      if ('evaluation' in result && result.evaluation) {
        
        if (result.evaluation.status === 'failed') {
          toast.error("Account Failed", {
            description: result.evaluation.message || 'Account failed due to rule violation',
            duration: 10000,
          })
        } else if (result.evaluation.status === 'passed' && result.isPropFirm && result.masterAccountId && result.phaseAccountId) {
          
          const evalData = result.evaluation as any
          
          // Phase passed - open transition dialog
          toast.success("Profit Target Reached!", {
            description: result.evaluation.message || 'Ready to advance to next phase',
            duration: 10000,
          })
          
          // Prepare data for phase transition dialog
          const dialogData = {
            masterAccountId: result.masterAccountId,
            currentPhase: {
              phaseNumber: evalData.currentPhaseNumber || 1,
              profitTargetPercent: evalData.profitTargetProgress,
              currentPnL: evalData.currentPnL || 0,
              phaseId: result.phaseAccountId
            },
            nextPhaseNumber: (evalData.currentPhaseNumber || 1) + 1,
            propFirmName: evalData.propFirmName || 'Prop Firm',
            accountName: 'accountName' in result ? result.accountName : 'Account'
          }
          
          
          setPhaseTransitionData(dialogData)
          
          // Close import dialog and open phase transition dialog
          setIsOpen(false)
          resetImportState()
          setTimeout(() => {
            setShowPhaseTransitionDialog(true)
          }, 300)
        } else {
          toast.success("Import Successful", {
            description: `Successfully imported ${result.linkedCount} trades to ${'accountName' in result ? result.accountName : 'account'}`,
            duration: 5000,
          })
        }
      } else {
        toast.success("Import Successful", {
          description: `Successfully imported and linked ${result.linkedCount} trades to ${'accountName' in result ? result.accountName : 'account'}`,
          duration: 5000,
        })
      }

    } catch (error) {
      console.error('Error in save and link trades:', error)
      
      // Provide more specific error messages based on error type
      let errorMessage = "An error occurred while importing trades. No trades were saved."
      let errorTitle = "Import Failed"
      
      if (error instanceof Error) {
        if (error.message.includes('phase transition')) {
          errorTitle = "Phase Transition Required"
          errorMessage = error.message
        } else if (error.message.includes('account')) {
          errorTitle = "Account Error"
          errorMessage = error.message
        } else if (error.message.includes('authentication')) {
          errorTitle = "Authentication Error"
          errorMessage = "Please log in again and try importing your trades."
        } else {
          errorMessage = error.message
        }
      }
      
      toast.error(errorTitle, {
        description: errorMessage,
        duration: 8000,
      })
    } finally {
      setIsSaving(false)
      setIsLoading(false)
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
    // Show loading animation when processing trades
    if (isLoading) {
      return <ImportLoading />
    }

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
    
    // Account selection for platforms - require account ID for linking
    if (currentStep.component === AccountSelection && !selectedAccountId) return true

    return false
  }

  return (
    <div>
      {/* Phase Transition Dialog */}
      {phaseTransitionData && (
        <PhaseTransitionDialog
          isOpen={showPhaseTransitionDialog}
          onClose={() => {
            setShowPhaseTransitionDialog(false)
            setPhaseTransitionData(null)
          }}
          masterAccountId={phaseTransitionData.masterAccountId}
          currentPhase={phaseTransitionData.currentPhase}
          nextPhaseNumber={phaseTransitionData.nextPhaseNumber}
          propFirmName={phaseTransitionData.propFirmName}
          accountName={phaseTransitionData.accountName}
          onSuccess={() => {
            refreshTrades()
            setShowPhaseTransitionDialog(false)
            setPhaseTransitionData(null)
          }}
        />
      )}
      
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          className={cn(
            "justify-start text-left font-medium w-full transition-all duration-200 hover:bg-muted/50 border-border/50 backdrop-blur-sm",
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
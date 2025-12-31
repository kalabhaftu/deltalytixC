'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { toast } from "sonner"
// UploadIcon removed
import { Trade } from '@prisma/client'
import { saveAndLinkTrades } from '@/server/accounts'
import ImportTypeSelection, { ImportType } from './import-type-selection'
import FileUpload from './file-upload'
import HeaderSelection from './header-selection'
import AccountSelection from './account-selection'
import { useData } from '@/context/data-provider'
import ColumnMapping from './column-mapping'
import { FormatPreview } from './components/format-preview'
import { platforms } from './config/platforms'
import {
  Trophy,
  CheckCircle2,
  Upload,
  FileSpreadsheet,
  MapPin,
  Wallet,
  Eye,
  ArrowRight,
  ArrowLeft,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/user-store'
import { motion, AnimatePresence } from 'framer-motion'
import { generateTradeHash } from '@/lib/utils'
import { PhaseTransitionDialog } from '@/app/dashboard/components/prop-firm/phase-transition-dialog'
import { Progress } from '@/components/ui/progress'

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

// Step icons mapping
const stepIcons: Record<string, React.ReactNode> = {
  'select-import-type': <FileSpreadsheet className="h-3.5 w-3.5" />,
  'upload-file': <Upload className="h-3.5 w-3.5" />,
  'select-headers': <MapPin className="h-3.5 w-3.5" />,
  'map-columns': <MapPin className="h-3.5 w-3.5" />,
  'select-account': <Wallet className="h-3.5 w-3.5" />,
  'preview-trades': <Eye className="h-3.5 w-3.5" />,
}

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
  const [saveProgress, setSaveProgress] = useState<number>(0)
  // uploadIconRef removed

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
    evaluationType: string
  } | null>(null)

  const user = useUserStore(state => state.user)
  const supabaseUser = useUserStore(state => state.supabaseUser)
  const { refreshTrades } = useData()

  // Get current platform config
  const platform = useMemo(() =>
    platforms.find(p => p.type === importType) || platforms.find(p => p.platformName === 'csv-ai'),
    [importType]
  )

  // Get current step info
  const currentStep = useMemo(() =>
    platform?.steps.find(s => s.id === step),
    [platform, step]
  )

  const currentStepIndex = useMemo(() =>
    platform?.steps.findIndex(s => s.id === step) ?? 0,
    [platform, step]
  )

  const totalSteps = platform?.steps.length ?? 1

  // Check if this is manual trade entry (has custom component)
  const isManualEntry = importType === 'manual-trade-entry' && platform?.customComponent

  const resetImportState = useCallback(() => {
    setImportType('')
    setStep('select-import-type')
    setRawCsvData([])
    setCsvData([])
    setHeaders([])
    setMappings({})
    setProcessedTrades([])
    setError(null)
    setAccountNumber('')
    setNewAccountNumber('')
    setSelectedAccountId('')
    setSaveProgress(0)
    setIsSaving(false)
    setIsLoading(false)
  }, [])

  const handleSave = useCallback(async () => {
    const currentUser = user || supabaseUser
    if (!currentUser?.id) {
      toast.error("Authentication Error", {
        description: "User not authenticated. Please log in and try again.",
      })
      return
    }

    if (!selectedAccountId) {
      toast.error("Account Required", {
        description: "Please select an account to link trades to.",
      })
      return
    }

    setIsSaving(true)
    setIsLoading(true)
    setSaveProgress(10)

    try {
      setSaveProgress(30)

      // Execute save operation
      const result = await saveAndLinkTrades(selectedAccountId, processedTrades)

      setSaveProgress(70)

      // Invalidate accounts cache
      const { invalidateAccountsCache } = await import("@/hooks/use-accounts")
      invalidateAccountsCache('trades imported')

      setSaveProgress(90)

      // Close dialog
      setIsOpen(false)
      resetImportState()

      // Refresh data
      await refreshTrades()

      setSaveProgress(100)

      // Handle results
      if (result.isDuplicate) {
        toast.info("No New Trades", {
          description: 'message' in result ? result.message : `All ${result.totalTrades} trades already exist`,
          duration: 5000,
        })
        return
      }

      if ('evaluation' in result && result.evaluation) {
        const evalData = result.evaluation as any

        if (evalData.status === 'failed') {
          toast.error("Account Failed", {
            description: evalData.message || 'Account failed due to rule violation',
            duration: 10000,
          })
        } else if (evalData.status === 'pending_approval') {
          toast.success("Evaluation Complete!", {
            description: "Your account has passed. Check notifications to confirm approval.",
            duration: 10000,
            icon: <Trophy className="h-4 w-4 text-primary" />
          })
        } else if ((evalData.status === 'passed' || evalData.status === 'ready_for_transition') && result.isPropFirm && result.masterAccountId && result.phaseAccountId) {
          toast.success("Profit Target Reached!", {
            description: evalData.message || 'Ready to advance to next phase',
            duration: 10000,
            icon: <CheckCircle2 className="h-4 w-4 text-long" />
          })

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
            accountName: 'accountName' in result ? result.accountName : 'Account',
            evaluationType: evalData.evaluationType || 'Two Step'
          }

          setPhaseTransitionData(dialogData)
          setTimeout(() => setShowPhaseTransitionDialog(true), 300)
        } else {
          toast.success("Import Successful", {
            description: `Imported ${result.linkedCount} trades`,
            duration: 5000,
          })
        }
      } else {
        toast.success("Import Successful", {
          description: `Imported ${result.linkedCount} trades`,
          duration: 5000,
        })
      }

    } catch (error) {
      let errorMessage = "An error occurred while importing trades."
      let errorTitle = "Import Failed"

      if (error instanceof Error) {
        if (error.message.includes('phase transition')) {
          errorTitle = "Phase Transition Required"
          errorMessage = error.message
        } else if (error.message.includes('account')) {
          errorTitle = "Account Error"
          errorMessage = error.message
        } else {
          errorMessage = error.message
        }
      }

      toast.error(errorTitle, { description: errorMessage, duration: 8000 })
    } finally {
      setIsSaving(false)
      setIsLoading(false)
      setSaveProgress(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // resetImportState is intentionally excluded - it has empty deps and doesn't affect handleSave behavior
  }, [user, supabaseUser, selectedAccountId, processedTrades, refreshTrades, resetImportState])

  const handleNextStep = useCallback(() => {
    if (!platform) return

    const currentIdx = platform.steps.findIndex(s => s.id === step)
    if (currentIdx === -1) return

    // Handle PDF upload step
    if (step === 'upload-file' && importType === 'pdf') {
      if (files.length === 0) {
        setError("Please select files to upload")
        return
      }
      setStep('process-file')
      return
    }

    const nextStep = platform.steps[currentIdx + 1]
    if (!nextStep) {
      handleSave()
      return
    }

    setStep(nextStep.id)
  }, [platform, step, importType, files, handleSave])

  const handleBackStep = useCallback(() => {
    if (!platform) return

    const currentIdx = platform.steps.findIndex(s => s.id === step)
    if (currentIdx <= 0) return

    const prevStep = platform.steps[currentIdx - 1]
    if (prevStep) setStep(prevStep.id)
  }, [platform, step])

  const isNextDisabled = useMemo(() => {
    if (isLoading) return true
    if (!platform) return true

    const currentStepConfig = platform.steps.find(s => s.id === step)
    if (!currentStepConfig) return true

    // File upload requires files
    if (currentStepConfig.component === FileUpload && csvData.length === 0) return true

    // Account selection requires selection
    if (currentStepConfig.component === AccountSelection && !selectedAccountId) return true

    // FormatPreview requires processed trades
    if (currentStepConfig.component === FormatPreview && processedTrades.length === 0) return true

    return false
  }, [isLoading, platform, step, csvData.length, selectedAccountId, processedTrades.length])

  const renderStep = useCallback(() => {
    if (!platform) return null

    const currentStepConfig = platform.steps.find(s => s.id === step)
    if (!currentStepConfig) return null

    const Component = currentStepConfig.component

    // Show saving state
    if (isSaving) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-12 w-12 text-primary" />
          </motion.div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Saving Trades</h3>
            <p className="text-sm text-muted-foreground">
              Processing {processedTrades.length} trades...
            </p>
          </div>
          <div className="w-full max-w-xs">
            <Progress value={saveProgress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground mt-2">
              {saveProgress}% complete
            </p>
          </div>
        </div>
      )
    }

    // Handle each step type
    if (Component === ImportTypeSelection) {
      return (
        <Component
          selectedType={importType}
          setSelectedType={setImportType}
          setIsOpen={setIsOpen}
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

    // Handle processor components
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

    // Handle custom components (like ManualTradeForm) - render fullscreen
    if (platform.customComponent) {
      return <platform.customComponent setIsOpen={setIsOpen} />
    }

    return null
  }, [
    platform,
    step,
    isSaving,
    saveProgress,
    processedTrades,
    importType,
    rawCsvData,
    csvData,
    headers,
    mappings,
    error,
    accountNumber,
    selectedAccountId,
    isLoading,
    newAccountNumber
  ])

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
          evaluationType={phaseTransitionData.evaluationType}
          onSuccess={() => {
            refreshTrades()
            setShowPhaseTransitionDialog(false)
            setPhaseTransitionData(null)
          }}
        />
      )}

      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          className="justify-start text-left font-medium w-full transition-all duration-200 hover:bg-muted/50 border-border/50"
          id="import-data"
          onMouseEnter={() => { }}
          onMouseLeave={() => { }}
        >
          <Upload className="h-4 w-4 mr-2" />
          <span className='hidden md:block'>Import Trades</span>
        </Button>
      </motion.div>

      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) resetImportState()
      }}>
        <DialogContent
          className="flex flex-col w-[95vw] max-w-5xl h-[85vh] p-0 bg-background border border-border shadow-2xl overflow-hidden gap-0"
          onOpenAutoFocus={(e) => {
            // Prevent auto-focus on mobile devices to avoid keyboard popup
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              e.preventDefault()
            }
          }}
        >
          <VisuallyHidden>
            <DialogTitle>Import Trades</DialogTitle>
          </VisuallyHidden>

          {/* Header - only show for non-manual entry or show simplified for manual */}
          {!isManualEntry && (
            <div className="flex-none border-b p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {currentStep?.title || 'Import Trades'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {currentStep?.description || 'Import your trading data'}
                  </p>
                </div>
              </div>

              {/* Progress steps */}
              {platform && totalSteps > 1 && (
                <div className="flex items-center gap-1">
                  {platform.steps.map((s, idx) => (
                    <React.Fragment key={s.id}>
                      <div
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all",
                          currentStepIndex === idx
                            ? "bg-primary text-primary-foreground font-medium"
                            : currentStepIndex > idx
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {currentStepIndex > idx ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          stepIcons[s.id] || <span className="text-xs">{idx + 1}</span>
                        )}
                        <span className="hidden sm:inline">{s.title}</span>
                      </div>
                      {idx < platform.steps.length - 1 && (
                        <div className={cn(
                          "h-px w-4 transition-colors",
                          currentStepIndex > idx ? "bg-primary" : "bg-border"
                        )} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className={cn(
            "flex-1 overflow-hidden",
            !isManualEntry && "p-4"
          )}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer - only show for non-manual entry */}
          {!isManualEntry && (
            <div className="flex-none p-4 border-t">
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  {processedTrades.length > 0 && (
                    <span>{processedTrades.length} trades ready</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {currentStepIndex > 0 && (
                    <Button
                      variant="outline"
                      onClick={handleBackStep}
                      disabled={isSaving}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                  )}
                  <Button
                    onClick={handleNextStep}
                    disabled={isNextDisabled || isSaving}
                    className={cn(
                      "gap-2 min-w-[100px]",
                      currentStepIndex === 0 && importType === 'rithmic-sync' && "invisible"
                    )}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : currentStep?.isLastStep ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Save Trades
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

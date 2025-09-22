import { Trade } from '@prisma/client'
import type { ComponentType } from 'react'
import ImportTypeSelection from '../import-type-selection'
import FileUpload from '../file-upload'
import HeaderSelection from '../header-selection'
import AccountSelection from '../account-selection'
import ColumnMapping from '../column-mapping'
import { FormatPreview } from '../components/format-preview'
import TradezellaProcessor from '../tradezella/tradezella-processor'
import TopstepProcessor from '../topstep/topstep-processor'
import PdfUpload from '../ibkr-pdf/pdf-upload'
import PdfProcessing from '../ibkr-pdf/pdf-processing'
import MatchTraderProcessor from '../match-trader/match-trader-processor'
import ManualTradeFormCard from '../manual-trade-entry/manual-trade-form-card'
import { Step } from '../import-button'
import { Sparkles, Plus } from 'lucide-react'

type StepText = string

export interface ProcessedData {
  headers: string[]
  processedData: string[][]
}

type StepComponent = 
  | typeof ImportTypeSelection
  | typeof FileUpload
  | typeof HeaderSelection
  | typeof AccountSelection
  | typeof ColumnMapping
  | typeof FormatPreview
  | typeof TradezellaProcessor
  | typeof TopstepProcessor
  | typeof PdfUpload
  | typeof PdfProcessing
  | typeof MatchTraderProcessor
  | typeof ManualTradeFormCard

export interface PlatformConfig {
  platformName: string
  type: string
  name: string
  description: string
  category: 'Direct Account Sync' | 'Intelligent Import' | 'Platform CSV Import'
  videoUrl?: string
  details: string
  logo: {
    path?: string
    alt?: string
    component?: ComponentType<{}>
  }
  isDisabled?: boolean
  isComingSoon?: boolean
  isRithmic?: boolean
  skipHeaderSelection?: boolean
  requiresAccountSelection?: boolean
  processFile?: (data: string[][]) => ProcessedData
  customComponent?: ComponentType<{ setIsOpen: React.Dispatch<React.SetStateAction<boolean>> }>
  customCardComponent?: ComponentType<{ accountId: string }>
  processorComponent?: ComponentType<{
    csvData: string[][]
    headers: string[]
    setProcessedTrades: React.Dispatch<React.SetStateAction<Trade[]>>
    accountNumber: string
  }>
  tutorialLink?: string
  steps: {
    id: Step
    title: StepText
    description: StepText
    component: StepComponent
    isLastStep?: boolean
  }[]
}

// Platform-specific processing functions


const processStandardCsv = (data: string[][]): ProcessedData => {
  if (data.length === 0) {
    throw new Error("The CSV file appears to be empty or invalid.")
  }
  const headers = data[0].filter(header => header && header.trim() !== '')
  return { headers, processedData: data.slice(1) };
}

const processMatchTraderCsv = (data: string[][]): ProcessedData => {
  if (data.length === 0) {
    throw new Error("The CSV file appears to be empty or invalid.")
  }
  
  // Match Trader CSV has a known header format
  const expectedHeaders = ['ID', 'Symbol', 'Open time', 'Volume', 'Side', 'Close time', 'Open price', 'Close Price', 'Stop loss', 'Take profit', 'Swap', 'Commission', 'Profit', 'Reason']
  const headers = data[0].filter(header => header && header.trim() !== '')
  
  // Verify this is a Match Trader CSV by checking for key columns
  const hasRequiredHeaders = ['Symbol', 'Open time', 'Close time', 'Volume', 'Side', 'Profit'].every(
    requiredHeader => headers.some(header => header.includes(requiredHeader))
  )
  
  if (!hasRequiredHeaders) {
    throw new Error("This doesn't appear to be a valid Match Trader CSV file. Please ensure it contains the expected columns.")
  }
  
  return { headers, processedData: data.slice(1) };
};

export const platforms: PlatformConfig[] = [
  {
    platformName: 'manual-trade-entry',
    type: 'manual-trade-entry',
    name: 'Manual Trade Entry',
    description: 'Add a single trade manually with complete details',
    category: 'Intelligent Import',
    videoUrl: '',
    details: 'Perfect for manual journal entries with all trade context and analysis',
    logo: {
      component: () => <Plus className="w-4 h-4" />,
    },
    customCardComponent: ManualTradeFormCard,
    steps: [
      {
        id: 'select-import-type',
        title: 'Select Platform',
        description: 'Choose the platform you want to import from',
        component: ImportTypeSelection
      },
      {
        id: 'preview-trades',
        title: 'Review Trades',
        description: 'Review the trades that will be imported',
        component: ManualTradeFormCard,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'csv-ai',
    type: '',
    name: 'CSV-AI',
    description: 'Import trades from any CSV file using AI',
    category: 'Intelligent Import',
    videoUrl: '',
    details: '',
    logo: {
      component: () => <Sparkles className="w-4 h-4" />,
    },
    requiresAccountSelection: true,
    processFile: processStandardCsv,
    steps: [
      {
        id: 'select-import-type',
        title: 'Select Platform',
        description: 'Choose the platform you want to import from',
        component: ImportTypeSelection
      },
      {
        id: 'upload-file',
        title: 'Upload File',
        description: 'Upload the CSV file you want to import',
        component: FileUpload
      },
      {
        id: 'map-columns',
        title: 'Map Columns',
        description: 'Map the columns in your CSV to the required fields',
        component: ColumnMapping
      },
      {
        id: 'select-account',
        title: 'Select Account',
        description: 'Select the account you want to import the trades to',
        component: AccountSelection
      },
      {
        id: 'preview-trades',
        title: 'Review Trades',
        description: 'Review the trades that will be imported',
        component: FormatPreview,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'tradezella',
    type: 'tradezella',
    name: 'Tradezella',
    description: 'Import trades from Tradezella CSV file',
    category: 'Platform CSV Import',
    videoUrl: '',
    details: '',
    logo: {
      path: '/logos/tradezella.png',
      alt: 'Tradezella Logo'
    },
    processFile: processStandardCsv,
    processorComponent: TradezellaProcessor,
    tutorialLink:'https://intercom.help/tradezella-4066d388d93c/en/articles/9725069-how-to-export-data-to-a-csv-file-from-the-trade-log-page',
    steps: [
      {
        id: 'select-import-type',
        title: 'Select Platform',
        description: 'Choose the platform you want to import from',
        component: ImportTypeSelection
      },
      {
        id: 'upload-file',
        title: 'Upload File',
        description: 'Upload the CSV file you want to import',
        component: FileUpload
      },
      {
        id: 'select-headers',
        title: 'Select Headers',
        description: 'Select the headers that contain the trade data',
        component: HeaderSelection
      },
      {
        id: 'preview-trades',
        title: 'Process Trades',
        description: 'Processing your trades',
        component: TradezellaProcessor,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'topstep',
    type: 'topstep',
    name: 'import.type.topstep.name',
    description: 'import.type.topstep.description',
    category: 'Platform CSV Import',
    details: 'import.type.topstep.details',
    logo: {
      path: '/logos/topstep.png',
      alt: 'Topstep Logo'
    },
    requiresAccountSelection: true,
    processFile: processStandardCsv,
    processorComponent: TopstepProcessor,
    tutorialLink: 'https://help.topstep.com/en/articles/9424086-exporting-trades-on-topstepx',
    steps: [
      {
        id: 'select-import-type',
        title: 'Select Platform',
        description: 'Choose the platform you want to import from',
        component: ImportTypeSelection
      },
      {
        id: 'upload-file',
        title: 'Upload File',
        description: 'Upload the CSV file you want to import',
        component: FileUpload
      },
      {
        id: 'select-headers',
        title: 'Select Headers',
        description: 'Select the headers that contain the trade data',
        component: HeaderSelection
      },
      {
        id: 'select-account',
        title: 'Select Account',
        description: 'Select the account you want to import the trades to',
        component: AccountSelection
      },
      {
        id: 'preview-trades',
        title: 'Process Trades',
        description: 'Processing your trades',
        component: TopstepProcessor,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'match-trader',
    type: 'match-trader',
    name: 'import.type.matchTrader.name',
    description: 'import.type.matchTrader.description',
    category: 'Platform CSV Import',
    details: 'import.type.matchTrader.details',
    logo: {
      path: '/logos/match-trader.png',
      alt: 'Match Trader Logo'
    },
    requiresAccountSelection: true,
    processFile: processMatchTraderCsv, // Use specialized processor
    processorComponent: MatchTraderProcessor,
    steps: [
      {
        id: 'select-import-type',
        title: 'Select Platform',
        description: 'Choose the platform you want to import from',
        component: ImportTypeSelection
      },
      {
        id: 'upload-file',
        title: 'Upload File',
        description: 'Upload the CSV file you want to import',
        component: FileUpload
      },
      {
        id: 'select-account',
        title: 'Select Account',
        description: 'Select the account you want to import the trades to',
        component: AccountSelection
      },
      {
        id: 'preview-trades',
        title: 'Process Trades',
        description: 'Processing your trades',
        component: MatchTraderProcessor,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'ibkr-pdf-import',
    type: 'ibkr-pdf-import',
    name: 'import.type.pdfImport.name',
    description: 'import.type.pdfImport.description',
    category: 'Intelligent Import',
    videoUrl: process.env.NEXT_PUBLIC_PDF_IMPORT_TUTORIAL_VIDEO || '',
    details: 'import.type.pdfImport.details',
    logo: {
      path: '/logos/ibkr.png',
      alt: 'IBKR Logo'
    },
    requiresAccountSelection: true,
    steps: [
      {
        id: 'select-import-type',
        title: 'Select Platform',
        description: 'Choose the platform you want to import from',
        component: ImportTypeSelection
      },
      {
        id: 'upload-file',
        title: 'Upload File',
        description: 'Upload the PDF file you want to import',
        component: PdfUpload
      },
      {
        id: 'process-file',
        title: 'Process File',
        description: 'Processing your file',
        component: PdfProcessing
      },
      {
        id: 'select-account',
        title: 'Select Account',
        description: 'Select the account you want to import the trades to',
        component: AccountSelection
      },
    ]
  }
] as const

export type PlatformType = typeof platforms[number]['platformName']
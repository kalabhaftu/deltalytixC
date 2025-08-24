'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useI18n } from "@/locales/client"
import { useAuth } from "@/context/auth-provider"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeft,
  RefreshCw,
  Plus,
  Search,
  Filter,
  DollarSign,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AccountStatus, PhaseType } from "@/types/prop-firm"

interface PayoutData {
  id: string
  amountRequested: number
  amountPaid: number
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  requestedAt: string
  paidAt?: string
  notes?: string
}

interface AccountData {
  id: string
  number: string
  name?: string
  propfirm: string
  status: AccountStatus
  currentEquity: number
  currentBalance: number
  isEligibleForPayout: boolean
  daysSinceFunded: number
  daysSinceLastPayout: number
  minProfitRequired?: number
  netProfitSinceLastPayout: number
}

export default function AccountPayoutsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [payouts, setPayouts] = useState<PayoutData[]>([])
  const [account, setAccount] = useState<AccountData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const accountId = params.id as string

  // Fetch account details
  const fetchAccount = async () => {
    try {
      const response = await fetch(`/api/prop-firm/accounts/${accountId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch account details')
      }

      const data = await response.json()
      if (data.success) {

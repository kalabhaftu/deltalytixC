import { useState, useEffect } from 'react'

interface Transaction {
  id: string
  accountId: string
  type: 'DEPOSIT' | 'WITHDRAWAL'
  amount: number
  description?: string
  createdAt: string
}

export function useLiveAccountTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch all transactions for all user's accounts
        const response = await fetch('/api/live-accounts/transactions')
        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch transactions')
        }

        setTransactions(result.data || [])
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch transactions')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  return { transactions, isLoading, error }
}


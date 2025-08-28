'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from "@/locales/client"
import { useAuth } from "@/context/auth-provider"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Plus, 
  TrendingUp, 
  ExternalLink, 
  Building2, 
  User, 
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Activity,
  DollarSign,
  Calendar,
  Target,
  Shield,
  Gauge
} from "lucide-react"
import { CreateLiveAccountDialog } from "../components/accounts/create-live-account-dialog"
import { CreateAccountDialog as CreatePropFirmAccountDialog } from "../components/prop-firm/create-account-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { motion } from "framer-motion"

interface UnifiedAccount {
  id: string
  number: string
  name?: string
  broker?: string
  propfirm: string
  accountType: 'prop-firm' | 'live'
  displayName: string
  startingBalance: number
  status: string
  currentPhase?: any
  tradeCount: number
  createdAt: string
  currentBalance?: number
  profitLoss?: number
  profitTarget?: number
  drawdownThreshold?: number
  lastTradeDate?: string
}

export default function AccountsPage() {
  const t = useI18n()
  const router = useRouter()
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<UnifiedAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createLiveDialogOpen, setCreateLiveDialogOpen] = useState(false)
  const [createPropFirmDialogOpen, setCreatePropFirmDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAccountForDelete, setSelectedAccountForDelete] = useState<string | null>(null)

  // Fetch all accounts
  const fetchAccounts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/accounts')
      
      if (!response.ok) {
        throw new Error('Failed to fetch accounts')
      }

      const data = await response.json()
      if (data.success) {
        setAccounts(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch accounts')
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast({
        title: t('accounts.toast.fetchError'),
        description: t('accounts.toast.fetchErrorDescription'),
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load accounts on mount
  useEffect(() => {
    if (user) {
      fetchAccounts()
    }
  }, [user])

  const handleAccountCreated = () => {
    fetchAccounts()
    setCreateLiveDialogOpen(false)
    setCreatePropFirmDialogOpen(false)
  }

  const handleDeleteAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete account')
      }

      toast({
        title: t('accounts.toast.deleteSuccess'),
        description: t('accounts.toast.deleteSuccessDescription'),
        variant: "default"
      })

      fetchAccounts()
      setSelectedAccountForDelete(null)
    } catch (error) {
      console.error('Error deleting account:', error)
      toast({
        title: t('accounts.toast.deleteError'),
        description: t('accounts.toast.deleteErrorDescription'),
        variant: "destructive"
      })
    }
  }

  // Filter accounts based on search query
  const filteredAccounts = accounts.filter(account => 
    account.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (account.broker && account.broker.toLowerCase().includes(searchQuery.toLowerCase())) ||
    account.propfirm.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const liveAccounts = filteredAccounts.filter(account => account.accountType === 'live')
  const propFirmAccounts = filteredAccounts.filter(account => account.accountType === 'prop-firm')

  const handleViewAccount = (accountId: string, accountType: string) => {
    if (accountType === 'prop-firm') {
      router.push(`/dashboard/prop-firm/accounts/${accountId}`)
    } else {
      // For live accounts, we can navigate to a general view or trades
      router.push(`/dashboard?account=${accountId}`)
    }
  }

  const AccountCard = ({ account }: { account: UnifiedAccount }) => {
    const profitLossColor = (account.profitLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'
    const statusColor = account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/20 hover:border-l-primary">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-semibold text-foreground">{account.displayName}</CardTitle>
                  <Badge className={statusColor}>
                    {account.status}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2 text-sm">
                  {account.accountType === 'prop-firm' ? (
                    <>
                      <Building2 className="h-4 w-4" />
                      {account.propfirm || t('accounts.propFirm')}
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4" />
                      {account.broker || t('accounts.liveBroker')}
                    </>
                  )}
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleViewAccount(account.id, account.accountType)}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('accounts.view')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setSelectedAccountForDelete(account.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('accounts.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Account Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  {t('accounts.accountNumber')}
                </div>
                <p className="font-mono text-sm font-medium">{account.number}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  {t('accounts.startingBalance')}
                </div>
                <p className="text-sm font-semibold">${account.startingBalance.toLocaleString()}</p>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Activity className="h-3 w-3" />
                  {t('accounts.trades')}
                </div>
                <p className="text-sm font-medium">{account.tradeCount}</p>
              </div>
              {account.profitLoss !== undefined && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    P&L
                  </div>
                  <p className={`text-sm font-semibold ${profitLossColor}`}>
                    ${account.profitLoss.toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Additional Metrics for Prop Firm Accounts */}
            {account.accountType === 'prop-firm' && (
              <div className="space-y-3">
                {account.profitTarget && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Target className="h-3 w-3" />
                      {t('accounts.profitTarget')}
                    </div>
                    <p className="text-sm font-medium">${account.profitTarget.toLocaleString()}</p>
                  </div>
                )}
                {account.currentPhase && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Gauge className="h-3 w-3" />
                      {t('accounts.currentPhase')}
                    </div>
                    <p className="text-sm font-medium capitalize">
                      {account.currentPhase.phaseType.replace('_', ' ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {account.lastTradeDate ? 
                  new Date(account.lastTradeDate).toLocaleDateString() : 
                  t('accounts.noTrades')
                }
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewAccount(account.id, account.accountType)}
                  className="h-8"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {t('accounts.view')}
                </Button>
                {account.accountType === 'prop-firm' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => router.push(`/dashboard/prop-firm/accounts/${account.id}/trades/new`)}
                    className="h-8"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {t('accounts.addTrade')}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{t('accounts.title')}</h1>
              <p className="text-muted-foreground">{t('accounts.description')}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('accounts.title')}</h1>
            <p className="text-muted-foreground">{t('accounts.description')}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setCreateLiveDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('accounts.addLiveAccount')}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setCreatePropFirmDialogOpen(true)}
              size="sm"
            >
              <Building2 className="h-4 w-4 mr-2" />
              {t('accounts.addPropFirmAccount')}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t('accounts.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredAccounts.length} {filteredAccounts.length === 1 ? 'account' : 'accounts'}
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="flex items-center gap-2">
              {t('accounts.allAccounts')} 
              <Badge variant="secondary" className="ml-1">{filteredAccounts.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="live" className="flex items-center gap-2">
              {t('accounts.liveAccounts')} 
              <Badge variant="secondary" className="ml-1">{liveAccounts.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="prop-firm" className="flex items-center gap-2">
              {t('accounts.propFirmAccounts')} 
              <Badge variant="secondary" className="ml-1">{propFirmAccounts.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6 mt-6">
            {filteredAccounts.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
                  <h3 className="text-xl font-semibold mb-3">{t('accounts.noAccounts')}</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">{t('accounts.noAccountsDescription')}</p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => setCreateLiveDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('accounts.addLiveAccount')}
                    </Button>
                    <Button variant="outline" onClick={() => setCreatePropFirmDialogOpen(true)}>
                      <Building2 className="h-4 w-4 mr-2" />
                      {t('accounts.addPropFirmAccount')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAccounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="live" className="space-y-6 mt-6">
            {liveAccounts.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <User className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
                  <h3 className="text-xl font-semibold mb-3">{t('accounts.noLiveAccounts')}</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">{t('accounts.noLiveAccountsDescription')}</p>
                  <Button onClick={() => setCreateLiveDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('accounts.addLiveAccount')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {liveAccounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="prop-firm" className="space-y-6 mt-6">
            {propFirmAccounts.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
                  <h3 className="text-xl font-semibold mb-3">{t('accounts.noPropFirmAccounts')}</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">{t('accounts.noPropFirmAccountsDescription')}</p>
                  <Button onClick={() => setCreatePropFirmDialogOpen(true)}>
                    <Building2 className="h-4 w-4 mr-2" />
                    {t('accounts.addPropFirmAccount')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {propFirmAccounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <CreateLiveAccountDialog
          open={createLiveDialogOpen}
          onOpenChange={setCreateLiveDialogOpen}
          onSuccess={handleAccountCreated}
        />

        <CreatePropFirmAccountDialog
          open={createPropFirmDialogOpen}
          onOpenChange={setCreatePropFirmDialogOpen}
          onSuccess={handleAccountCreated}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog 
          open={!!selectedAccountForDelete} 
          onOpenChange={(open) => !open && setSelectedAccountForDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('accounts.deleteConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('accounts.deleteConfirmDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => selectedAccountForDelete && handleDeleteAccount(selectedAccountForDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('accounts.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

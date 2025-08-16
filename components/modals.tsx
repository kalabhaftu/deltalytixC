'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useUserStore } from '@/store/user-store'
import LoadingOverlay from '../app/[locale]/dashboard/components/loading-overlay'
import ImportButton from '../app/[locale]/dashboard/components/import/import-button'
import { useI18n } from "@/locales/client"
import { signOut } from '@/server/auth'

import { redirect, useSearchParams } from 'next/navigation'
import OnboardingModal from './onboarding-modal'
import { AccountGroupBoard } from '@/app/[locale]/dashboard/components/filters/account-group-board'
import { useModalStateStore } from '@/store/modal-state-store'
import { useTradesStore } from '@/store/trades-store'



export default function Modals() {
  const user = useUserStore((state) => state.user)
  const isLoading = useUserStore((state) => state.isLoading)
  const trades = useTradesStore((state) => state.trades)
  const [isAlreadySubscribedOpen, setIsAlreadySubscribedOpen] = useState(false)
  const [isTradesDialogOpen, setIsTradesDialogOpen] = useState(false)
  const t = useI18n()
  const searchParams = useSearchParams()
  const { accountGroupBoardOpen, setAccountGroupBoardOpen } = useModalStateStore()

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'already_subscribed') {
      setIsAlreadySubscribedOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (!isLoading) {
      if (!trades) {
        console.warn('No trades available. Please add some trades to see the dashboard content.');
        setIsTradesDialogOpen(true)
      }
    }
  }, [trades, isLoading])



  if (!user) return null
  return (
    <>
      {isLoading && <LoadingOverlay />}
      <OnboardingModal />

      {/* Account Group Board */}
      <Dialog open={accountGroupBoardOpen} onOpenChange={setAccountGroupBoardOpen}>
        <DialogContent className="sm:max-w-[1200px] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('filters.manageAccounts')}</DialogTitle>
          </DialogHeader>
          <AccountGroupBoard/>
        </DialogContent>
      </Dialog>
      

      <Dialog open={isAlreadySubscribedOpen} onOpenChange={setIsAlreadySubscribedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('modals.subscription.title')}</DialogTitle>
            <DialogDescription>
              {t('modals.subscription.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button
              onClick={() => {
                setTimeout(() => {
                  redirect('/dashboard/billing')
                }, 100)
                  setIsAlreadySubscribedOpen(false)
              }}
            >
              {t('modals.subscription.manage')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!user?.isFirstConnection && (
        <Dialog open={isTradesDialogOpen} onOpenChange={setIsTradesDialogOpen}>
          <DialogContent>
            <DialogHeader>
            <DialogTitle>{t('modals.noTrades.title')}</DialogTitle>
            <DialogDescription>
              {t('modals.noTrades.description')}
            </DialogDescription>
          </DialogHeader>
          <ImportButton />
        </DialogContent>
      </Dialog>
      )}


    </>
  )
}
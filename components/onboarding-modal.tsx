'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useData } from '@/context/data-provider'
import { useI18n, useCurrentLocale } from '@/locales/client'
import { useUserStore } from '@/store/user-store'
import { logger } from '@/lib/logger'

export default function OnboardingModal() {
  const { isFirstConnection, changeIsFirstConnection } = useData()
  const t = useI18n()
  const locale = useCurrentLocale()

  // Onboarding video removed - feature not implemented
  const videoIds = {
    en: '',
    fr: ''
  }

  const handleClose = async () => {
    try {
      changeIsFirstConnection(false)
    } catch (error) {
      logger.error('Failed to update onboarding status', error, 'Onboarding')
    }
  }

  return (
    <Dialog open={isFirstConnection} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
                                                   {t('onboarding.welcome') as any}
          </DialogTitle>
          <DialogDescription>
                                                   {t('onboarding.description') as any}
          </DialogDescription>
        </DialogHeader>

        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${videoIds[locale as keyof typeof videoIds]}`}
            title="Welcome Tutorial"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleClose}>
                                                   {t('onboarding.getStarted') as any}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 
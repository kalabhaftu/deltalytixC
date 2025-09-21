'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useData } from '@/context/data-provider'
import { useI18n } from '@/lib/translations/client'
import { logger } from '@/lib/logger'

export default function OnboardingModal() {
  const { isFirstConnection, changeIsFirstConnection } = useData()
  const t = useI18n()


  const handleClose = async (open: boolean) => {
    if (!open) {
      try {
        await changeIsFirstConnection(false)
      } catch (error) {
        logger.error('Failed to update onboarding status', error, 'Onboarding')
      }
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


        <div className="mt-6 flex justify-end">
          <Button onClick={() => handleClose(false)}>
                                                   {t('onboarding.getStarted') as any}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 
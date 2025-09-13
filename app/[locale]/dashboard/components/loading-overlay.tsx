import React from 'react'
import { useI18n } from "@/locales/client"
import { LoadingToast } from '@/components/ui/loading'

export default function LoadingOverlay() {
  const t = useI18n()
  
  return <LoadingToast text={t('loading.trades')} />
}
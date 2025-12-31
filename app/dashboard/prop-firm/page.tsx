import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function PropFirmPage() {
  redirect('/dashboard/accounts?filter=prop-firm')
}

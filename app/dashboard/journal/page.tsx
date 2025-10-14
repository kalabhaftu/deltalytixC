import { JournalClient } from './components/journal-client'

// Enable dynamic rendering to respect account filters
export const dynamic = 'force-dynamic'

// Client Component page - uses filtered data from context
export default function JournalPage() {
  return <JournalClient />
}

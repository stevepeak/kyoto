import { type Metadata } from 'next'

import { VibePromptsPage } from '@/components/pages/vibe-prompts-page'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Vibe Prompts',
  description: 'Free prompts that improve your vibe coding experience',
}

export default async function VibePromptsRoute() {
  return <VibePromptsPage />
}

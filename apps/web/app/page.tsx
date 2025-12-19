import { type Metadata } from 'next'

import { HomePage } from '@/components/pages/home-page'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Kyoto',
  description: 'Kyoto',
}

export default async function Page() {
  return <HomePage />
}

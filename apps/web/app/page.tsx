import type { Metadata } from 'next'

import {
  LandingNavbar,
  LandingHero,
  FeatureGrid,
  Metrics,
  Testimonials,
  Pricing,
  Faq,
  LandingFooter,
} from '@/components/landing'

export const metadata: Metadata = {
  title: 'Kyoto - testing in the age of vibe',
  description: 'testing in the age of vibe',
  openGraph: {
    title: 'Kyoto - testing in the age of vibe',
    description: 'testing in the age of vibe',
    url: 'https://usekyoto.com',
    siteName: 'Kyoto',
    type: 'website',
  },
}

// Landing page can be statically generated and cached
export const dynamic = 'force-static'
export const revalidate = 3600 // Revalidate every hour

export default function HomePage() {
  return (
    <div>
      <LandingNavbar />
      <LandingHero />
      <FeatureGrid />
      <Metrics />
      <Testimonials />
      <Pricing />
      <Faq />
      <LandingFooter />
    </div>
  )
}

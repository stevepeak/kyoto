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

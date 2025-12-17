import { type Metadata } from 'next'
import localFont from 'next/font/local'
import Script from 'next/script'
import { type ReactNode } from 'react'

import { Navbar } from '@/components/layout/navbar'
import { PostHogProvider } from '@/components/providers/posthog-provider'
import { TRPCProvider } from '@/components/providers/trpc-provider'
import { Toaster } from '@/components/ui/toaster'

import './globals.css'

const cormorantGaramond = localFont({
  src: [
    {
      path: '../public/fonts/cormorant-garamond/CormorantGaramond-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/cormorant-garamond/CormorantGaramond-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/cormorant-garamond/CormorantGaramond-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-cormorant',
  display: 'swap',
  fallback: ['Times New Roman', 'serif'],
})

export const metadata: Metadata = {
  title: 'Kyoto',
  description: 'Kyoto - Vibe coding tools for the developers of tomorrow.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line no-process-env */}
        {process.env.NODE_ENV === 'development' && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className={cormorantGaramond.variable}>
        <TRPCProvider>
          <PostHogProvider>
            <Navbar />
            {children}
            <Toaster />
          </PostHogProvider>
        </TRPCProvider>
      </body>
    </html>
  )
}

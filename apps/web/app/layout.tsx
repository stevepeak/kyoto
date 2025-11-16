import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'

import { AppProvider } from '@/components/providers/app-provider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

const manrope = localFont({
  src: [
    {
      path: '../public/fonts/manrope/Manrope-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/manrope/Manrope-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/manrope/Manrope-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/manrope/Manrope-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-manrope',
  display: 'swap',
  fallback: ['DM Sans', 'Inter', 'sans-serif'],
})

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
  title: 'Kyoto - Intent Testing',
  description: 'AI-powered QA',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://api.github.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://api.github.com" />
      </head>
      <body
        className={`${inter.variable} ${manrope.variable} ${cormorantGaramond.variable}`}
      >
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  )
}

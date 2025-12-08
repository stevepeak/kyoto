import { type Metadata } from 'next'
import localFont from 'next/font/local'

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
  title: 'Web2 - Next.js App',
  description: 'Simple Next.js app with Tailwind and shadcn',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={cormorantGaramond.variable}>{children}</body>
    </html>
  )
}

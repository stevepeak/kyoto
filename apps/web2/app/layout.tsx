import { type Metadata } from 'next'

import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}

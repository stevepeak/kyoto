'use client'

import { useEffect, useState } from 'react'

export function PageTransitionLoader() {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const handleStart = () => setIsLoading(true)
    const handleEnd = () => {
      // Small delay to ensure smooth transition
      setTimeout(() => setIsLoading(false), 100)
    }

    // Astro view transition events
    document.addEventListener('astro:before-preparation', handleStart)
    document.addEventListener('astro:after-swap', handleEnd)
    document.addEventListener('astro:page-load', handleEnd)

    return () => {
      document.removeEventListener('astro:before-preparation', handleStart)
      document.removeEventListener('astro:after-swap', handleEnd)
      document.removeEventListener('astro:page-load', handleEnd)
    }
  }, [])

  if (!isLoading) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50 pointer-events-none">
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{
          width: '30%',
          animation: 'shimmer 1.5s ease-in-out infinite',
        }}
      />
      <style>
        {`
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            50% {
              transform: translateX(400%);
            }
            100% {
              transform: translateX(400%);
            }
          }
        `}
      </style>
    </div>
  )
}

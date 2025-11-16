'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function PageTransitionLoader() {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional state update for loading indicator
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 100)
    return () => clearTimeout(timer)
  }, [pathname])

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

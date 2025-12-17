import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type CursorIconProps = ComponentProps<'svg'>

export function CursorIcon({ className, ...props }: CursorIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-4', className)}
      {...props}
    >
      {/* Main 3D cube shape with prominent triangular facet */}
      <path
        d="M12 3L4 7.5L12 12L20 7.5L12 3Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <path
        d="M4 7.5L12 12L12 21L4 16.5L4 7.5Z"
        fill="currentColor"
        fillOpacity="0.6"
      />
      <path
        d="M12 12L20 7.5L20 16.5L12 21L12 12Z"
        fill="currentColor"
        fillOpacity="0.4"
      />
      {/* Prominent triangular facet on front face */}
      <path
        d="M12 3L8 5.25L12 7.5L16 5.25L12 3Z"
        fill="currentColor"
        fillOpacity="1"
      />
    </svg>
  )
}

import { forwardRef, type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'

import { Button, type buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type VariantProps } from 'class-variance-authority'

interface ShimmerButtonProps
  extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  icon?: LucideIcon
  isLoading?: boolean
  loadingText?: string
  children: ReactNode
}

const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      icon: Icon,
      isLoading = false,
      loadingText,
      children,
      className,
      disabled,
      variant = 'outline',
      size,
      ...props
    },
    ref,
  ) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        disabled={disabled || isLoading}
        className={cn(
          'relative overflow-hidden',
          'border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10',
          'hover:from-primary/20 hover:via-primary/10 hover:to-primary/20 hover:border-primary/50',
          'shadow-sm hover:shadow-md backdrop-blur-sm',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      >
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent shimmer-effect" />
        {Icon && <Icon className="h-4 w-4 text-primary relative z-10" />}
        <span className="relative z-10">
          {isLoading && loadingText ? loadingText : children}
        </span>
      </Button>
    )
  },
)

ShimmerButton.displayName = 'ShimmerButton'

export { ShimmerButton }

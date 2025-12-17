import { type ComponentProps, forwardRef } from 'react'

import { CursorIcon } from '@/components/icons/cursor-icon'
import { Button, type buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type VariantProps } from 'class-variance-authority'

type AddToCursorButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants>

const AddToCursorButton = forwardRef<HTMLButtonElement, AddToCursorButtonProps>(
  ({ className, variant = 'outline', size, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(className)}
        {...props}
      >
        <CursorIcon />
        <span>Add to Cursor</span>
      </Button>
    )
  },
)

AddToCursorButton.displayName = 'AddToCursorButton'

export { AddToCursorButton }

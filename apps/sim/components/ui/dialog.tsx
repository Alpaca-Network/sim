'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, style, ...props }, ref) => {
    const [isStable, setIsStable] = React.useState(false)

    React.useEffect(() => {
      // Add a small delay before allowing overlay interactions to prevent rapid state changes
      const timer = setTimeout(() => setIsStable(true), 150)
      return () => clearTimeout(timer)
    }, [])

    return (
      <div
        ref={ref}
        className={cn('fixed inset-0 z-50 bg-white/50 dark:bg-black/50', className)}
        style={{ backdropFilter: 'blur(1.5px)', ...style }}
        onPointerDown={(e) => {
          // Only allow overlay clicks after component is stable
          if (!isStable) {
            e.preventDefault()
            return
          }
          // Ensure click is on the overlay itself, not a child
          if (e.target !== e.currentTarget) {
            e.preventDefault()
          }
        }}
        {...props}
      />
    )
  }
)
DialogOverlay.displayName = 'DialogOverlay'

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    hideCloseButton?: boolean
  }
>(({ className, children, hideCloseButton = false, ...props }, ref) => {
  const [isInteractionReady, setIsInteractionReady] = React.useState(false)

  React.useEffect(() => {
    // Prevent rapid interactions that can cause instability
    const timer = setTimeout(() => setIsInteractionReady(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <DialogOverlay />
      <div
        ref={ref}
        role='dialog'
        className={cn(
          'fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[8px] border border-border bg-background p-6 shadow-lg',
          className
        )}
        onPointerDown={(e) => {
          // Prevent event bubbling that might interfere with parent hover states
          e.stopPropagation()
        }}
        onPointerUp={(e) => {
          // Prevent event bubbling that might interfere with parent hover states
          e.stopPropagation()
        }}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <button
            className='absolute top-4 right-4 h-4 w-4 p-0 text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground focus:outline-none disabled:pointer-events-none'
            disabled={!isInteractionReady}
            tabIndex={-1}
            onClick={() => {
              const event = new CustomEvent('dialog-close')
              window.dispatchEvent(event)
            }}
          >
            <X className='h-4 w-4' />
            <span className='sr-only'>Close</span>
          </button>
        )}
      </div>
    </div>
  )
})
DialogContent.displayName = 'DialogContent'

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('font-medium text-lg leading-none tracking-tight', className)}
      {...props}
    />
  )
)
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-muted-foreground text-sm', className)} {...props} />
))
DialogDescription.displayName = 'DialogDescription'

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

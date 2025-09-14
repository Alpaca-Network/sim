'use client'

import * as React from 'react'
import { Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputOTPProps {
  maxLength: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  containerClassName?: string
  children: React.ReactNode
}

const InputOTPContext = React.createContext<{
  value: string
  onChange: (value: string) => void
  maxLength: number
  disabled?: boolean
}>({
  value: '',
  onChange: () => {},
  maxLength: 6,
  disabled: false,
})

const InputOTP = React.forwardRef<
  HTMLDivElement,
  InputOTPProps
>(({ className, containerClassName, maxLength, value, onChange, disabled, children, ...props }, ref) => {
  return (
    <InputOTPContext.Provider value={{ value, onChange, maxLength, disabled }}>
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-2',
          disabled && 'opacity-50',
          containerClassName
        )}
        {...props}
      >
        {children}
      </div>
    </InputOTPContext.Provider>
  )
})
InputOTP.displayName = 'InputOTP'

const InputOTPGroup = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center', className)} {...props} />
))
InputOTPGroup.displayName = 'InputOTPGroup'

const InputOTPSlot = React.forwardRef<
  React.ElementRef<'input'>,
  React.ComponentPropsWithoutRef<'input'> & { index: number }
>(({ index, className, ...props }, ref) => {
  const { value, onChange, maxLength, disabled } = React.useContext(InputOTPContext)
  const char = value[index] || ''
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (newValue.length <= 1 && /^[0-9]*$/.test(newValue)) {
      const newOtp = value.split('')
      newOtp[index] = newValue
      onChange(newOtp.join(''))
      
      if (newValue && index < maxLength - 1) {
        const target = e.target as HTMLInputElement
        const nextInput = target.parentElement?.parentElement?.querySelector(`input:nth-child(${index + 2})`) as HTMLInputElement
        nextInput?.focus()
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !char && index > 0) {
      const target = e.target as HTMLInputElement
      const prevInput = target.parentElement?.parentElement?.querySelector(`input:nth-child(${index})`) as HTMLInputElement
      prevInput?.focus()
    }
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={char}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={cn(
        'relative flex h-12 w-12 items-center justify-center border-input border-y border-r font-semibold text-lg text-center shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md focus:z-10 focus:ring-2 focus:ring-primary focus:ring-offset-1',
        className
      )}
      {...props}
    />
  )
})
InputOTPSlot.displayName = 'InputOTPSlot'

const InputOTPSeparator = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(({ ...props }, ref) => (
  <div ref={ref} role='separator' className='text-muted-foreground' {...props}>
    <Minus />
  </div>
))
InputOTPSeparator.displayName = 'InputOTPSeparator'

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }

'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface AriaLabelsProps {
  children: React.ReactNode
  className?: string
  role?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-live'?: 'polite' | 'assertive' | 'off'
  'aria-expanded'?: boolean
  'aria-pressed'?: boolean
  'aria-selected'?: boolean
  'aria-hidden'?: boolean
  'aria-disabled'?: boolean
  'aria-required'?: boolean
  'aria-invalid'?: boolean
  'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false'
  tabIndex?: number
}

export function AriaLabels({
  children,
  className = '',
  role,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  'aria-live': ariaLive,
  'aria-expanded': ariaExpanded,
  'aria-pressed': ariaPressed,
  'aria-selected': ariaSelected,
  'aria-hidden': ariaHidden,
  'aria-disabled': ariaDisabled,
  'aria-required': ariaRequired,
  'aria-invalid': ariaInvalid,
  'aria-current': ariaCurrent,
  tabIndex,
  ...props
}: AriaLabelsProps) {
  return (
    <div
      className={cn(className)}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      aria-live={ariaLive}
      aria-expanded={ariaExpanded}
      aria-pressed={ariaPressed}
      aria-selected={ariaSelected}
      aria-hidden={ariaHidden}
      aria-disabled={ariaDisabled}
      aria-required={ariaRequired}
      aria-invalid={ariaInvalid}
      aria-current={ariaCurrent}
      tabIndex={tabIndex}
      {...props}
    >
      {children}
    </div>
  )
}

// Screen reader only text
export function ScreenReaderText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'sr-only',
        className
      )}
    >
      {children}
    </span>
  )
}

// Live region for dynamic content
export function LiveRegion({ 
  children, 
  className = '', 
  'aria-live': ariaLive = 'polite' 
}: { 
  children: React.ReactNode; 
  className?: string; 
  'aria-live'?: 'polite' | 'assertive' | 'off' 
}) {
  return (
    <div
      className={cn('sr-only', className)}
      aria-live={ariaLive}
      aria-atomic="true"
    >
      {children}
    </div>
  )
} 
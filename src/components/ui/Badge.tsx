'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { colors } from '@/lib/design-tokens'

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      children,
      className,
      ...props
    },
    ref
  ) => {
    const baseClasses = cn(
      // Base styles
      'inline-flex items-center justify-center font-medium rounded-full',
      'transition-colors duration-200',
      
      // Size variants
      size === 'sm' && 'px-2 py-0.5 text-xs',
      size === 'md' && 'px-2.5 py-0.5 text-sm',
      size === 'lg' && 'px-3 py-1 text-base',
      
      // Variant styles
      variant === 'default' && [
        'bg-gray-100 text-gray-800',
        'hover:bg-gray-200',
      ],
      variant === 'success' && [
        'bg-green-100 text-green-800',
        'hover:bg-green-200',
      ],
      variant === 'warning' && [
        'bg-yellow-100 text-yellow-800',
        'hover:bg-yellow-200',
      ],
      variant === 'danger' && [
        'bg-red-100 text-red-800',
        'hover:bg-red-200',
      ],
      variant === 'info' && [
        'bg-blue-100 text-blue-800',
        'hover:bg-blue-200',
      ],
      variant === 'outline' && [
        'bg-transparent text-gray-600',
        'border border-gray-300',
        'hover:bg-gray-50',
      ],
      
      className
    )

    return (
      <span
        ref={ref}
        className={baseClasses}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge } 
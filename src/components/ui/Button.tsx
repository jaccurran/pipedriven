'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { colors, typography, spacing, borderRadius, transitions } from '@/lib/design-tokens'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  children: React.ReactNode
  onClick?: () => void
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      icon,
      iconPosition = 'left',
      children,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const baseClasses = cn(
      // Base styles
      'inline-flex items-center justify-center font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'active:scale-95',
      
      // Size variants
      size === 'sm' && 'h-8 px-3 text-sm',
      size === 'md' && 'h-10 px-4 text-base',
      size === 'lg' && 'h-12 px-6 text-lg',
      
      // Variant styles
      variant === 'primary' && [
        'bg-blue-600 text-white hover:bg-blue-700',
        'focus:ring-blue-500',
        'border border-transparent',
      ],
      variant === 'secondary' && [
        'bg-gray-100 text-gray-900 hover:bg-gray-200',
        'focus:ring-gray-500',
        'border border-gray-300',
      ],
      variant === 'outline' && [
        'bg-transparent text-blue-600 hover:bg-blue-50',
        'focus:ring-blue-500',
        'border border-blue-600',
      ],
      variant === 'ghost' && [
        'bg-transparent text-gray-700 hover:bg-gray-100',
        'focus:ring-gray-500',
        'border border-transparent',
      ],
      variant === 'danger' && [
        'bg-red-600 text-white hover:bg-red-700',
        'focus:ring-red-500',
        'border border-transparent',
      ],
      
      // Border radius
      'rounded-md',
      
      className
    )

    const iconClasses = cn(
      'flex-shrink-0',
      size === 'sm' && 'w-4 h-4',
      size === 'md' && 'w-5 h-5',
      size === 'lg' && 'w-6 h-6',
      iconPosition === 'left' && 'mr-2',
      iconPosition === 'right' && 'ml-2'
    )

    const contentClasses = cn(
      'flex items-center justify-center',
      loading && 'opacity-0'
    )

    const loadingSpinner = (
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          className={cn(
            'animate-spin',
            size === 'sm' && 'w-4 h-4',
            size === 'md' && 'w-5 h-5',
            size === 'lg' && 'w-6 h-6'
          )}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    )

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) {
        e.preventDefault()
        return
      }
      onClick?.(e)
    }

    return (
      <button
        ref={ref}
        className={cn(baseClasses, 'relative')}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {loading && loadingSpinner}
        <span className={contentClasses}>
          {icon && iconPosition === 'left' && (
            <span className={iconClasses}>{icon}</span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className={iconClasses}>{icon}</span>
          )}
        </span>
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button } 
'use client'

import React from 'react'
import { cn } from '@/lib/utils'


export interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined'
  padding?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  onClick?: () => void
  className?: string
  draggable?: boolean
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void
  'data-testid'?: string
  'aria-label'?: string
  tabIndex?: number
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      children,
      onClick,
      className,
      ...props
    },
    ref
  ) => {
    const baseClasses = cn(
      // Base styles
      'rounded-lg transition-all duration-200',
      
      // Padding variants
      padding === 'sm' && 'p-4',
      padding === 'md' && 'p-6',
      padding === 'lg' && 'p-8',
      
      // Variant styles
      variant === 'default' && [
        'bg-white border border-gray-200',
        'hover:border-gray-300',
      ],
      variant === 'elevated' && [
        'bg-white border border-gray-200 shadow-lg',
        'hover:shadow-xl hover:border-gray-300',
      ],
      variant === 'outlined' && [
        'bg-transparent border-2 border-gray-200',
        'hover:border-gray-300',
      ],
      
      // Clickable styles
      onClick && [
        'cursor-pointer',
        'hover:scale-[1.02]',
        'active:scale-[0.98]',
      ],
      
      className
    )

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (onClick) {
        e.preventDefault()
        onClick()
      }
    }

    return (
      <div
        ref={ref}
        className={baseClasses}
        onClick={handleClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onClick()
          }
        }}
        data-testid="card"
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Card subcomponents
export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-lg font-semibold leading-none tracking-tight', className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-sm text-gray-600', className)}>
      {children}
    </p>
  );
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('p-6 pt-0', className)}>
      {children}
    </div>
  );
}

export { Card } 
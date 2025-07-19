'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface ShortcodeBadgeProps {
  shortcode: string
  campaignName?: string
  className?: string
  showCopyButton?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
}

export function ShortcodeBadge({
  shortcode,
  campaignName,
  className = '',
  showCopyButton = false,
  size = 'sm',
  variant = 'default'
}: ShortcodeBadgeProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortcode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy shortcode:', error)
    }
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const variantClasses = {
    default: 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100',
    outline: 'bg-transparent text-blue-700 border border-blue-300 hover:bg-blue-50',
    ghost: 'bg-transparent text-blue-600 hover:bg-blue-50'
  }

  const baseClasses = cn(
    'inline-flex items-center font-mono font-medium rounded-md transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    sizeClasses[size],
    variantClasses[variant],
    className
  )

  const tooltipText = campaignName ? `${shortcode} - ${campaignName}` : shortcode

  return (
    <div className="group relative inline-block">
      <button
        type="button"
        className={cn(
          baseClasses,
          showCopyButton && 'cursor-pointer',
          !showCopyButton && 'cursor-default'
        )}
        onClick={showCopyButton ? handleCopy : undefined}
        title={tooltipText}
        data-testid="shortcode-badge"
      >
        {shortcode}
        {showCopyButton && (
          <svg
            className={cn(
              'ml-1.5 transition-opacity',
              size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5',
              copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {copied ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            )}
          </svg>
        )}
      </button>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        {tooltipText}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  )
} 
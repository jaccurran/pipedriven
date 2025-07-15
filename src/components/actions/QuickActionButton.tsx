import React from 'react'
import { cn } from '@/lib/utils'

export type ActionType = 'EMAIL' | 'MEETING_REQUEST' | 'MEETING'

interface QuickActionButtonProps {
  type: ActionType
  onClick: (type: ActionType) => void
  contactName: string
  disabled?: boolean
  loading?: boolean
  className?: string
}

const actionConfig = {
  EMAIL: {
    label: 'Email',
    icon: '📧',
    ariaLabel: (name: string) => `Log email sent to ${name}`,
  },
  MEETING_REQUEST: {
    label: 'Meeting Request',
    icon: '📅',
    ariaLabel: (name: string) => `Log meeting request for ${name}`,
  },
  MEETING: {
    label: 'Meeting',
    icon: '🤝',
    ariaLabel: (name: string) => `Log meeting with ${name}`,
  },
}

export function QuickActionButton({
  type,
  onClick,
  contactName,
  disabled = false,
  loading = false,
  className,
}: QuickActionButtonProps) {
  const config = actionConfig[type]
  const isDisabled = disabled || loading

  const handleClick = () => {
    if (!isDisabled) {
      onClick(type)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={config.ariaLabel(contactName)}
      aria-busy={loading ? 'true' : undefined}
      data-testid={`contact-${type.toLowerCase()}-action`}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'hover:bg-gray-100 active:bg-gray-200',
        'border border-gray-300 bg-white text-gray-700',
        className
      )}
    >
      <span className="text-base">{config.icon}</span>
      <span>{config.label}</span>
      {loading && (
        <svg
          className="animate-spin h-4 w-4 text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
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
      )}
    </button>
  )
} 
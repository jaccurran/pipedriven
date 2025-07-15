'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface QuickActionToggleProps {
  mode: 'SIMPLE' | 'DETAILED'
  onModeChange: (mode: 'SIMPLE' | 'DETAILED') => void
  className?: string
}

export function QuickActionToggle({ mode, onModeChange, className }: QuickActionToggleProps) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => onModeChange('SIMPLE')}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200',
            mode === 'SIMPLE'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
          data-testid="simple-mode-toggle"
        >
          Simple
        </button>
        <button
          type="button"
          onClick={() => onModeChange('DETAILED')}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200',
            mode === 'DETAILED'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
          data-testid="detailed-mode-toggle"
        >
          Detailed
        </button>
      </div>
      <div className="text-xs text-gray-500">
        {mode === 'SIMPLE' ? 'One-click logging' : 'Modal with notes'}
      </div>
    </div>
  )
} 
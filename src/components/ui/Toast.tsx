'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { createPortal } from 'react-dom'

export interface ToastProps {
  id: string
  type?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  onClose: (id: string) => void
  className?: string
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      id,
      type = 'info',
      title,
      message,
      duration = 5000,
      onClose,
      className,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(false)
    const [isExiting, setIsExiting] = useState(false)

    useEffect(() => {
      // Show toast with animation
      const showTimer = setTimeout(() => {
        setIsVisible(true)
      }, 100)

      // Auto-dismiss
      const dismissTimer = setTimeout(() => {
        handleClose()
      }, duration)

      return () => {
        clearTimeout(showTimer)
        clearTimeout(dismissTimer)
      }
    }, [duration])

    const handleClose = () => {
      setIsExiting(true)
      setTimeout(() => {
        onClose(id)
      }, 300) // Match transition duration
    }

    const typeConfig = {
      success: {
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        ),
        classes: 'bg-green-50 border-green-200 text-green-800',
        iconClasses: 'text-green-400',
      },
      error: {
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        ),
        classes: 'bg-red-50 border-red-200 text-red-800',
        iconClasses: 'text-red-400',
      },
      warning: {
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ),
        classes: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        iconClasses: 'text-yellow-400',
      },
      info: {
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        ),
        classes: 'bg-blue-50 border-blue-200 text-blue-800',
        iconClasses: 'text-blue-400',
      },
    }

    const config = typeConfig[type]

    const toastContent = (
      <div
        ref={ref}
        className={cn(
          'fixed top-4 right-4 z-50 max-w-sm w-full',
          'transform transition-all duration-300 ease-in-out',
          isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
          className
        )}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        {...props}
      >
        <div
          className={cn(
            'rounded-lg border p-4 shadow-lg',
            config.classes
          )}
        >
          <div className="flex items-start">
            <div className={cn('flex-shrink-0', config.iconClasses)}>
              {config.icon}
            </div>
            <div className="ml-3 flex-1">
              {title && (
                <p className="text-sm font-medium">
                  {title}
                </p>
              )}
              <p className="text-sm">
                {message}
              </p>
            </div>
            <div className="ml-4 flex flex-shrink-0">
              <button
                type="button"
                className={cn(
                  'inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2',
                  type === 'success' && 'focus:ring-green-500',
                  type === 'error' && 'focus:ring-red-500',
                  type === 'warning' && 'focus:ring-yellow-500',
                  type === 'info' && 'focus:ring-blue-500'
                )}
                onClick={handleClose}
                aria-label="Close notification"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    )

    return createPortal(toastContent, document.body)
  }
)

Toast.displayName = 'Toast'

export { Toast } 
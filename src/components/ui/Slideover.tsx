'use client'

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { createPortal } from 'react-dom'

export interface SlideoverProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  position?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
  className?: string
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
}

const Slideover = React.forwardRef<HTMLDivElement, SlideoverProps>(
  (
    {
      isOpen,
      onClose,
      title,
      position = 'right',
      size = 'md',
      children,
      className,
      closeOnBackdropClick = true,
      closeOnEscape = true,
      showCloseButton = true,
      ...props
    },
    ref
  ) => {
    const slideoverRef = useRef<HTMLDivElement>(null)
    const previousFocusRef = useRef<HTMLElement | null>(null)

    // Handle escape key
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && closeOnEscape) {
          onClose()
        }
      }

      if (isOpen) {
        document.addEventListener('keydown', handleEscape)
        // Store the currently focused element
        previousFocusRef.current = document.activeElement as HTMLElement
        // Focus the slideover
        slideoverRef.current?.focus()
      }

      return () => {
        document.removeEventListener('keydown', handleEscape)
        // Restore focus when slideover closes
        if (!isOpen && previousFocusRef.current) {
          previousFocusRef.current.focus()
        }
      }
    }, [isOpen, onClose, closeOnEscape])

    // Prevent body scroll when slideover is open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = 'unset'
      }

      return () => {
        document.body.style.overflow = 'unset'
      }
    }, [isOpen])

    // Handle backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && closeOnBackdropClick) {
        onClose()
      }
    }

    // Handle slideover click to prevent bubbling
    const handleSlideoverClick = (e: React.MouseEvent) => {
      e.stopPropagation()
    }

    if (!isOpen) return null

    const sizeClasses = {
      sm: 'w-80',
      md: 'w-96',
      lg: 'w-[32rem]',
      xl: 'w-[40rem]',
      full: 'w-full',
    }

    const positionClasses = {
      left: 'left-0',
      right: 'right-0',
    }

    const transformClasses = {
      left: isOpen ? 'translate-x-0' : '-translate-x-full',
      right: isOpen ? 'translate-x-0' : 'translate-x-full',
    }

    const slideoverContent = (
      <div
        className="fixed inset-0 z-50 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'slideover-title' : undefined}
      >
        {/* Backdrop */}
        <div
          className={cn(
            'fixed inset-0 transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'opacity-0'
          )}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={handleBackdropClick}
          aria-hidden="true"
        />

        {/* Slideover container */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div
              ref={slideoverRef}
              className={cn(
                'absolute inset-y-0 flex flex-col bg-white shadow-xl',
                'transform transition-transform duration-300 ease-in-out',
                positionClasses[position],
                sizeClasses[size],
                transformClasses[position],
                className
              )}
              onClick={handleSlideoverClick}
              tabIndex={-1}
              {...props}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  {title && (
                    <h2
                      id="slideover-title"
                      className="text-lg font-semibold text-gray-900"
                    >
                      {title}
                    </h2>
                  )}
                  {showCloseButton && (
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={onClose}
                      aria-label="Close slideover"
                    >
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-4">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )

    // Use portal to render slideover at the end of body
    return createPortal(slideoverContent, document.body)
  }
)

Slideover.displayName = 'Slideover'

export { Slideover } 
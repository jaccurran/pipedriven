'use client'

import React, { useRef, useState, useEffect } from 'react'
import { useTouchGestures } from '@/hooks/useTouchGestures'
import { useFocusManagement } from '@/hooks/useFocusManagement'
import { cn } from '@/lib/utils'

export interface MobileLayoutProps {
  children: React.ReactNode
  className?: string
  showSidebar?: boolean
  onSidebarToggle?: (show: boolean) => void
  sidebarContent?: React.ReactNode
  headerContent?: React.ReactNode
  footerContent?: React.ReactNode
  enableGestures?: boolean
  enableFocusTrap?: boolean
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

export function MobileLayout({
  children,
  className = '',
  showSidebar = false,
  onSidebarToggle,
  sidebarContent,
  headerContent,
  footerContent,
  enableGestures = true,
  enableFocusTrap = false,
  onSwipeLeft,
  onSwipeRight,
}: MobileLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(showSidebar)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Touch gestures for mobile navigation
  const { touchState } = useTouchGestures(containerRef as React.RefObject<HTMLElement>, {
    onSwipeLeft: () => {
      if (isSidebarOpen) {
        closeSidebar()
      }
      onSwipeLeft?.()
    },
    onSwipeRight: () => {
      if (!isSidebarOpen && sidebarContent) {
        openSidebar()
      }
      onSwipeRight?.()
    },
    minSwipeDistance: 50,
  })

  // Focus management for accessibility
  const focusManagement = useFocusManagement(sidebarRef as React.RefObject<HTMLElement>, {
    trapFocus: enableFocusTrap && isSidebarOpen,
    restoreFocus: true,
    keyboardShortcuts: {
      'escape': () => {
        if (isSidebarOpen) {
          closeSidebar()
        }
      },
    },
  })

  // Handle sidebar state changes
  useEffect(() => {
    setIsSidebarOpen(showSidebar)
  }, [showSidebar])

  const openSidebar = () => {
    if (isSidebarOpen) return
    
    setIsTransitioning(true)
    setIsSidebarOpen(true)
    onSidebarToggle?.(true)
    
    // Focus first element in sidebar when it opens
    setTimeout(() => {
      focusManagement.focusFirst()
      setIsTransitioning(false)
    }, 100)
  }

  const closeSidebar = () => {
    if (!isSidebarOpen) return
    
    setIsTransitioning(true)
    setIsSidebarOpen(false)
    onSidebarToggle?.(false)
    
    setTimeout(() => {
      setIsTransitioning(false)
    }, 300)
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeSidebar()
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative min-h-screen bg-gray-50',
        'flex flex-col',
        'touch-manipulation', // Optimize touch interactions
        className
      )}
      style={{
        // Prevent zoom on double tap
        touchAction: 'manipulation',
      }}
    >
      {/* Header */}
      {headerContent && (
        <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            {headerContent}
          </div>
        </header>
      )}

      {/* Main content area */}
      <div className="flex flex-1 relative">
        {/* Sidebar */}
        {sidebarContent && (
          <>
            {/* Backdrop */}
            {isSidebarOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
                onClick={handleBackdropClick}
                aria-hidden="true"
              />
            )}

            {/* Sidebar */}
            <div
              ref={sidebarRef}
              className={cn(
                'fixed left-0 top-0 h-full w-80 bg-white shadow-xl z-50',
                'transform transition-transform duration-300 ease-in-out',
                'flex flex-col',
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
                isTransitioning && 'transition-transform duration-300'
              )}
              role="navigation"
              aria-label="Main navigation"
            >
              {/* Sidebar header */}
              <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                <button
                  onClick={closeSidebar}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Sidebar content */}
              <div className="flex-1 overflow-y-auto">
                {sidebarContent}
              </div>
            </div>
          </>
        )}

        {/* Main content */}
        <main
          className={cn(
            'flex-1 flex flex-col',
            'min-w-0', // Prevent flex item from overflowing
            'transition-all duration-300 ease-in-out',
            sidebarContent && isSidebarOpen && 'ml-80'
          )}
        >
          {/* Content wrapper */}
          <div className="flex-1 flex flex-col">
            {/* Page content */}
            <div className="flex-1 p-4 sm:p-6">
              {children}
            </div>

            {/* Footer */}
            {footerContent && (
              <footer className="bg-white border-t border-gray-200 p-4">
                {footerContent}
              </footer>
            )}
          </div>
        </main>
      </div>

      {/* Touch feedback indicator */}
      {enableGestures && touchState.isTouching && (
        <div
          className="fixed pointer-events-none z-50 w-4 h-4 bg-blue-500 rounded-full opacity-50"
          style={{
            left: touchState.currentX - 8,
            top: touchState.currentY - 8,
            transform: 'scale(1.5)',
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}
    </div>
  )
} 
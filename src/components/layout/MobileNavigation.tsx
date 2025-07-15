'use client'

import React, { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTouchGestures } from '@/hooks/useTouchGestures'
import { useFocusManagement } from '@/hooks/useFocusManagement'
import { cn } from '@/lib/utils'

export interface MobileNavigationItem {
  name: string
  href: string
  icon: string
  badge?: number
  disabled?: boolean
}

export interface MobileNavigationProps {
  items: MobileNavigationItem[]
  user?: {
    name: string
    email: string
    role: string
  }
  onSignOut?: () => void
  className?: string
  enableGestures?: boolean
  enableFocusTrap?: boolean
  onItemClick?: (item: MobileNavigationItem) => void
}

export function MobileNavigation({
  items,
  user,
  onSignOut,
  className = '',
  enableGestures = true,
  enableFocusTrap = true,
  onItemClick,
}: MobileNavigationProps) {
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<string>('')
  const [isExpanded, setIsExpanded] = useState(false)

  // Touch gestures for mobile navigation
  const { touchState } = useTouchGestures(containerRef, {
    onSwipeUp: () => {
      if (!isExpanded) {
        setIsExpanded(true)
      }
    },
    onSwipeDown: () => {
      if (isExpanded) {
        setIsExpanded(false)
      }
    },
    onDoubleTap: () => {
      setIsExpanded(!isExpanded)
    },
    minSwipeDistance: 30,
  })

  // Focus management for accessibility
  const focusManagement = useFocusManagement(containerRef, {
    trapFocus: enableFocusTrap && isExpanded,
    restoreFocus: true,
    keyboardShortcuts: {
      'escape': () => {
        if (isExpanded) {
          setIsExpanded(false)
        }
      },
      'arrowup': () => {
        focusManagement.focusPrevious()
      },
      'arrowdown': () => {
        focusManagement.focusNext()
      },
    },
  })

  // Determine active tab based on current path
  useEffect(() => {
    const activeItem = items.find(item => {
      if (item.href === '/dashboard') {
        return pathname === '/dashboard'
      }
      return pathname.startsWith(item.href)
    })
    setActiveTab(activeItem?.href || '')
  }, [pathname, items])

  const handleItemClick = (item: MobileNavigationItem) => {
    if (item.disabled) return
    
    onItemClick?.(item)
    
    // Auto-collapse on mobile after selection
    if (window.innerWidth < 768) {
      setIsExpanded(false)
    }
  }

  const handleSignOut = () => {
    onSignOut?.()
    setIsExpanded(false)
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white border-t border-gray-200',
        'transition-all duration-300 ease-in-out',
        isExpanded ? 'h-full' : 'h-16',
        className
      )}
      role="navigation"
      aria-label="Mobile navigation"
    >
      {/* Expanded navigation overlay */}
      {isExpanded && (
        <div className="absolute inset-0 bg-white">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close navigation"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation items */}
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="space-y-1 px-4">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={e => { e.preventDefault(); handleItemClick(item); }}
                  className={cn(
                    'flex items-center px-3 py-3 rounded-md text-base font-medium transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                    activeTab === item.href
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
                  )}
                  aria-current={activeTab === item.href ? 'page' : undefined}
                >
                  <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* User section */}
            {user && (
              <div className="mt-8 px-4 border-t border-gray-200 pt-4">
                <div className="flex items-center px-3 py-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="text-base font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    <div className="text-xs text-gray-400 mt-1">Role: {user.role}</div>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <Link
                    href="/profile"
                    className="block px-3 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
                    onClick={() => setIsExpanded(false)}
                  >
                    Your Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-3 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
                    onClick={() => setIsExpanded(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </nav>
        </div>
      )}

      {/* Bottom navigation bar */}
      <div className="flex items-center justify-around h-16 px-2">
        {items.slice(0, 4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={e => { e.preventDefault(); handleItemClick(item); }}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full',
              'min-h-[44px]', // Touch target minimum
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              activeTab === item.href
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700',
              item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
            )}
            aria-current={activeTab === item.href ? 'page' : undefined}
          >
            <div className="relative">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.badge && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full min-w-[16px] h-4">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-xs mt-1 font-medium">{item.name}</span>
          </Link>
        ))}

        {/* More button */}
        {items.length > 4 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full',
              'min-h-[44px]', // Touch target minimum
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              isExpanded ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            )}
            aria-label="More navigation options"
            aria-expanded={isExpanded}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-xs mt-1 font-medium">More</span>
          </button>
        )}
      </div>

      {/* Touch feedback indicator */}
      {enableGestures && touchState.isTouching && (
        <div
          className="absolute pointer-events-none z-50 w-4 h-4 bg-blue-500 rounded-full opacity-50"
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
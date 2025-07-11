'use client'

import { useCallback, useRef, useEffect, useMemo } from 'react'

export interface FocusManagementOptions {
  trapFocus?: boolean
  restoreFocus?: boolean
  keyboardShortcuts?: Record<string, () => void>
  focusableSelector?: string
  onFocusIn?: (element: HTMLElement) => void
  onFocusOut?: (element: HTMLElement) => void
}

export interface FocusState {
  isTrapped: boolean
  activeElement: HTMLElement | null
  previousElement: HTMLElement | null
  focusableElements: HTMLElement[]
  currentIndex: number
}

export function useFocusManagement(
  containerRef: React.RefObject<HTMLElement>,
  options: FocusManagementOptions = {}
) {
  const {
    trapFocus = false,
    restoreFocus = true,
    keyboardShortcuts = {},
    focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    onFocusIn,
    onFocusOut,
  } = options

  const focusStateRef = useRef<FocusState>({
    isTrapped: false,
    activeElement: null,
    previousElement: null,
    focusableElements: [],
    currentIndex: -1,
  })

  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    const container = containerRef.current
    if (!container) return []

    const elements = Array.from(
      container.querySelectorAll<HTMLElement>(focusableSelector)
    ).filter(element => {
      const style = window.getComputedStyle(element)
      return style.display !== 'none' && style.visibility !== 'hidden'
    })

    return elements
  }, [containerRef, focusableSelector])

  // Update focusable elements
  const updateFocusableElements = useCallback(() => {
    const elements = getFocusableElements()
    focusStateRef.current.focusableElements = elements
    return elements
  }, [getFocusableElements])

  // Focus the first focusable element
  const focusFirst = useCallback(() => {
    const elements = updateFocusableElements()
    if (elements.length > 0) {
      elements[0].focus()
      focusStateRef.current.currentIndex = 0
      focusStateRef.current.activeElement = elements[0]
    }
  }, [updateFocusableElements])

  // Focus the last focusable element
  const focusLast = useCallback(() => {
    const elements = updateFocusableElements()
    if (elements.length > 0) {
      const lastIndex = elements.length - 1
      elements[lastIndex].focus()
      focusStateRef.current.currentIndex = lastIndex
      focusStateRef.current.activeElement = elements[lastIndex]
    }
  }, [updateFocusableElements])

  // Focus the next element
  const focusNext = useCallback(() => {
    const elements = updateFocusableElements()
    if (elements.length === 0) return

    const currentIndex = focusStateRef.current.currentIndex
    const nextIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0
    elements[nextIndex].focus()
    focusStateRef.current.currentIndex = nextIndex
    focusStateRef.current.activeElement = elements[nextIndex]
  }, [updateFocusableElements])

  // Focus the previous element
  const focusPrevious = useCallback(() => {
    const elements = updateFocusableElements()
    if (elements.length === 0) return

    const currentIndex = focusStateRef.current.currentIndex
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1
    elements[prevIndex].focus()
    focusStateRef.current.currentIndex = prevIndex
    focusStateRef.current.activeElement = elements[prevIndex]
  }, [updateFocusableElements])

  // Trap focus within the container
  const trapFocusInContainer = useCallback((event: KeyboardEvent) => {
    if (!trapFocus) return

    const container = containerRef.current
    if (!container || !container.contains(document.activeElement)) return

    const elements = updateFocusableElements()
    if (elements.length === 0) return

    const activeElement = document.activeElement as HTMLElement
    const currentIndex = elements.indexOf(activeElement)

    if (event.key === 'Tab') {
      event.preventDefault()

      if (event.shiftKey) {
        // Shift + Tab: focus previous
        if (currentIndex <= 0) {
          elements[elements.length - 1].focus()
          focusStateRef.current.currentIndex = elements.length - 1
        } else {
          elements[currentIndex - 1].focus()
          focusStateRef.current.currentIndex = currentIndex - 1
        }
      } else {
        // Tab: focus next
        if (currentIndex >= elements.length - 1) {
          elements[0].focus()
          focusStateRef.current.currentIndex = 0
        } else {
          elements[currentIndex + 1].focus()
          focusStateRef.current.currentIndex = currentIndex + 1
        }
      }

      focusStateRef.current.activeElement = document.activeElement as HTMLElement
    }
  }, [trapFocus, containerRef, updateFocusableElements])

  // Handle keyboard shortcuts
  const handleKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    const modifier = event.ctrlKey || event.metaKey ? 'ctrl' : ''
    const shift = event.shiftKey ? 'shift' : ''
    const keyCombo = [modifier, shift, key].filter(Boolean).join('+')

    if (keyboardShortcuts[keyCombo]) {
      event.preventDefault()
      keyboardShortcuts[keyCombo]()
    }
  }, [keyboardShortcuts])

  // Handle focus events
  const handleFocusIn = useCallback((event: FocusEvent) => {
    const target = event.target as HTMLElement
    const container = containerRef.current

    if (container && container.contains(target)) {
      focusStateRef.current.previousElement = focusStateRef.current.activeElement
      focusStateRef.current.activeElement = target
      focusStateRef.current.currentIndex = focusStateRef.current.focusableElements.indexOf(target)
      onFocusIn?.(target)
    }
  }, [containerRef, onFocusIn])

  const handleFocusOut = useCallback((event: FocusEvent) => {
    const target = event.target as HTMLElement
    const container = containerRef.current

    if (container && container.contains(target)) {
      onFocusOut?.(target)
    }
  }, [containerRef, onFocusOut])

  // Initialize focus management
  const initialize = useCallback(() => {
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement
    }

    updateFocusableElements()
    focusStateRef.current.isTrapped = trapFocus

    if (trapFocus) {
      focusFirst()
    }
  }, [restoreFocus, updateFocusableElements, trapFocus, focusFirst])

  // Cleanup focus management
  const cleanup = useCallback(() => {
    if (restoreFocus && previousFocusRef.current) {
      previousFocusRef.current.focus()
    }
  }, [restoreFocus])

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Initialize focus management
    initialize()

    // Add event listeners
    document.addEventListener('keydown', trapFocusInContainer)
    document.addEventListener('keydown', handleKeyboardShortcuts)
    container.addEventListener('focusin', handleFocusIn)
    container.addEventListener('focusout', handleFocusOut)

    return () => {
      document.removeEventListener('keydown', trapFocusInContainer)
      document.removeEventListener('keydown', handleKeyboardShortcuts)
      container.removeEventListener('focusin', handleFocusIn)
      container.removeEventListener('focusout', handleFocusOut)
      cleanup()
    }
  }, [containerRef, initialize, cleanup, trapFocusInContainer, handleKeyboardShortcuts, handleFocusIn, handleFocusOut])

  // Return focus management functions and state
  return useMemo(() => ({
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    updateFocusableElements,
    initialize,
    cleanup,
    getFocusableElements,
    focusState: focusStateRef.current,
  }), [
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    updateFocusableElements,
    initialize,
    cleanup,
    getFocusableElements,
  ])
} 
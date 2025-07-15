'use client'

import { useCallback, useRef, useState, useEffect } from 'react'

export interface TouchGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onPinchIn?: (scale: number) => void
  onPinchOut?: (scale: number) => void
  onTap?: () => void
  onDoubleTap?: () => void
  onLongPress?: () => void
  minSwipeDistance?: number
  minPinchDistance?: number
  longPressDelay?: number
  doubleTapDelay?: number
}

export interface TouchState {
  isTouching: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
  deltaX: number
  deltaY: number
  distance: number
  scale: number
  startDistance: number
  startScale: number
}

export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement>,
  options: TouchGestureOptions = {}
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinchIn,
    onPinchOut,
    onTap,
    onDoubleTap,
    onLongPress,
    minSwipeDistance = 50,
    longPressDelay = 500,
    doubleTapDelay = 300,
  } = options

  const [touchState, setTouchState] = useState<TouchState>({
    isTouching: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    distance: 0,
    scale: 1,
    startDistance: 0,
    startScale: 1,
  })

  const touchStartTimeRef = useRef<number>(0)
  const lastTapTimeRef = useRef<number>(0)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const touchCountRef = useRef<number>(0)

  const calculateDistance = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  }, [])

  const calculateScale = useCallback((distance: number, startDistance: number) => {
    return distance / startDistance
  }, [])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault()
    
    const touch = e.touches[0]
    const startX = touch.clientX
    const startY = touch.clientY
    
    touchCountRef.current = e.touches.length
    touchStartTimeRef.current = Date.now()

    setTouchState(prev => ({
      ...prev,
      isTouching: true,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      deltaX: 0,
      deltaY: 0,
      distance: 0,
      scale: 1,
      startDistance: 0,
      startScale: 1,
    }))

    // Handle multi-touch for pinch gestures
    if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = calculateDistance(touch1.clientX, touch1.clientY, touch2.clientX, touch2.clientY)
      
      setTouchState(prev => ({
        ...prev,
        startDistance: distance,
        startScale: 1,
      }))
    }

    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      onLongPress?.()
    }, longPressDelay)
  }, [calculateDistance, longPressDelay, onLongPress])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    
    if (!touchState.isTouching) return

    const touch = e.touches[0]
    const currentX = touch.clientX
    const currentY = touch.clientY
    const deltaX = currentX - touchState.startX
    const deltaY = currentY - touchState.startY

    setTouchState(prev => ({
      ...prev,
      currentX,
      currentY,
      deltaX,
      deltaY,
      distance: Math.sqrt(deltaX * deltaX + deltaY * deltaY),
    }))

    // Handle pinch gestures
    if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = calculateDistance(touch1.clientX, touch1.clientY, touch2.clientX, touch2.clientY)
      const scale = calculateScale(distance, touchState.startDistance)

      setTouchState(prev => ({
        ...prev,
        distance,
        scale,
      }))

      // Trigger pinch callbacks
      if (Math.abs(scale - 1) > 0.1) {
        if (scale < 1) {
          onPinchIn?.(scale)
        } else {
          onPinchOut?.(scale)
        }
      }
    }

    // Cancel long press if user moves finger
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [touchState.isTouching, touchState.startX, touchState.startY, touchState.startDistance, calculateDistance, calculateScale, onPinchIn, onPinchOut])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault()
    
    if (!touchState.isTouching) return

    const touchDuration = Date.now() - touchStartTimeRef.current
    const currentTime = Date.now()

    // Handle tap gestures
    if (touchDuration < 200 && touchState.distance < 10) {
      const timeSinceLastTap = currentTime - lastTapTimeRef.current
      
      if (timeSinceLastTap < doubleTapDelay) {
        // Double tap
        onDoubleTap?.()
        lastTapTimeRef.current = 0
      } else {
        // Single tap
        onTap?.()
        lastTapTimeRef.current = currentTime
      }
    }

    // Handle swipe gestures
    if (touchState.distance > minSwipeDistance) {
      const absDeltaX = Math.abs(touchState.deltaX)
      const absDeltaY = Math.abs(touchState.deltaY)

      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (touchState.deltaX > 0) {
          onSwipeRight?.()
        } else {
          onSwipeLeft?.()
        }
      } else {
        // Vertical swipe
        if (touchState.deltaY > 0) {
          onSwipeDown?.()
        } else {
          onSwipeUp?.()
        }
      }
    }

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    setTouchState(prev => ({
      ...prev,
      isTouching: false,
    }))
  }, [touchState.isTouching, touchState.distance, touchState.deltaX, touchState.deltaY, minSwipeDistance, doubleTapDelay, onTap, onDoubleTap, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    touchState,
    isTouching: touchState.isTouching,
    deltaX: touchState.deltaX,
    deltaY: touchState.deltaY,
    scale: touchState.scale,
  }
} 
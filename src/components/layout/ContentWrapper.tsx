'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface ContentWrapperProps {
  children: React.ReactNode
}

export function ContentWrapper({ children }: ContentWrapperProps) {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()

  // Show loading state when pathname changes
  useEffect(() => {
    setIsLoading(true)
    // Simulate a brief loading state for smooth transitions
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      <div className={isLoading ? 'opacity-50' : 'opacity-100 transition-opacity duration-200'}>
        {children}
      </div>
    </div>
  )
} 
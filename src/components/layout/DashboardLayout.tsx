'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ApiKeyGuard } from '@/components/auth/ApiKeyGuard'
import { SidebarNavigation } from './SidebarNavigation'
import { TopNavigation } from './TopNavigation'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { CampaignsContent } from '@/components/campaigns/CampaignsContent'
import { My500Content } from '@/components/contacts/My500Content'
import { AnalyticsContent } from '@/components/analytics/AnalyticsContent'

interface DashboardLayoutProps {
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    role?: string
  }
  requireApiKey?: boolean
  children?: React.ReactNode
}

export function DashboardLayout({ 
  user, 
  requireApiKey = true,
  children
}: DashboardLayoutProps) {
  const pathname = usePathname()
  const [currentTitle, setCurrentTitle] = useState('Dashboard')
  const [isLoading, setIsLoading] = useState(false)
  const [currentRoute, setCurrentRoute] = useState('/dashboard')

  // Update title and show loading state when pathname changes
  useEffect(() => {
    setIsLoading(true)
    
    if (pathname === '/dashboard') {
      setCurrentTitle('Dashboard')
      setCurrentRoute('/dashboard')
    } else if (pathname === '/campaigns') {
      setCurrentTitle('Campaigns')
      setCurrentRoute('/campaigns')
    } else if (pathname === '/my-500') {
      setCurrentTitle('My-500')
      setCurrentRoute('/my-500')
    } else if (pathname === '/analytics') {
      setCurrentTitle('Analytics')
      setCurrentRoute('/analytics')
    } else if (pathname.startsWith('/campaigns/')) {
      setCurrentTitle('Campaign Details')
      setCurrentRoute(pathname)
    } else {
      setCurrentTitle('Dashboard')
      setCurrentRoute('/dashboard')
    }

    // Brief loading state for smooth transitions
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 150)
    
    return () => clearTimeout(timer)
  }, [pathname])

  // Handle navigation from sidebar
  const handleNavigation = (href: string) => {
    if (currentRoute !== href) {
      setIsLoading(true)
      // Use client-side routing to update the URL without page refresh
      window.history.pushState({}, '', href)
      // Trigger a pathname change by dispatching a popstate event
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  // Listen for popstate events to handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const newPathname = window.location.pathname
      if (newPathname !== currentRoute) {
        setCurrentRoute(newPathname)
        setIsLoading(true)
        setTimeout(() => setIsLoading(false), 150)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentRoute])

  // Render content based on current route
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    // If children are provided and we're on a campaign detail page, render them
    if (children && currentRoute.startsWith('/campaigns/') && currentRoute !== '/campaigns') {
      return children
    }
    
    switch (currentRoute) {
      case '/dashboard':
        return <DashboardContent user={user} />
      case '/campaigns':
        return <CampaignsContent user={user} />
      case '/my-500':
        return <My500Content user={user} />
      case '/analytics':
        return <AnalyticsContent user={user} />
      default:
        return <DashboardContent user={user} />
    }
  }

  return (
    <ApiKeyGuard requireApiKey={requireApiKey}>
      <div className="min-h-screen bg-gray-50">
        <SidebarNavigation user={user} onNavigation={handleNavigation} />
        <div className="ml-16">
          <TopNavigation title={currentTitle} showSearch={true} />
          <main className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </ApiKeyGuard>
  )
} 
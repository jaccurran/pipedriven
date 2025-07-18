'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/ui/Logo'

interface SidebarNavigationProps {
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    role?: string
  }
  onNavigation?: (href: string) => void
}

export function SidebarNavigation({ user, onNavigation }: SidebarNavigationProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z',
      badge: null,
      disabled: true
    },
    { 
      name: 'Campaigns', 
      href: '/campaigns', 
      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      badge: null,
      disabled: false
    },
    { 
      name: 'My-500', 
      href: '/my-500', 
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      badge: null,
      disabled: false
    },
    { 
      name: 'Analytics', 
      href: '/analytics', 
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      badge: null,
      disabled: true
    },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const handleNavigation = (href: string) => {
    if (onNavigation) {
      onNavigation(href)
    }
  }

  return (
    <div className="fixed left-0 top-0 h-full w-16 bg-blue-900 flex flex-col items-center py-4 z-50">
      {/* Logo at top */}
      <div className="mb-8">
        <button 
          onClick={() => handleNavigation('/dashboard')}
          className="flex items-center justify-center"
        >
          <Logo size="sm" className="text-white" />
        </button>
      </div>

      {/* Navigation icons */}
      <nav className="flex-1 flex flex-col items-center space-y-2">
        {navigation.map((item) => (
          <div key={item.name}>
            {item.disabled ? (
              <div
                className="relative group p-3 rounded-lg transition-all duration-200 text-gray-500 cursor-not-allowed"
                title={`${item.name} (Coming Soon)`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                
                {/* Badge if present */}
                {item.badge && (
                  <span className="absolute -top-1 -right-1 bg-gray-400 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[16px] h-4 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
            ) : (
              <button
                onClick={() => handleNavigation(item.href)}
                className={`relative group p-3 transition-all duration-200 ${
                  isActive(item.href)
                    ? 'bg-blue-600 text-white rounded-md'
                    : 'text-white hover:bg-blue-800 rounded-md'
                }`}
                title={item.name}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                
                {/* Badge if present */}
                {item.badge && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[16px] h-4 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            )}
          </div>
        ))}
      </nav>

      {/* User menu at bottom */}
      <div className="relative">
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="p-3 rounded-lg text-white hover:bg-blue-800 transition-colors duration-200"
          title="User menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>

        {isUserMenuOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <div className="font-medium text-gray-900">{user?.name || session?.user?.name}</div>
              <div className="text-sm text-gray-500">{user?.email || session?.user?.email}</div>
            </div>
            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                // Handle profile navigation
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Your Profile
            </button>
            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                // Handle settings navigation
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Settings
            </button>
            <button
              onClick={handleSignOut}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 
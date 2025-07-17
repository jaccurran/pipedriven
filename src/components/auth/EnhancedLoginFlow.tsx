'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ApiKeySetupDialog } from './ApiKeySetupDialog'

interface EnhancedLoginFlowProps {
  children: React.ReactNode
  redirectTo?: string
  requireApiKey?: boolean
}

export function EnhancedLoginFlow({ 
  children, 
  redirectTo = '/dashboard',
  requireApiKey = true 
}: EnhancedLoginFlowProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null)
  const [showSetupDialog, setShowSetupDialog] = useState(false)

  useEffect(() => {
    const checkAuthAndApiKey = async () => {
      if (status === 'loading') return

      // If not authenticated, redirect to signin
      if (status === 'unauthenticated') {
        router.push('/auth/signin')
        return
      }

      // If authenticated but no API key required, render children
      if (!requireApiKey) {
        setIsChecking(false)
        return
      }

      // If authenticated and API key required, check API key
      if (status === 'authenticated' && session?.user) {
        try {
          // Check if user has an API key
          if (!session.user.pipedriveApiKey) {
            setApiKeyValid(false)
            setShowSetupDialog(true)
            setIsChecking(false)
            return
          }

          // Validate the API key
          const response = await fetch('/api/pipedrive/test-connection', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          const result = await response.json()

          if (result.success) {
            setApiKeyValid(true)
            setShowSetupDialog(false)
          } else {
            setApiKeyValid(false)
            setShowSetupDialog(true)
          }
        } catch (error) {
          console.error('API key validation error:', error)
          setApiKeyValid(false)
          setShowSetupDialog(true)
        } finally {
          setIsChecking(false)
        }
      }
    }

    checkAuthAndApiKey()
  }, [session, status, router, requireApiKey])

  const handleApiKeySuccess = () => {
    setApiKeyValid(true)
    setShowSetupDialog(false)
    // Optionally redirect to the intended destination
    if (redirectTo && redirectTo !== window.location.pathname) {
      router.push(redirectTo)
    }
  }

  const handleApiKeyCancel = () => {
    setShowSetupDialog(false)
    // Redirect to signin if user cancels API key setup
    router.push('/auth/signin')
  }

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" role="status" aria-label="Loading"></div>
          <p className="mt-2 text-sm text-gray-600">Setting up your account...</p>
        </div>
      </div>
    )
  }

  // If API key is valid or not required, render children
  if (apiKeyValid || !requireApiKey) {
    return <>{children}</>
  }

  // Show the API key setup dialog
  return (
    <>
      <ApiKeySetupDialog
        isOpen={showSetupDialog}
        onSuccess={handleApiKeySuccess}
        onCancel={handleApiKeyCancel}
      />
      {children}
    </>
  )
}

// Higher-order component for wrapping pages that require API key validation
export function withApiKeyValidation<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    redirectTo?: string
    requireApiKey?: boolean
  } = {}
) {
  return function WrappedComponent(props: P) {
    return (
      <EnhancedLoginFlow
        redirectTo={options.redirectTo}
        requireApiKey={options.requireApiKey}
      >
        <Component {...props} />
      </EnhancedLoginFlow>
    )
  }
}

// Hook for components that need to check API key status
export function useApiKeyStatus() {
  const { data: session, status } = useSession()
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkApiKeyStatus = async () => {
      if (status === 'loading') return

      if (status === 'unauthenticated') {
        setApiKeyValid(false)
        setIsChecking(false)
        return
      }

      if (status === 'authenticated' && session?.user) {
        try {
          if (!session.user.pipedriveApiKey) {
            setApiKeyValid(false)
            setIsChecking(false)
            return
          }

          const response = await fetch('/api/pipedrive/test-connection', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          const result = await response.json()
          setApiKeyValid(result.success)
        } catch (error) {
          console.error('API key status check error:', error)
          setApiKeyValid(false)
        } finally {
          setIsChecking(false)
        }
      }
    }

    checkApiKeyStatus()
  }, [session, status])

  return {
    apiKeyValid,
    isChecking,
    hasApiKey: !!session?.user?.pipedriveApiKey,
    isAuthenticated: status === 'authenticated',
  }
} 
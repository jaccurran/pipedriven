'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ApiKeySetupDialog } from './ApiKeySetupDialog'

interface ApiKeyCheckerProps {
  children: React.ReactNode
  onApiKeyValid?: () => void
  onApiKeyInvalid?: () => void
  showDialog?: boolean
}

// Cache for API key validation results
const validationCache = new Map<string, { valid: boolean; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Utility function to clear cache for a specific user
export function clearApiKeyValidationCache(userId?: string) {
  if (userId) {
    // Clear cache for specific user
    for (const [key] of validationCache) {
      if (key.startsWith(`${userId}-`)) {
        validationCache.delete(key)
      }
    }
  } else {
    // Clear all cache
    validationCache.clear()
  }
}

export function ApiKeyChecker({ 
  children, 
  onApiKeyValid, 
  onApiKeyInvalid, 
  showDialog = true 
}: ApiKeyCheckerProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null)
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const lastValidationRef = useRef<string>('')

  useEffect(() => {
    const checkApiKey = async () => {
      if (status === 'loading') return
      
      if (!session?.user?.id) {
        // Handle case where session exists but user is null (invalidated session)
        if (session && !session.user) {
          console.log('Session invalidated, signing out user')
          await signOut({ redirect: false })
          router.push('/auth/signin')
          return
        }
        
        setIsChecking(false)
        return
      }

      // Create a cache key based on user ID and API key presence
      const cacheKey = `${session.user.id}-${!!session.user.pipedriveApiKey}`
      
      // Check if we've already validated this recently
      const cached = validationCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setApiKeyValid(cached.valid)
        if (cached.valid) {
          onApiKeyValid?.()
        } else {
          onApiKeyInvalid?.()
          if (showDialog) {
            setShowSetupDialog(true)
          }
        }
        setIsChecking(false)
        return
      }

      // Prevent duplicate validation calls
      if (lastValidationRef.current === cacheKey) {
        return
      }
      lastValidationRef.current = cacheKey

      try {
        // Check if user has an API key (now encrypted)
        if (!session.user.pipedriveApiKey) {
          setApiKeyValid(false)
          onApiKeyInvalid?.()
          if (showDialog) {
            setShowSetupDialog(true)
          }
          validationCache.set(cacheKey, { valid: false, timestamp: Date.now() })
          setIsChecking(false)
          return
        }

        // Validate the API key using the auth validation endpoint
        // This endpoint handles the encrypted API key from the session
        const response = await fetch('/api/auth/validate-api-key', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const result = await response.json()

        // Handle session invalidation
        if (response.status === 401 && result.error?.includes('User session invalid')) {
          console.log('Session invalid, signing out user')
          await signOut({ redirect: false })
          router.push('/auth/signin')
          return
        }

        const isValid = result.valid
        setApiKeyValid(isValid)
        
        // Cache the result
        validationCache.set(cacheKey, { valid: isValid, timestamp: Date.now() })

        if (isValid) {
          onApiKeyValid?.()
        } else {
          onApiKeyInvalid?.()
          if (showDialog) {
            setShowSetupDialog(true)
          }
        }
      } catch (error) {
        console.error('API key validation error:', error)
        setApiKeyValid(false)
        onApiKeyInvalid?.()
        if (showDialog) {
          setShowSetupDialog(true)
        }
        validationCache.set(cacheKey, { valid: false, timestamp: Date.now() })
      } finally {
        setIsChecking(false)
      }
    }

    checkApiKey()
  }, [session, status, onApiKeyValid, onApiKeyInvalid, showDialog, router])

  const handleApiKeySuccess = () => {
    setApiKeyValid(true)
    setShowSetupDialog(false)
    onApiKeyValid?.()
    
    // Update cache with new valid result
    if (session?.user?.id) {
      const cacheKey = `${session.user.id}-true`
      validationCache.set(cacheKey, { valid: true, timestamp: Date.now() })
    }
  }

  const handleApiKeyCancel = () => {
    setShowSetupDialog(false)
  }

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" role="status" aria-label="Loading"></div>
          <p className="mt-2 text-sm text-gray-600">Checking API key...</p>
        </div>
      </div>
    )
  }

  // If API key is valid or we're not showing the dialog, render children
  if (apiKeyValid || !showDialog) {
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
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ApiKeySetupDialog } from './ApiKeySetupDialog'

interface ApiKeyCheckerProps {
  children: React.ReactNode
  onApiKeyValid?: () => void
  onApiKeyInvalid?: () => void
  showDialog?: boolean
}

export function ApiKeyChecker({ 
  children, 
  onApiKeyValid, 
  onApiKeyInvalid, 
  showDialog = true 
}: ApiKeyCheckerProps) {
  const { data: session, status } = useSession()
  const [isChecking, setIsChecking] = useState(true)
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null)
  const [showSetupDialog, setShowSetupDialog] = useState(false)

  useEffect(() => {
    const checkApiKey = async () => {
      if (status === 'loading') return
      
      if (!session?.user?.id) {
        setIsChecking(false)
        return
      }

      try {
        // Check if user has an API key (now encrypted)
        if (!session.user.pipedriveApiKey) {
          setApiKeyValid(false)
          onApiKeyInvalid?.()
          if (showDialog) {
            setShowSetupDialog(true)
          }
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

        if (result.valid) {
          setApiKeyValid(true)
          onApiKeyValid?.()
        } else {
          setApiKeyValid(false)
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
      } finally {
        setIsChecking(false)
      }
    }

    checkApiKey()
  }, [session, status, onApiKeyValid, onApiKeyInvalid, showDialog])

  const handleApiKeySuccess = () => {
    setApiKeyValid(true)
    setShowSetupDialog(false)
    onApiKeyValid?.()
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
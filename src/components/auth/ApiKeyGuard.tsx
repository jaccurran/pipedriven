'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ApiKeySetupDialog } from './ApiKeySetupDialog'

interface ApiKeyGuardProps {
  children: React.ReactNode
  requireApiKey?: boolean
}

export function ApiKeyGuard({ children, requireApiKey = true }: ApiKeyGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    if (!requireApiKey) {
      return
    }

    // Check if user has API key
    if (!session.user.pipedriveApiKey) {
      setShowApiKeyDialog(true)
      return
    }

    // Validate API key
    const validateApiKey = async () => {
      setIsValidating(true)
      try {
        const response = await fetch('/api/auth/validate-api-key', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const result = await response.json()

        if (!result.valid) {
          setShowApiKeyDialog(true)
        }
      } catch (error) {
        console.error('API key validation error:', error)
        setShowApiKeyDialog(true)
      } finally {
        setIsValidating(false)
      }
    }

    validateApiKey()
  }, [session, status, requireApiKey, router])

  if (status === 'loading' || isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <>
      {children}
      {showApiKeyDialog && (
        <ApiKeySetupDialog
          isOpen={showApiKeyDialog}
          onCancel={() => setShowApiKeyDialog(false)}
          onSuccess={() => setShowApiKeyDialog(false)}
        />
      )}
    </>
  )
} 
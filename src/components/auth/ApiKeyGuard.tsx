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

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    if (!requireApiKey) {
      return
    }

    // Check if user has API key - no need to validate here since it's handled by EnhancedAuthFlow
    if (!session.user.pipedriveApiKey) {
      setShowApiKeyDialog(true)
      return
    }
  }, [session, status, requireApiKey, router])

  if (status === 'loading') {
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
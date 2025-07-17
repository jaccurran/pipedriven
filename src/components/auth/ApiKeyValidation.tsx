'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface ApiKeyValidationProps {
  apiKey: string
  onValidationComplete: (isValid: boolean) => void
}

export function ApiKeyValidation({ apiKey, onValidationComplete }: ApiKeyValidationProps) {
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()

  useEffect(() => {
    if (!apiKey || !session?.user?.id) return

    const validateApiKey = async () => {
      setIsValidating(true)
      setError(null)

      try {
        // Test the API key by making a request to the test connection endpoint
        const response = await fetch('/api/pipedrive/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey })
        })

        const result = await response.json()
        
        if (result.success) {
          setIsValid(true)
          onValidationComplete(true)
        } else {
          setIsValid(false)
          setError(result.error || 'Invalid API key')
          onValidationComplete(false)
        }
      } catch {
        setIsValid(false)
        setError('Failed to validate API key')
        onValidationComplete(false)
      } finally {
        setIsValidating(false)
      }
    }

    validateApiKey()
  }, [apiKey, session?.user?.id, onValidationComplete])

  if (isValidating) {
    return <div className="text-sm text-gray-600">Validating API key...</div>
  }

  if (isValid === null) {
    return null
  }

  if (isValid) {
    return <div className="text-sm text-green-600">✓ API key is valid</div>
  }

  return (
    <div className="text-sm text-red-600">
      ✗ {error || 'Invalid API key'}
    </div>
  )
} 
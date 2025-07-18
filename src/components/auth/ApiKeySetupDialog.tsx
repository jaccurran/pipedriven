'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { clearApiKeyValidationCache } from './ApiKeyChecker'

interface ApiKeySetupDialogProps {
  isOpen: boolean
  onSuccess: () => void
  onCancel: () => void
}

export function ApiKeySetupDialog({ isOpen, onSuccess, onCancel }: ApiKeySetupDialogProps) {
  const { update: updateSession, data: session } = useSession()
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isValid, setIsValid] = useState(false)

  // Clear state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setApiKey('')
      setIsValidating(false)
      setIsValid(false)
      setShowHelp(false)
      setShowPassword(false)
    }
  }, [isOpen])

  const handleValidate = async () => {
    if (!apiKey.trim()) return

    setIsValidating(true)
    setError(null)

    try {
      // Use the auth validation endpoint which handles both validation and saving
      const response = await fetch('/api/auth/validate-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      })

      const result = await response.json()

      // Handle session invalidation
      if (response.status === 401 && result.error?.includes('User session invalid')) {
        console.log('Session invalid during API key setup, signing out user')
        await signOut({ redirect: false })
        router.push('/auth/signin')
        return
      }

      if (result.success) {
        setIsValid(true)
        // Clear the validation cache for this user
        if (session?.user?.id) {
          clearApiKeyValidationCache(session.user.id)
        }
        // Refresh the session to include the new API key
        await updateSession()
        // Call onSuccess after successful validation and save
        onSuccess()
      } else {
        setError(result.error || 'The API key appears to be invalid. Please check and try again.')
      }
    } catch (error) {
      console.error('API key validation error:', error)
      setError('An error occurred while validating your API key. Please try again.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onKeyDown={handleKeyDown}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full p-6 space-y-4"
        role="dialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <div className="text-center">
          <h2 id="dialog-title" className="text-xl font-semibold text-gray-900">
            Set Up Your Pipedrive API Key
          </h2>
          <p id="dialog-description" className="text-sm text-gray-600 mt-2">
            To use Pipedriven, you need to provide your Pipedrive API key.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
              API Key
            </label>
            <div className="mt-1 relative">
              <input
                id="apiKey"
                type={showPassword ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your Pipedrive API key"
                required
                aria-describedby="api-key-help"
                data-testid="api-key-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                aria-label="toggle password visibility"
              >
                {showPassword ? (
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm" role="alert">
              {error}
              {error.includes('error occurred') && (
                <button
                  type="button"
                  onClick={handleValidate}
                  className="ml-2 underline hover:no-underline"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {isValid && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm" role="status" aria-live="polite">
              API key is valid and saved successfully!
            </div>
          )}

          {isValidating && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm" role="status" aria-live="polite">
              Validating your API key...
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating || !apiKey.trim()}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="validate-button"
            >
              {isValidating ? 'Validating...' : 'Validate'}
            </button>
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              data-testid="help-button"
            >
              Help
            </button>
          </div>
        </div>

        {showHelp && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-3">
            <h3 className="text-sm font-medium text-blue-900">How to find your API key:</h3>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Log in to your Pipedrive account</li>
              <li>Go to Settings → Personal Preferences</li>
              <li>Click on &quot;API&quot; in the left sidebar</li>
              <li>Copy your API key (it starts with &quot;api_&quot;)</li>
              <li>Paste it in the field above</li>
            </ol>
            <div className="text-xs text-blue-700">
              <p><strong>Pipedrive Settings:</strong> You can find this in your account settings under Personal Preferences → API.</p>
              <p>Your API key is encrypted and stored securely. We only use it to sync your Pipedrive data.</p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700"
            data-testid="cancel-button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
} 
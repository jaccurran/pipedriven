'use client'

import { useState } from 'react'

interface PipedriveApiKeyFormProps {
  userId: string
  currentApiKey: string | null
}

export function PipedriveApiKeyForm({ userId, currentApiKey }: PipedriveApiKeyFormProps) {
  const [apiKey, setApiKey] = useState(currentApiKey || '')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/user/pipedrive-api-key', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Pipedrive API key updated successfully!' })
        setShowApiKey(false)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update API key' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!apiKey) {
      setMessage({ type: 'error', text: 'Please enter an API key first' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/pipedrive/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Connection successful! API key is valid.' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Connection failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to test connection' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
          Pipedrive API Key
        </label>
        <div className="mt-1 relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your Pipedrive API key"
            disabled={isLoading}
          />
          {currentApiKey && (
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showApiKey ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Your API key is encrypted and stored securely. You can find your Pipedrive API key in your Pipedrive account settings.
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || !apiKey.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save API Key'}
        </button>
        
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={isLoading || !apiKey.trim()}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {currentApiKey && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">
            ✅ Pipedrive API key is configured and ready to use.
          </p>
        </div>
      )}
    </div>
  )
} 
'use client'

import { useState } from 'react'

interface ApiKeyHelpProps {
  isExpanded?: boolean
  onToggle?: () => void
  className?: string
}

export function ApiKeyHelp({ isExpanded = false, onToggle, className = '' }: ApiKeyHelpProps) {
  const [isOpen, setIsOpen] = useState(isExpanded)

  const handleToggle = () => {
    setIsOpen(!isOpen)
    onToggle?.()
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-md p-4 space-y-3 ${className}`}>
      <button
        onClick={handleToggle}
        className="flex items-center justify-between w-full text-left text-sm font-medium text-blue-900 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        aria-expanded={isOpen}
        aria-controls="api-key-help-content"
      >
        <span>How to find your Pipedrive API key</span>
        <svg
          className={`h-5 w-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div id="api-key-help-content" className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-blue-900">Step-by-step instructions:</h4>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Log in to your Pipedrive account at <a href="https://app.pipedrive.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">app.pipedrive.com</a></li>
              <li>Click on your profile picture in the top-right corner</li>
              <li>Select &quot;Settings&quot; from the dropdown menu</li>
              <li>In the left sidebar, click on &quot;Personal Preferences&quot;</li>
              <li>Click on &quot;API&quot; in the left sidebar</li>
              <li>Copy your API key (it starts with &quot;api_&quot;)</li>
              <li>Paste it in the field above</li>
            </ol>
          </div>

          <div className="bg-blue-100 p-3 rounded border-l-4 border-blue-400">
            <h5 className="text-sm font-medium text-blue-900 mb-2">Important Notes:</h5>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Your API key is encrypted and stored securely</li>
              <li>We only use it to sync your Pipedrive data</li>
              <li>You can regenerate your API key in Pipedrive settings if needed</li>
              <li>Never share your API key with others</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
            <h5 className="text-sm font-medium text-yellow-900 mb-2">Troubleshooting:</h5>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>Make sure you&apos;re copying the entire API key</li>
              <li>Check that there are no extra spaces before or after the key</li>
              <li>If you get an error, try regenerating your API key in Pipedrive</li>
              <li>Ensure your Pipedrive account is active and not suspended</li>
            </ul>
          </div>

          <div className="text-xs text-blue-700">
            <p><strong>Need more help?</strong> Contact our support team at <a href="mailto:support@pipedriven.com" className="text-blue-600 hover:text-blue-800 underline">support@pipedriven.com</a></p>
            <p>Or visit our <a href="/docs/api-key-setup" className="text-blue-600 hover:text-blue-800 underline">detailed setup guide</a> for more information.</p>
          </div>
        </div>
      )}
    </div>
  )
} 
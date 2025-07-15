'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UserWithoutPassword } from '@/types/user'
import { CampaignForm } from './CampaignForm'

interface NewCampaignFormProps {
  user: UserWithoutPassword
}

interface CampaignFormData {
  name: string
  description: string
  status: string
  startDate: string
  endDate: string
  targetLeads: number
}

export function NewCampaignForm({ user }: NewCampaignFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: CampaignFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create campaign')
      }

      const result = await response.json()
      router.push(`/campaigns/${result.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/campaigns')
  }

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error creating campaign</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <CampaignForm
        user={user}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  )
} 
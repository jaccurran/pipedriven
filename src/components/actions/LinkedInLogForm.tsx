import React from 'react'
import { ActivityLogForm, ActivityLogFormData, ActivityType } from './ActivityLogForm'

interface LinkedInLogFormProps {
  contactName: string
  onSubmit: (data: ActivityLogFormData) => void
  onCancel: () => void
  isLoading?: boolean
  error?: string | null
  initialDate?: string
}

export function LinkedInLogForm({
  contactName,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
  initialDate,
}: LinkedInLogFormProps) {
  return (
    <ActivityLogForm
      activityType="LINKEDIN"
      contactName={contactName}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isLoading={isLoading}
      error={error}
      initialDate={initialDate}
    />
  )
} 
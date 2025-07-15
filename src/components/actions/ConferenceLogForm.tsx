import React from 'react'
import { ActivityLogForm, ActivityLogFormData, ActivityType } from './ActivityLogForm'

interface ConferenceLogFormProps {
  contactName: string
  onSubmit: (data: ActivityLogFormData) => void
  onCancel: () => void
  isLoading?: boolean
  error?: string | null
  initialDate?: string
}

export function ConferenceLogForm({
  contactName,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
  initialDate,
}: ConferenceLogFormProps) {
  return (
    <ActivityLogForm
      activityType="CONFERENCE"
      contactName={contactName}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isLoading={isLoading}
      error={error}
      initialDate={initialDate}
    />
  )
} 
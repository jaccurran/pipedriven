import React from 'react'
import { ActivityLogForm, ActivityLogFormData } from './ActivityLogForm'

interface MeetingLogFormProps {
  contactName: string
  onSubmit: (data: ActivityLogFormData) => void
  onCancel: () => void
  isLoading?: boolean
  error?: string | null
  initialDate?: string
}

export function MeetingLogForm({
  contactName,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
  initialDate,
}: MeetingLogFormProps) {
  return (
    <ActivityLogForm
      activityType="MEETING"
      contactName={contactName}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isLoading={isLoading}
      error={error}
      initialDate={initialDate}
    />
  )
} 
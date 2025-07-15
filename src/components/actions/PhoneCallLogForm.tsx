import React from 'react'
import { ActivityLogForm, ActivityLogFormData } from './ActivityLogForm'

interface PhoneCallLogFormProps {
  contactName: string
  onSubmit: (data: ActivityLogFormData) => void
  onCancel: () => void
  isLoading?: boolean
  error?: string | null
  initialDate?: string
}

export function PhoneCallLogForm({
  contactName,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
  initialDate,
}: PhoneCallLogFormProps) {
  return (
    <ActivityLogForm
      activityType="PHONE_CALL"
      contactName={contactName}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isLoading={isLoading}
      error={error}
      initialDate={initialDate}
    />
  )
} 
'use client'

import React, { useState, useEffect } from 'react'
import { Card, Button, Input, Select, DatePicker, Modal } from '@/components/ui'
import type { SelectOption } from '@/components/ui/Select'

interface Contact {
  id: string
  name: string
  organisation?: string
}

interface Campaign {
  id: string
  name: string
}

interface ActivityFormProps {
  userId: string
  contacts: Contact[]
  campaigns: Campaign[]
  onSubmit: (activity: ActivityFormData) => Promise<void>
  onCancel?: () => void
  className?: string
  initialData?: Partial<ActivityFormData>
}

interface ActivityFormData {
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'LINKEDIN' | 'REFERRAL' | 'CONFERENCE'
  subject: string
  note?: string
  dueDate?: Date
  contactId?: string
  campaignId?: string
}

const activityTypes: SelectOption[] = [
  { value: 'CALL', label: '📞 Call' },
  { value: 'EMAIL', label: '📧 Email' },
  { value: 'MEETING', label: '🤝 Meeting' },
  { value: 'LINKEDIN', label: '💼 LinkedIn' },
  { value: 'REFERRAL', label: '👥 Referral' },
  { value: 'CONFERENCE', label: '🎤 Conference' },
]

export function ActivityForm({ 
  contacts, 
  campaigns, 
  onSubmit, 
  onCancel,
  className = '',
  initialData 
}: ActivityFormProps) {
  const [formData, setFormData] = useState<ActivityFormData>({
    type: 'CALL',
    subject: '',
    note: '',
    dueDate: undefined,
    contactId: '',
    campaignId: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showContactModal, setShowContactModal] = useState(false)
  const [showCampaignModal, setShowCampaignModal] = useState(false)

  // Initialize formData with initialData if provided
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required'
    }

    if (formData.subject.length > 200) {
      newErrors.subject = 'Subject must be less than 200 characters'
    }

    if (formData.note && formData.note.length > 1000) {
      newErrors.note = 'Note must be less than 1000 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      await onSubmit(formData)
      // Reset form
      setFormData({
        type: 'CALL',
        subject: '',
        note: '',
        dueDate: undefined,
        contactId: '',
        campaignId: '',
      })
      setErrors({})
    } catch (error) {
      console.error('Failed to submit activity:', error)
      setErrors({ submit: 'Failed to log activity. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ActivityFormData, value: string | Date | null | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const selectedContact = contacts.find(c => c.id === formData.contactId)
  const selectedCampaign = campaigns.find(c => c.id === formData.campaignId)

  // Convert contacts and campaigns to SelectOption format
  const contactOptions: SelectOption[] = [
    { value: '', label: 'Select a contact' },
    ...contacts.map(contact => ({
      value: contact.id,
      label: `${contact.name} ${contact.organisation ? `(${contact.organisation})` : ''}`
    }))
  ]

  const campaignOptions: SelectOption[] = [
    { value: '', label: 'Select a campaign' },
    ...campaigns.map(campaign => ({
      value: campaign.id,
      label: campaign.name
    }))
  ]

  return (
    <div className={className}>
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Log New Activity
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="activity-form">
            {/* Activity Type */}
            <div>
              <label htmlFor="activity-type" className="block text-sm font-medium text-gray-700 mb-2">
                Activity Type
              </label>
              <Select
                id="activity-type"
                options={activityTypes}
                value={formData.type}
                onChange={(value) => handleInputChange('type', value)}
                className="w-full"
              />
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="activity-subject" className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <Input
                id="activity-subject"
                type="text"
                value={formData.subject}
                onChange={(value) => handleInputChange('subject', value)}
                placeholder="Brief description of the activity"
                className={errors.subject ? 'border-red-500' : ''}
                maxLength={200}
              />
              {errors.subject && (
                <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.subject.length}/200 characters
              </p>
            </div>

            {/* Note */}
            <div>
              <label htmlFor="activity-note" className="block text-sm font-medium text-gray-700 mb-2">
                Note (Optional)
              </label>
              <textarea
                id="activity-note"
                value={formData.note}
                onChange={(e) => handleInputChange('note', e.target.value)}
                placeholder="Additional details about this activity"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                  errors.note ? 'border-red-500' : ''
                }`}
                rows={3}
                maxLength={1000}
              />
              {errors.note && (
                <p className="mt-1 text-sm text-red-600">{errors.note}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.note?.length || 0}/1000 characters
              </p>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="activity-due-date" className="block text-sm font-medium text-gray-700 mb-2">
                Due Date (Optional)
              </label>
              <DatePicker
                id="activity-due-date"
                value={formData.dueDate || null}
                selected={formData.dueDate}
                onChange={(date) => handleInputChange('dueDate', date)}
                placeholderText="Select due date"
                className="w-full"
                minDate={new Date()}
              />
            </div>

            {/* Contact */}
            <div>
              <label htmlFor="activity-contact" className="block text-sm font-medium text-gray-700 mb-2">
                Contact (Optional)
              </label>
              <div className="flex space-x-2">
                <Select
                  id="activity-contact"
                  options={contactOptions}
                  value={formData.contactId}
                  onChange={(value) => handleInputChange('contactId', value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowContactModal(true)}
                  className="px-3"
                >
                  +
                </Button>
              </div>
              {selectedContact && (
                <div className="mt-2 p-2 bg-gray-50 rounded-md" data-testid="contact-info-container">
                  <p className="text-sm text-gray-700">
                    <strong>{selectedContact.name}</strong>
                    {selectedContact.organisation && (
                      <span className="text-gray-500"> • {selectedContact.organisation}</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Campaign */}
            <div>
              <label htmlFor="activity-campaign" className="block text-sm font-medium text-gray-700 mb-2">
                Campaign (Optional)
              </label>
              <div className="flex space-x-2">
                <Select
                  id="activity-campaign"
                  options={campaignOptions}
                  value={formData.campaignId}
                  onChange={(value) => handleInputChange('campaignId', value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCampaignModal(true)}
                  className="px-3"
                >
                  +
                </Button>
              </div>
              {selectedCampaign && (
                <div className="mt-2 p-2 bg-gray-50 rounded-md" data-testid="campaign-info-container">
                  <p className="text-sm text-gray-700">
                    <strong>{selectedCampaign.name}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none"
              >
                {loading ? 'Logging Activity...' : 'Log Activity'}
              </Button>
              
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>
      </Card>

      {/* Contact Modal */}
      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Add New Contact"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Contact creation will be implemented in the next phase.
          </p>
          <Button
            onClick={() => setShowContactModal(false)}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </Modal>

      {/* Campaign Modal */}
      <Modal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        title="Create New Campaign"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Campaign creation will be implemented in the next phase.
          </p>
          <Button
            onClick={() => setShowCampaignModal(false)}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </Modal>
    </div>
  )
} 
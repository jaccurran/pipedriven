'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { Campaign } from '@prisma/client'
import type { UserWithoutPassword } from '@/types/user'

interface CampaignFormData {
  name: string
  description: string
  status: string
  startDate: string
  endDate: string
  targetLeads: number
  budget: number
}

interface CampaignFormProps {
  user: UserWithoutPassword
  campaign?: Campaign
  onSubmit: (data: CampaignFormData) => Promise<void>
  onCancel?: () => void
}

export function CampaignForm({ user, campaign, onSubmit, onCancel }: CampaignFormProps) {
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    status: 'PLANNED',
    startDate: '',
    endDate: '',
    targetLeads: 0,
    budget: 0,
  })
  
  const [errors, setErrors] = useState<Partial<CampaignFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        description: campaign.description || '',
        status: campaign.status,
        startDate: campaign.startDate.toISOString().split('T')[0],
        endDate: campaign.endDate.toISOString().split('T')[0],
        targetLeads: campaign.targetLeads,
        budget: campaign.budget,
      })
    }
  }, [campaign])

  const validateForm = (): boolean => {
    const newErrors: Partial<CampaignFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      if (endDate <= startDate) {
        newErrors.endDate = 'End date must be after start date'
      }
    }

    if (formData.targetLeads < 0) {
      newErrors.targetLeads = 'Target leads must be a positive number'
    }

    if (formData.budget < 0) {
      newErrors.budget = 'Budget must be a positive number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting campaign:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof CampaignFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'PLANNED',
        startDate: '',
        endDate: '',
        targetLeads: 0,
        budget: 0,
      })
      setErrors({})
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="campaign-form">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Campaign Name */}
        <div className="md:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Campaign Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.name ? 'border-red-300' : ''
            }`}
            placeholder="Enter campaign name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe your campaign goals and strategy"
          />
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="PLANNED">Planned</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            Start Date *
          </label>
          <input
            type="date"
            id="startDate"
            value={formData.startDate}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
            className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.startDate ? 'border-red-300' : ''
            }`}
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
          )}
        </div>

        {/* End Date */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
            End Date *
          </label>
          <input
            type="date"
            id="endDate"
            value={formData.endDate}
            onChange={(e) => handleInputChange('endDate', e.target.value)}
            className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.endDate ? 'border-red-300' : ''
            }`}
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
          )}
        </div>

        {/* Target Leads */}
        <div>
          <label htmlFor="targetLeads" className="block text-sm font-medium text-gray-700">
            Target Leads
          </label>
          <input
            type="number"
            id="targetLeads"
            min="0"
            value={formData.targetLeads}
            onChange={(e) => handleInputChange('targetLeads', parseInt(e.target.value) || 0)}
            className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.targetLeads ? 'border-red-300' : ''
            }`}
            placeholder="0"
          />
          {errors.targetLeads && (
            <p className="mt-1 text-sm text-red-600">{errors.targetLeads}</p>
          )}
        </div>

        {/* Budget */}
        <div>
          <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
            Budget ($)
          </label>
          <input
            type="number"
            id="budget"
            min="0"
            step="0.01"
            value={formData.budget}
            onChange={(e) => handleInputChange('budget', parseFloat(e.target.value) || 0)}
            className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.budget ? 'border-red-300' : ''
            }`}
            placeholder="0.00"
          />
          {errors.budget && (
            <p className="mt-1 text-sm text-red-600">{errors.budget}</p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          data-testid="cancel-button"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : campaign ? 'Update Campaign' : 'Save Campaign'}
        </button>
      </div>
    </form>
  )
} 
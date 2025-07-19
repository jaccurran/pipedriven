'use client'

import React, { useState } from 'react'
import { Contact, Organization } from '@prisma/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { QuickActionButton, type ActionType } from '@/components/actions/QuickActionButton'
import { ActionMenu, type SecondaryActionType } from '@/components/actions/ActionMenu'
import { createWarmLeadToast, createSyncErrorToast, usePipedriveToastContext } from '@/components/ui/PipedriveToast'

interface ContactWithOrganization extends Contact {
  organization?: Organization | null
}

interface ContactCardProps {
  contact: ContactWithOrganization
  onEdit?: (contact: ContactWithOrganization) => void
  onDelete?: (contact: ContactWithOrganization) => void
  onActivity?: (contactId: string, activityType: string, note?: string) => void
  onWarmnessUpdate?: (contactId: string, newScore: number) => void
  onDeactivate?: (contact: ContactWithOrganization) => void
  onReactivate?: (contact: ContactWithOrganization) => void
  className?: string
}

export function ContactCard({
  contact,
  onEdit,
  onDelete,
  onActivity,
  onWarmnessUpdate,
  onDeactivate,
  onReactivate,
  className = '',
}: ContactCardProps) {
  const { addToast } = usePipedriveToastContext();
  
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Never'
    const d = new Date(date)
    if (isNaN(d.getTime())) return 'Never'
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  }

  // Get activity status color based on warmness score and last contacted date
  const getActivityStatusColor = () => {
    if (contact.warmnessScore >= 7) {
      return 'bg-green-100 text-green-800'
    }
    if (contact.warmnessScore <= 2) {
      return 'bg-red-100 text-red-800'
    }
    
    // Check last contacted date for medium warmness contacts
    if (contact.lastContacted) {
      const daysSinceContact = Math.floor(
        (Date.now() - new Date(contact.lastContacted).getTime()) / (1000 * 60 * 60 * 24)
      )
      
      if (daysSinceContact <= 30) {
        return 'bg-yellow-100 text-yellow-800'
      }
    }
    
    return 'bg-gray-100 text-gray-600'
  }

  // Get activity status text
  const getActivityStatusText = () => {
    if (contact.warmnessScore >= 7) {
      return 'Warm Lead'
    }
    if (contact.warmnessScore <= 2) {
      return 'Cold Lead'
    }
    
    if (contact.lastContacted) {
      const daysSinceContact = Math.floor(
        (Date.now() - new Date(contact.lastContacted).getTime()) / (1000 * 60 * 60 * 24)
      )
      
      if (daysSinceContact <= 30) {
        return 'Active'
      }
    }
    
    return 'Inactive'
  }

  // Get Pipedrive status color
  const getPipedriveStatusColor = () => {
    return contact.pipedrivePersonId 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-600'
  }

  // Get warmness score text
  const getWarmnessText = () => {
    if (contact.warmnessScore >= 7) return 'Very Warm'
    if (contact.warmnessScore >= 5) return 'Warm'
    if (contact.warmnessScore >= 3) return 'Lukewarm'
    return 'Cold'
  }

  // Check if recently contacted (within 24 hours)
  const isRecentlyContacted = () => {
    if (!contact.lastContacted) return false
    const now = new Date()
    const lastContacted = new Date(contact.lastContacted)
    const diffTime = now.getTime() - lastContacted.getTime()
    const diffHours = diffTime / (1000 * 60 * 60)
    return diffHours <= 24
  }

  const handlePrimaryAction = (type: ActionType) => {
    if (onActivity) {
      // Map ActionType to activity type
      const activityTypeMap: Record<ActionType, string> = {
        EMAIL: 'EMAIL',
        MEETING_REQUEST: 'MEETING_REQUEST', // Fixed: Meeting requests should be MEETING_REQUEST type
        MEETING: 'MEETING'
      }
      onActivity(contact.id, activityTypeMap[type])
    }
  }

  const handleSecondaryAction = (type: SecondaryActionType, note?: string) => {
    if (onActivity) {
      // Map SecondaryActionType to activity type
      const activityTypeMap: Record<SecondaryActionType, string> = {
        LINKEDIN: 'LINKEDIN', // Fixed: LinkedIn activities should be LINKEDIN type
        PHONE_CALL: 'CALL', // Fixed: Phone call should be CALL type
        CONFERENCE: 'CONFERENCE', // Fixed: Conference should be CONFERENCE type
        REMOVE_AS_ACTIVE: 'REMOVE_AS_ACTIVE' // Fixed: Remove as active action
      }
      onActivity(contact.id, activityTypeMap[type], note)
    }
  }

  const [isUpdatingWarmness, setIsUpdatingWarmness] = useState(false)
  const [localWarmnessScore, setLocalWarmnessScore] = useState(contact.warmnessScore)

  const handleWarmnessChange = async (newScore: number) => {
    if (newScore < 0 || newScore > 10) return
    
    setIsUpdatingWarmness(true)
    // Optimistically update the local state
    setLocalWarmnessScore(newScore)
    
    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ warmnessScore: newScore }),
      })

      if (response.ok) {
        // Check if contact became a warm lead
        if (newScore >= 4 && !contact.pipedrivePersonId) {
          try {
            const warmLeadResponse = await fetch(`/api/contacts/${contact.id}/check-warm-lead`, {
              method: 'POST'
            });
            
            if (warmLeadResponse.ok) {
              const result = await warmLeadResponse.json();
              if (result.isWarmLead) {
                // Show success toast for warm lead creation
                const toast = createWarmLeadToast(contact.name);
                addToast(toast);
              }
            } else {
              // Show warning toast for sync failure
              const toast = createSyncErrorToast('warm lead creation', 'API request failed');
              addToast(toast);
            }
          } catch (warmLeadError) {
            // Show error toast for warm lead creation failure
            console.error('Warm lead creation failed:', warmLeadError);
            const toast = createSyncErrorToast('warm lead creation', 'Network error');
            addToast(toast);
          }
        }
        
        // Call the callback to notify parent component
        if (onWarmnessUpdate) {
          onWarmnessUpdate(contact.id, newScore)
        }
      } else {
        // Revert the optimistic update if the API call failed
        setLocalWarmnessScore(contact.warmnessScore)
        console.error('Failed to update warmness score')
      }
    } catch (error) {
      // Revert the optimistic update if there was an error
      setLocalWarmnessScore(contact.warmnessScore)
      console.error('Error updating warmness score:', error)
    } finally {
      setIsUpdatingWarmness(false)
    }
  }

  return (
    <Card
      className={cn(
        'p-4 hover:shadow-md transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'sm:p-5', // Larger padding on desktop
        className
      )}
      data-testid="contact-card"
    >
      <div className="space-y-4">
        {/* Header - Mobile optimized */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center space-x-2 mb-2">
              <h3 
                className="text-base font-medium text-gray-900 truncate sm:text-lg" 
                data-testid="contact-name"
              >
                {contact.name}
              </h3>
              
              {/* Pipedrive Status */}
              {contact.pipedrivePersonId && (
                <Badge
                  variant="outline"
                  size="sm"
                  className={cn(
                    'text-xs sm:text-sm',
                    getPipedriveStatusColor()
                  )}
                  data-testid="pipedrive-status"
                >
                  P
                </Badge>
              )}
            </div>
            
            {contact.email && (
              <p className="text-sm text-gray-600 truncate sm:text-base" data-testid="contact-email">
                {contact.email}
              </p>
            )}
            
            {contact.organization && (
              <p className="text-sm text-gray-600 truncate sm:text-base" data-testid="contact-organisation">
                {contact.organization.name}
              </p>
            )}
          </div>
          
          {/* Edit/Delete Actions - Moved to more accessible location */}
          {(onEdit || onDelete) && (
            <div className="flex items-center space-x-1">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(contact)
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors"
                  aria-label="Edit contact"
                  data-testid="edit-contact-button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(contact)
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg transition-colors"
                  aria-label="Delete contact"
                  data-testid="delete-contact-button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Status Indicators - Responsive grid */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Activity Status */}
          <Badge
            variant="outline"
            size="sm"
            className={cn(
              'text-xs sm:text-sm',
              getActivityStatusColor()
            )}
            data-testid="activity-status"
          >
            {getActivityStatusText()}
          </Badge>

          {/* Warmness Score */}
          <Badge
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm bg-blue-50 text-blue-700 border-blue-200"
            data-testid="warmness-badge"
          >
            {getWarmnessText()} ({localWarmnessScore}/10)
          </Badge>

          {/* Campaign Status */}
          {contact.addedToCampaign && (
            <Badge
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm bg-purple-50 text-purple-700 border-purple-200"
            >
              In Campaign
            </Badge>
          )}
        </div>

        {/* Activity Information - Responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 sm:text-base">
          <div>
            <span className="font-medium" data-testid="last-contacted-label">Last Contacted:</span>
            <span className="ml-1" data-testid="last-contacted-value">
              {contact.lastContacted ? formatDate(contact.lastContacted) : 'Never'}
            </span>
            {isRecentlyContacted() && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Recent
              </span>
            )}
          </div>
          <div>
            <span className="font-medium" data-testid="warmness-label">Warmness:</span>
            <span className="ml-1" data-testid="warmness-value">{localWarmnessScore}/10</span>
            <div className="inline-flex items-center ml-2 space-x-1">
              <button
                onClick={() => handleWarmnessChange(localWarmnessScore - 1)}
                disabled={isUpdatingWarmness || localWarmnessScore <= 0}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Decrease warmness score"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <button
                onClick={() => handleWarmnessChange(localWarmnessScore + 1)}
                disabled={isUpdatingWarmness || localWarmnessScore >= 10}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Increase warmness score"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions - Mobile-first layout */}
        {onActivity && (
          <div className="pt-3 border-t border-gray-100">
            {/* Primary Actions - Responsive layout */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <QuickActionButton
                type="EMAIL"
                onClick={handlePrimaryAction}
                contactName={contact.name}
                className="flex-1 sm:flex-none text-sm px-3 py-2 min-h-[44px]"
                data-testid="email-action-button"
              />
              <QuickActionButton
                type="MEETING_REQUEST"
                onClick={handlePrimaryAction}
                contactName={contact.name}
                className="flex-1 sm:flex-none text-sm px-3 py-2 min-h-[44px]"
                data-testid="meeting-request-action-button"
              />
              <QuickActionButton
                type="MEETING"
                onClick={handlePrimaryAction}
                contactName={contact.name}
                className="flex-1 sm:flex-none text-sm px-3 py-2 min-h-[44px]"
                data-testid="meeting-action-button"
              />
            </div>
            
            {/* Secondary Actions - Right-aligned */}
            <div className="flex justify-end">
              <ActionMenu
                onAction={handleSecondaryAction}
                onDeactivate={onDeactivate ? () => onDeactivate(contact) : undefined}
                onReactivate={onReactivate ? () => onReactivate(contact) : undefined}
                contactName={contact.name}
                contactIsActive={contact.isActive}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  )
} 
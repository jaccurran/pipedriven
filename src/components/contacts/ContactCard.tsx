'use client'

import React from 'react'
import { Contact } from '@prisma/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface ContactCardProps {
  contact: Contact
  onEdit?: (contact: Contact) => void
  onDelete?: (contact: Contact) => void
  onActivity?: (contactId: string, activityType: string) => void
  className?: string
}

export function ContactCard({
  contact,
  onEdit,
  onDelete,
  onActivity,
  className = '',
}: ContactCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
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

  return (
    <Card
      className={cn(
        'p-4 hover:shadow-md transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
      data-testid="contact-card"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {contact.name}
              </h3>
              
              {/* Pipedrive Status */}
              <Badge
                variant="outline"
                size="sm"
                className={cn(
                  'text-xs',
                  getPipedriveStatusColor()
                )}
                data-testid="pipedrive-status"
              >
                {contact.pipedrivePersonId ? 'Pipedrive' : 'Local'}
              </Badge>
            </div>
            
            <p className="text-xs text-gray-600 truncate">
              {contact.email}
            </p>
            
            {contact.organisation && (
              <p className="text-xs text-gray-600 truncate">
                {contact.organisation}
              </p>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-1 ml-2">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(contact)
                }}
                className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label="Edit contact"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                aria-label="Delete contact"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center space-x-2">
          {/* Activity Status */}
          <Badge
            variant="outline"
            size="sm"
            className={cn(
              'text-xs',
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
            className="text-xs bg-blue-50 text-blue-700 border-blue-200"
          >
            {getWarmnessText()} ({contact.warmnessScore}/10)
          </Badge>

          {/* Campaign Status */}
          {contact.addedToCampaign && (
            <Badge
              variant="outline"
              size="sm"
              className="text-xs bg-purple-50 text-purple-700 border-purple-200"
            >
              In Campaign
            </Badge>
          )}
        </div>

        {/* Activity Information */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            <span className="font-medium">Last Contacted:</span>
            <span className="ml-1">
              {contact.lastContacted ? formatDate(contact.lastContacted) : 'Never'}
            </span>
          </div>
          <div>
            <span className="font-medium">Warmness:</span>
            <span className="ml-1">{contact.warmnessScore}/10</span>
          </div>
        </div>

        {/* Quick Actions */}
        {onActivity && (
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => onActivity(contact.id, 'EMAIL')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Send Email
            </button>
            <button
              onClick={() => onActivity(contact.id, 'CALL')}
              className="text-xs text-green-600 hover:text-green-800 font-medium"
            >
              Log Call
            </button>
            <button
              onClick={() => onActivity(contact.id, 'MEETING')}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium"
            >
              Schedule Meeting
            </button>
          </div>
        )}
      </div>
    </Card>
  )
} 
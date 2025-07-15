"use client"

import React, { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import type { ContactWithActivities } from '@/lib/my-500-data'
import {
  getContactPriority,
  getContactStatus,
  needsAttention
} from '@/lib/my-500-data'
import { ActivityForm } from '@/components/activities/ActivityForm'
import { Button, Modal } from '@/components/ui'
import { QuickActionButton, type ActionType } from '@/components/actions/QuickActionButton'
import { ActionMenu, type SecondaryActionType } from '@/components/actions/ActionMenu'

interface My500PageProps {
  contacts: ContactWithActivities[]
}

export function My500Page({ contacts }: My500PageProps) {
  const { data: session } = useSession()
  const [search, setSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState<ContactWithActivities | null>(null)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [activityType, setActivityType] = useState<'EMAIL' | 'CALL' | 'MEETING'>('EMAIL')
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const filteredContacts = useMemo(() => {
    return contacts.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (c.organization?.name.toLowerCase().includes(search.toLowerCase()) ?? false)
    )
  }, [contacts, search])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hot': return 'bg-red-100 text-red-800'
      case 'warm': return 'bg-orange-100 text-orange-800'
      case 'cold': return 'bg-blue-100 text-blue-800'
      case 'lost': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 text-red-700'
      case 'medium': return 'border-orange-200 text-orange-700'
      case 'low': return 'border-blue-200 text-blue-700'
      default: return 'border-gray-200 text-gray-700'
    }
  }

  const getDaysSinceContact = (contact: ContactWithActivities): number | null => {
    if (!contact.lastContacted) return null
    const now = new Date()
    const lastContacted = new Date(contact.lastContacted)
    const diffTime = Math.abs(now.getTime() - lastContacted.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const isRecentlyContacted = (contact: ContactWithActivities): boolean => {
    if (!contact.lastContacted) return false
    const now = new Date()
    const lastContacted = new Date(contact.lastContacted)
    const diffTime = now.getTime() - lastContacted.getTime()
    const diffHours = diffTime / (1000 * 60 * 60)
    return diffHours <= 24 // Within last 24 hours
  }

  const handlePrimaryAction = async (contact: ContactWithActivities, type: ActionType) => {
    setSelectedContact(contact)
    // Map ActionType to activity type
    const activityTypeMap: Record<ActionType, 'EMAIL' | 'CALL' | 'MEETING'> = {
      EMAIL: 'EMAIL',
      MEETING_REQUEST: 'MEETING',
      MEETING: 'MEETING'
    }
    setActivityType(activityTypeMap[type])
    setShowActivityModal(true)
    
    // Fetch campaigns for the user
    if (session?.user?.id && campaigns.length === 0) {
      setLoadingCampaigns(true)
      try {
        const response = await fetch('/api/campaigns')
        if (response.ok) {
          const data = await response.json()
          setCampaigns(data.campaigns || [])
        }
      } catch (error) {
        console.error('Failed to fetch campaigns:', error)
      } finally {
        setLoadingCampaigns(false)
      }
    }
  }

  const handleSecondaryAction = async (type: SecondaryActionType) => {
    if (!selectedContact) return
    
    setSelectedContact(selectedContact)
    // Map SecondaryActionType to activity type
    const activityTypeMap: Record<SecondaryActionType, 'EMAIL' | 'CALL' | 'MEETING'> = {
      LINKEDIN: 'EMAIL', // LinkedIn activities as email type for now
      PHONE_CALL: 'CALL',
      CONFERENCE: 'MEETING'
    }
    setActivityType(activityTypeMap[type])
    setShowActivityModal(true)
    
    // Fetch campaigns for the user
    if (session?.user?.id && campaigns.length === 0) {
      setLoadingCampaigns(true)
      try {
        const response = await fetch('/api/campaigns')
        if (response.ok) {
          const data = await response.json()
          setCampaigns(data.campaigns || [])
        }
      } catch (error) {
        console.error('Failed to fetch campaigns:', error)
      } finally {
        setLoadingCampaigns(false)
      }
    }
  }

  const handleActivitySubmit = async (activityData: any) => {
    try {
      // Clean the data - convert empty strings to null for optional fields
      const cleanedData = {
        ...activityData,
        contactId: selectedContact?.id || activityData.contactId || null,
        campaignId: activityData.campaignId || null,
        note: activityData.note || null,
        dueDate: activityData.dueDate ? activityData.dueDate.toISOString() : null,
      }

      // Submit activity to API
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      })

      if (!response.ok) {
        let errorData = {}
        try {
          const responseText = await response.text()
          errorData = responseText ? JSON.parse(responseText) : {}
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          errorData = { error: 'Failed to parse error response' }
        }
        
        throw new Error(`Failed to create activity: ${response.status} ${response.statusText} - ${errorData.details || errorData.error || 'Unknown error'}`)
      }

      // Show success message
      const successMessage = `Activity "${cleanedData.subject}" logged successfully for ${selectedContact?.name}`
      setSuccessMessage(successMessage)
      setShowSuccessMessage(true)
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false)
        setSuccessMessage('')
      }, 3000)

      // Close the modal
      setShowActivityModal(false)
      setSelectedContact(null)
      
      // Refresh the page to show updated activities
      window.location.reload()
    } catch (error) {
      console.error('Failed to log activity:', error)
      alert(`Failed to log activity: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleActivityCancel = () => {
    setShowActivityModal(false)
    setSelectedContact(null)
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">My 500 Contacts</h1>
      <input
        type="text"
        placeholder="Search contacts..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-6 w-full px-3 py-2 border border-gray-300 rounded-md"
      />
      {filteredContacts.length === 0 ? (
        <div className="text-center text-gray-500 py-12">No contacts found.</div>
      ) : (
        <ul className="space-y-4">
          {filteredContacts.map(contact => {
            const status = getContactStatus(contact)
            const priority = getContactPriority(contact)
            const daysSinceContact = getDaysSinceContact(contact)
            const attentionNeeded = needsAttention(contact)
            
            return (
              <li
                key={contact.id}
                className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center justify-between border border-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span data-testid="contact-name" className="font-semibold text-lg">{contact.name}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium uppercase ${getStatusColor(status)}`}>{status}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium uppercase border ${getPriorityColor(priority)}`}>{priority}</span>
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {contact.organization && <span>{contact.organization.name} &middot; </span>}
                    {contact.email}
                  </div>
                  {attentionNeeded && (
                    <div className="mt-2 text-xs text-red-600 font-medium" data-testid="attention-alert">
                      Needs attention
                    </div>
                  )}
                  {contact.activities.length > 0 && (
                    <div className="mt-1 text-xs text-gray-400">
                      Last activity: {contact.activities[0].type} - {contact.activities[0].subject}
                    </div>
                  )}
                </div>
                <div className="mt-2 sm:mt-0 sm:ml-4 flex flex-col sm:flex-row gap-2">
                  <div className="text-sm text-gray-400 text-right">
                    {daysSinceContact !== null ? (
                      <span>{daysSinceContact} days since last contact</span>
                    ) : (
                      <span>Never contacted</span>
                    )}
                    {isRecentlyContacted(contact) && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Recently contacted
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 mt-2 sm:mt-0">
                    {/* Primary Actions - Always visible */}
                    <QuickActionButton
                      type="EMAIL"
                      onClick={(type) => handlePrimaryAction(contact, type)}
                      contactName={contact.name}
                      className="text-xs px-2 py-1"
                    />
                    <QuickActionButton
                      type="MEETING_REQUEST"
                      onClick={(type) => handlePrimaryAction(contact, type)}
                      contactName={contact.name}
                      className="text-xs px-2 py-1"
                    />
                    <QuickActionButton
                      type="MEETING"
                      onClick={(type) => handlePrimaryAction(contact, type)}
                      contactName={contact.name}
                      className="text-xs px-2 py-1"
                    />
                    {/* Secondary Actions - In ellipsis menu */}
                    <ActionMenu
                      onAction={handleSecondaryAction}
                      contactName={contact.name}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Activity Modal */}
      <Modal
        isOpen={showActivityModal}
        onClose={handleActivityCancel}
        title={`Log ${activityType.toLowerCase()} for ${selectedContact?.name}`}
        size="lg"
      >
        {selectedContact && session?.user?.id && (
          <ActivityForm
            userId={session.user.id}
            contacts={[selectedContact]}
            campaigns={campaigns}
            onSubmit={handleActivitySubmit}
            onCancel={handleActivityCancel}
            initialData={{
              type: activityType,
              subject: `${activityType} with ${selectedContact.name}`,
              contactId: selectedContact.id,
            }}
          />
        )}
      </Modal>

      {/* Success Message Toast */}
      {showSuccessMessage && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  )
} 
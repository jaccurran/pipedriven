'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Contact, Campaign, User } from '@prisma/client'
import { ContactCard } from '@/components/contacts/ContactCard'
import { ContactForm } from '@/components/contacts/ContactForm'
import { AddContactModal } from '@/components/campaigns/AddContactModal'
import { Button, Input } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { QuickActionToggle } from '@/components/ui/QuickActionToggle'
import { cn } from '@/lib/utils'

interface CampaignContactListProps {
  contacts: Contact[]
  campaign: Campaign
  user: User
  isLoading?: boolean
  className?: string
  onContactsUpdate?: () => void
}

export function CampaignContactList({
  contacts,
  campaign,
  user,
  isLoading = false,
  className,
  onContactsUpdate,
}: CampaignContactListProps) {
  const [showAddContactModal, setShowAddContactModal] = useState(false)
  const [showCreateContactModal, setShowCreateContactModal] = useState(false)
  const [isCreatingContact, setIsCreatingContact] = useState(false)
  const [isLoadingAction, setIsLoadingAction] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([])
  const [pipedriveContacts, setPipedriveContacts] = useState<any[]>([])
  const [loadingPipedrive, setLoadingPipedrive] = useState(false)
  const [quickActionMode, setQuickActionMode] = useState<'SIMPLE' | 'DETAILED'>('SIMPLE')
  
  // Use ref to avoid dependency issues
  const contactsRef = useRef(contacts)
  contactsRef.current = contacts

  // Sort contacts by warmness score (highest first)
  const sortedContacts = [...contacts].sort((a, b) => b.warmnessScore - a.warmnessScore)

  // Fetch available contacts when modal opens
  useEffect(() => {
    if (showAddContactModal) {
      fetchAvailableContacts()
    }
  }, [showAddContactModal])

  const fetchAvailableContacts = useCallback(async () => {
    try {
      const response = await fetch('/api/contacts')
      if (response.ok) {
        const data = await response.json()
        // Filter out contacts already in this campaign using ref
        const available = data.contacts.filter((contact: Contact) => 
          !contactsRef.current.some(c => c.id === contact.id)
        )
        setAvailableContacts(available)
      }
    } catch (error) {
      console.error('Failed to fetch available contacts:', error)
    }
  }, []) // Remove contacts dependency

  const handleSearchPipedrive = useCallback(async (query: string) => {
    setLoadingPipedrive(true)
    try {
      const response = await fetch('/api/pipedrive/contacts/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      if (response.ok) {
        const data = await response.json()
        // Add source property to Pipedrive contacts
        const pipedriveContactsWithSource = (data.results || []).map((contact: any) => ({
          ...contact,
          source: 'pipedrive'
        }))
        setPipedriveContacts(pipedriveContactsWithSource)
      } else {
        const errorData = await response.json().catch(() => ({}))
        
        // Don't log error for missing API key - this is expected for users without Pipedrive
        if (errorData.error !== 'Pipedrive API key not configured') {
          console.error('Failed to search Pipedrive contacts:', errorData.error || 'Unknown error')
        }
        setPipedriveContacts([])
      }
    } catch (error) {
      console.error('Failed to search Pipedrive contacts:', error)
      setPipedriveContacts([])
    } finally {
      setLoadingPipedrive(false)
    }
  }, [])

  const handleAddContact = useCallback(() => {
    setShowAddContactModal(true)
  }, [])

  const handleCloseAddContactModal = useCallback(() => {
    setShowAddContactModal(false)
  }, [])

  const addContactToCampaign = useCallback(async (contactId: string | number) => {
    console.log('Adding contact to campaign:', { contactId, campaignId: campaign.id })
    
    const response = await fetch(`/api/campaigns/${campaign.id}/assign-contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contactIds: [String(contactId)] }),
    })

    console.log('Campaign assignment response status:', response.status)

    if (response.ok) {
      setShowAddContactModal(false)
      // Notify parent to refresh contacts instead of reloading page
      if (onContactsUpdate) {
        onContactsUpdate()
      }
    } else {
      const errorData = await response.json().catch(() => ({}))
      console.error('Failed to add contact to campaign:', errorData)
    }
  }, [campaign.id, onContactsUpdate])

  const handleSelectContact = useCallback(async (contact: any) => {
    setIsLoadingAction(true)
    try {
      console.log('Selected contact:', contact)
      
      // If it's a Pipedrive contact, create it locally first
      if (contact.source === 'pipedrive') {
        console.log('Creating Pipedrive contact locally...')
        const createResponse = await fetch('/api/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: contact.name,
            email: contact.email?.[0] || '',
            phone: contact.phone?.[0] || '',
            organisation: contact.org_name || '',
            pipedrivePersonId: contact.id.toString(),
          }),
        })

        console.log('Contact creation response status:', createResponse.status)
        
        if (createResponse.ok) {
          const newContact = await createResponse.json()
          console.log('Created new contact:', newContact)
          // Mark as pipedrive source for UI
          newContact.source = 'pipedrive'
          await addContactToCampaign(String(newContact.id))
        } else {
          const errorData = await createResponse.json().catch(() => ({}))
          console.error('Failed to create contact from Pipedrive:', errorData)
        }
      } else {
        console.log('Adding local contact to campaign...')
        // Local contact
        await addContactToCampaign(String(contact.id))
      }
    } catch (error) {
      console.error('Failed to add contact to campaign:', error)
    } finally {
      setIsLoadingAction(false)
    }
  }, [addContactToCampaign])

  const handleCreateContact = useCallback(async (searchQuery: string) => {
    setShowCreateContactModal(true)
  }, [])

  const handleCreateContactSubmit = useCallback(async (formData: any) => {
    setIsCreatingContact(true)
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const newContact = await response.json()
        setShowCreateContactModal(false)
        // Refresh available contacts
        await fetchAvailableContacts()
        setShowAddContactModal(true)
      } else {
        console.error('Failed to create contact')
      }
    } catch (error) {
      console.error('Failed to create contact:', error)
    } finally {
      setIsCreatingContact(false)
    }
  }, [fetchAvailableContacts])



  const handleRemoveContact = useCallback(async (contact: Contact) => {
    setIsLoadingAction(true)
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/assign-contacts`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactIds: [contact.id] }),
      })

      if (response.ok) {
        // Notify parent to refresh contacts instead of reloading page
        if (onContactsUpdate) {
          onContactsUpdate()
        }
      } else {
        console.error('Failed to remove contact from campaign')
      }
    } catch (error) {
      console.error('Failed to remove contact from campaign:', error)
    } finally {
      setIsLoadingAction(false)
    }
  }, [campaign.id, onContactsUpdate])

  const handleActivity = useCallback(async (contactId: string, actionType: string) => {
    // For test integration - expose mode globally
    if (typeof window !== 'undefined') {
      (window as any).__quickActionMode = quickActionMode
    }

    if (quickActionMode === 'SIMPLE') {
      // Simple mode: direct logging
      setIsLoadingAction(true)
      try {
        // Map action types to activity types
        const activityTypeMap: Record<string, string> = {
          'EMAIL': 'EMAIL',
          'MEETING_REQUEST': 'MEETING',
          'MEETING': 'MEETING',
          'LINKEDIN': 'LINKEDIN',
          'PHONE_CALL': 'CALL',
          'CONFERENCE': 'CONFERENCE'
        }

        const activityType = activityTypeMap[actionType] || 'EMAIL'
        
        // Create activity via API
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: activityType,
            contactId: contactId,
            campaignId: campaign.id,
            note: `Activity logged: ${actionType}`,
          }),
        })

        if (response.ok) {
          // Show success message
          const successMessage = `Activity "${actionType}" logged successfully for contact`
          setSuccessMessage(successMessage)
          setShowSuccessMessage(true)
          
          // Hide success message after 3 seconds
          setTimeout(() => {
            setShowSuccessMessage(false)
            setSuccessMessage('')
          }, 3000)
          
          // Refresh contacts to show updated lastContacted
          if (onContactsUpdate) {
            onContactsUpdate()
          }
        } else {
          console.error('Failed to log activity:', await response.text())
        }
      } catch (error) {
        console.error('Failed to log activity:', error)
      } finally {
        setIsLoadingAction(false)
      }
    } else {
      // Detailed mode: show modal (for now, just set a flag for testing)
      if (typeof window !== 'undefined') {
        (window as any).__modalShown = true
      }
    }
  }, [campaign.id, onContactsUpdate, quickActionMode])

  const handleEditContact = useCallback(async (contact: Contact) => {
    setIsLoadingAction(true)
    try {
      // TODO: Implement edit contact functionality
      console.log('Edit contact:', contact.id)
      // This could open an edit modal or navigate to an edit page
    } catch (error) {
      console.error('Failed to edit contact:', error)
    } finally {
      setIsLoadingAction(false)
    }
  }, [])



  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Contacts</h3>
          <Button disabled>Add Contact</Button>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-500">Loading contacts...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Quick Action Toggle */}
      <div className="flex justify-end">
        <QuickActionToggle
          mode={quickActionMode}
          onModeChange={setQuickActionMode}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Contacts ({contacts.length})
        </h3>
        <div className="flex space-x-2">
          <Button
            onClick={handleCreateContact}
            disabled={isLoadingAction}
            variant="outline"
            aria-label="Create new contact"
          >
            Create Contact
          </Button>
          <Button
            onClick={handleAddContact}
            disabled={isLoadingAction}
            aria-label="Add contact to campaign"
          >
            Add Contact
          </Button>
        </div>
      </div>

      {/* Contact List */}
      {sortedContacts.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">No contacts assigned to this campaign</div>
          <div className="text-sm text-gray-400">
            Add contacts to this campaign to start tracking activities
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={handleEditContact}
              onDelete={() => handleRemoveContact(contact)}
              onActivity={(contactId, actionType) => handleActivity(contactId, actionType)}
              className="border border-gray-200 rounded-lg p-4"
            />
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={showAddContactModal}
        onClose={handleCloseAddContactModal}
        onSelect={handleSelectContact}
        onCreate={handleCreateContact}
        onSearchPipedrive={handleSearchPipedrive}
        localContacts={availableContacts}
        pipedriveContacts={pipedriveContacts}
        loadingPipedrive={loadingPipedrive}
      />

      {/* Create Contact Modal */}
      <Modal
        isOpen={showCreateContactModal}
        onClose={() => setShowCreateContactModal(false)}
        title="Create New Contact"
        size="lg"
      >
        <ContactForm
          onSubmit={handleCreateContactSubmit}
          onCancel={() => setShowCreateContactModal(false)}
          submitLabel="Create Contact"
          cancelLabel="Cancel"
          loading={isCreatingContact}
          mode="create"
        />
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
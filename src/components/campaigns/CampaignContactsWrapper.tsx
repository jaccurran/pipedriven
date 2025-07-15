'use client'

import { useState, useCallback, useRef } from 'react'
import { CampaignContactList } from './CampaignContactList'
import type { Contact, Campaign, User } from '@prisma/client'

interface CampaignContactsWrapperProps {
  campaign: Campaign
  user: User
  initialContacts: Contact[]
}

export function CampaignContactsWrapper({
  campaign,
  user,
  initialContacts,
}: CampaignContactsWrapperProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [isLoading, setIsLoading] = useState(false)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleContactsUpdate = useCallback(async () => {
    console.log('CampaignContactsWrapper: handleContactsUpdate called')
    
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    
    // Debounce the refresh to prevent too frequent calls
    refreshTimeoutRef.current = setTimeout(async () => {
      console.log('CampaignContactsWrapper: Executing refresh')
      setIsLoading(true)
      try {
        // Fetch updated campaign data to get the latest contacts
        const response = await fetch(`/api/campaigns/${campaign.id}`)
        if (response.ok) {
          const updatedCampaign = await response.json()
          setContacts(updatedCampaign.contacts || [])
        }
      } catch (error) {
        console.error('Failed to refresh contacts:', error)
      } finally {
        setIsLoading(false)
      }
    }, 100) // 100ms debounce
  }, [campaign.id])

  return (
    <CampaignContactList
      contacts={contacts}
      campaign={campaign}
      user={user}
      isLoading={isLoading}
      onContactsUpdate={handleContactsUpdate}
    />
  )
} 
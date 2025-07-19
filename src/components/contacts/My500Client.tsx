"use client"

import React, { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useDebouncedCallback } from 'use-debounce'
import type { ContactWithActivities } from '@/lib/my-500-data'
import { useMy500Contacts, useSyncContacts, useSyncStatus } from '@/hooks/useMy500Contacts'
import { useMy500Filters } from '@/hooks/useMy500Filters'
import {
  getContactStatus,
  needsAttention
} from '@/lib/my-500-data'
import {
  getDaysSinceLastContact,
  getActivityStatusColor
} from '@/lib/contactSorting'
import { ActivityForm } from '@/components/activities/ActivityForm'
import { Button, Modal, Input, Select } from '@/components/ui'
import { QuickActionButton, type ActionType } from '@/components/actions/QuickActionButton'
import { ActionMenu, type SecondaryActionType } from '@/components/actions/ActionMenu'
import { QuickActionToggle } from '@/components/ui/QuickActionToggle'
import { type User } from '@prisma/client'
import { SyncProgressBar } from '@/components/contacts/SyncProgressBar'
import { DeactivateConfirmationModal } from '@/components/contacts/DeactivateConfirmationModal'
import { ReactivateConfirmationModal } from '@/components/contacts/ReactivateConfirmationModal'
import { useContactActions } from '@/hooks/useContactActions'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
  hasPrev: boolean
}

interface SyncStatus {
  lastSync: string | null
  totalContacts: number
  syncedContacts: number
  pendingSync: boolean
  syncInProgress: boolean
  syncStatus?: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED' | null
}

interface My500ClientProps {
  initialContacts: ContactWithActivities[]
  initialPagination?: PaginationInfo
  initialSyncStatus?: SyncStatus
  user: User
}

export function My500Client({ 
  initialContacts, 
  initialPagination, 
  initialSyncStatus,
  user
}: My500ClientProps) {

  const { data: session } = useSession()
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [filter, setFilter] = useState<string | undefined>(undefined)
  const [country, setCountry] = useState<string | undefined>(undefined)
  const [sector, setSector] = useState<string | undefined>(undefined)
  const [sort, setSort] = useState('warmnessScore')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  
  // React Query hooks with error handling
  const { data: contactsData, isLoading, error: contactsError } = useMy500Contacts({
    search: debouncedSearchTerm,
    page,
    limit: 20,
    filter: filter || undefined,
    country: country || undefined,
    sector: sector || undefined,
    sort,
    order,
  })
  
  const syncMutation = useSyncContacts()
  const { error: syncStatusError } = useSyncStatus()
  
  // Fetch dynamic filters from Pipedrive
  const { data: filtersData, isLoading: filtersLoading } = useMy500Filters()
  
  // Extract data with fallbacks and defensive checks
  const contacts = React.useMemo(() => {
    const dataContacts = contactsData?.data?.contacts
    const fallbackContacts = Array.isArray(initialContacts) ? initialContacts : []
    const result = Array.isArray(dataContacts) ? dataContacts : fallbackContacts
    

    
    return result
  }, [contactsData?.data?.contacts, initialContacts])
  
  // Ensure contacts is always an array
  const safeContacts = Array.isArray(contacts) ? contacts : []
  

  
  const pagination = contactsData?.data?.pagination || initialPagination || {
    page: 1,
    limit: 20,
    total: safeContacts.length,
    totalPages: 1,
    hasMore: false,
    hasPrev: false,
  }
  
  const syncStatus = contactsData?.data?.syncStatus || initialSyncStatus || {
    lastSync: null,
    totalContacts: safeContacts.length,
    syncedContacts: 0,
    pendingSync: false,
    syncInProgress: false,
  }
  
  // UI state
  const [selectedContact, setSelectedContact] = useState<ContactWithActivities | null>(null)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [activityType, setActivityType] = useState<'EMAIL' | 'CALL' | 'MEETING' | 'MEETING_REQUEST' | 'LINKEDIN' | 'REFERRAL' | 'CONFERENCE'>('EMAIL')
  const [selectedNote, setSelectedNote] = useState<string>('')
  const [campaigns] = useState<Array<{ id: string; name: string }>>([])

  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [quickActionMode, setQuickActionMode] = useState<'SIMPLE' | 'DETAILED'>(user.quickActionMode || 'SIMPLE')
  
  // Loading states from React Query
  const isSyncing = syncMutation.isPending

  // Add state for sync progress bar
  const [syncId, setSyncId] = useState<string | null>(null)
  const [showProgressBar, setShowProgressBar] = useState(false)

  // Add state for deactivate/reactivate modals
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false)
  const [reactivateModalOpen, setReactivateModalOpen] = useState(false)
  const [actionContact, setActionContact] = useState<ContactWithActivities | null>(null)

  // Use the custom hook
  const {
    isDeactivating,
    isReactivating,
    deactivateContact,
    reactivateContact,
  } = useContactActions()

  // Utility function to check if contact was recently contacted
  const isRecentlyContacted = useCallback((contact: ContactWithActivities): boolean => {
    if (!contact.lastContacted) return false
    const now = new Date()
    const lastContacted = new Date(contact.lastContacted)
    const diffTime = now.getTime() - lastContacted.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 7 // Consider "recently contacted" if within 7 days
  }, [])

  // Debounced search
  const debouncedSearch = useDebouncedCallback(
    (term: string) => {
      setDebouncedSearchTerm(term)
    },
    300
  )



  // Handle search
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
    debouncedSearch(term)
  }, [debouncedSearch])

  // Handle filter change
  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter || undefined)
    setPage(1)
  }, [])

  // Handle country filter change
  const handleCountryChange = useCallback((newCountry: string) => {
    setCountry(newCountry || undefined)
    setPage(1)
  }, [])

  // Handle sector filter change
  const handleSectorChange = useCallback((newSector: string) => {
    setSector(newSector || undefined)
    setPage(1)
  }, [])

  // Handle sort change
  const handleSortChange = useCallback((newSort: string, newOrder: 'asc' | 'desc') => {
    setSort(newSort)
    setOrder(newOrder)
    setPage(1)
  }, [])

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  // Sync contacts with Pipedrive
  const handleSync = useCallback(async (forceFullSync = false) => {
    if (isSyncing) return
    
    let syncData: { syncType: 'INCREMENTAL' | 'FULL'; sinceTimestamp?: string }
    
    // Determine sync type based on sync status and last sync time
    // Force full sync if:
    // 1. User explicitly requests full sync
    // 2. No last sync timestamp (first time)
    // 3. Previous sync was interrupted (syncStatus indicates failure/incomplete)
    // 4. Database sync status indicates failure or in progress
    const shouldForceFullSync = forceFullSync || 
                               !syncStatus.lastSync || 
                               syncStatus.syncInProgress || 
                               syncStatus.pendingSync ||
                               syncStatus.syncStatus === 'FAILED' ||
                               syncStatus.syncStatus === 'IN_PROGRESS'
    
    if (shouldForceFullSync) {
      // Full sync to ensure we don't miss any contacts
      syncData = { syncType: 'FULL' }
    } else {
      // Incremental sync if we have a successful last sync timestamp
      syncData = { 
        syncType: 'INCREMENTAL',
        sinceTimestamp: syncStatus.lastSync || undefined
      }
    }
    
    try {
      const result = await syncMutation.mutateAsync(syncData)
      // Extract syncId from result if available
      if (result.success && result.data?.syncId) {
        setSyncId(typeof result.data.syncId === 'string' ? result.data.syncId : null)
        setShowProgressBar(true)
      }
      
      if (result.success && result.data?.results) {
        const results = result.data.results as { 
          updated: number; 
          created: number; 
          failed: number; 
          errors: string[] 
        }
        
        // Build clean stats message
        let message = `Sync completed: ${results.updated} updated, ${results.created} created`
        
        // Add failure count if there were failures
        if (results.failed > 0) {
          message += `, ${results.failed} failed`
        }
        
        setSuccessMessage(message)
        setShowSuccessMessage(true)
        setTimeout(() => setShowSuccessMessage(false), 3000) // Show for 3 seconds
      }
    } catch (error) {
      console.error('Sync error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Sync failed. Please try again.'
      setSuccessMessage(errorMessage)
      setShowSuccessMessage(true)
      setTimeout(() => setShowSuccessMessage(false), 5000) // Show for longer for error messages
      setShowProgressBar(false)
    }
  }, [isSyncing, syncStatus.lastSync, syncStatus.pendingSync, syncStatus.syncInProgress, syncStatus.syncStatus, syncMutation])

  // Hide progress bar on completion
  const handleProgressComplete = useCallback(() => {
    setShowProgressBar(false)
    setSyncId(null)
  }, [])


  // Action handlers
  const handlePrimaryAction = useCallback(async (contact: ContactWithActivities, type: ActionType) => {
    // For test integration - expose mode globally
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__quickActionMode = quickActionMode
    }

    if (quickActionMode === 'SIMPLE') {
      // Simple mode: direct logging
      try {
        const activityTypeMap: Record<ActionType, 'EMAIL' | 'CALL' | 'MEETING' | 'MEETING_REQUEST'> = {
          EMAIL: 'EMAIL',
          MEETING_REQUEST: 'MEETING_REQUEST', // Fixed: Meeting requests should be MEETING_REQUEST type
          MEETING: 'MEETING'
        }
        const activityType = activityTypeMap[type]
        
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: activityType,
            contactId: contact.id,
            subject: `${activityType} with ${contact.name}`,
            note: `Activity logged: ${type}`,
          }),
        })

        if (response.ok) {
          setSuccessMessage(`Activity "${type}" logged successfully for ${contact.name}`)
          setShowSuccessMessage(true)
          setTimeout(() => setShowSuccessMessage(false), 3000)
        } else {
          console.error('Failed to log activity:', await response.text())
        }
      } catch (error) {
        console.error('Failed to log activity:', error)
      }
    } else {
      // Detailed mode: show modal
      setSelectedContact(contact)
      const activityTypeMap: Record<ActionType, 'EMAIL' | 'CALL' | 'MEETING' | 'MEETING_REQUEST'> = {
        EMAIL: 'EMAIL',
        MEETING_REQUEST: 'MEETING_REQUEST', // Fixed: Meeting requests should be MEETING_REQUEST type
        MEETING: 'MEETING'
      }
      setActivityType(activityTypeMap[type])
      setShowActivityModal(true)
      
      // For test integration
      if (typeof window !== 'undefined') {
        (window as unknown as Record<string, unknown>).__modalShown = true
      }
      

    }
  }, [quickActionMode])

  // Handler for ActionMenu
  const handleSecondaryAction = useCallback(async (actionType: SecondaryActionType, contact: ContactWithActivities, note?: string) => {
    console.log('handleSecondaryAction called:', actionType, contact.name)
    
    if (actionType === 'REMOVE_AS_ACTIVE') {
      console.log('REMOVE_AS_ACTIVE action triggered for:', contact.name, 'isActive:', contact.isActive)
      if (contact.isActive) {
        setActionContact(contact)
        setDeactivateModalOpen(true)
      } else {
        setActionContact(contact)
        setReactivateModalOpen(true)
      }
    } else {
      // Handle activity-based secondary actions
      if (quickActionMode === 'SIMPLE') {
        // Simple mode: direct logging
        try {
          const activityTypeMap: Record<SecondaryActionType, 'EMAIL' | 'CALL' | 'MEETING' | 'LINKEDIN' | 'CONFERENCE'> = {
            LINKEDIN: 'LINKEDIN',
            PHONE_CALL: 'CALL',
            CONFERENCE: 'CONFERENCE',
            REMOVE_AS_ACTIVE: 'EMAIL' // This won't be used but needed for type completeness
          }
          const activityType = activityTypeMap[actionType]
          
          const response = await fetch('/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              type: activityType,
              contactId: contact.id,
              subject: `${activityType} with ${contact.name}`,
              note: note || `Activity logged: ${actionType}`,
            }),
          })

          if (response.ok) {
            setSuccessMessage(`Activity "${actionType}" logged successfully for ${contact.name}`)
            setShowSuccessMessage(true)
            setTimeout(() => setShowSuccessMessage(false), 3000)
          } else {
            console.error('Failed to log activity:', await response.text())
          }
        } catch (error) {
          console.error('Failed to log activity:', error)
        }
      } else {
        // Detailed mode: show modal
        setSelectedContact(contact)
        const activityTypeMap: Record<SecondaryActionType, 'EMAIL' | 'CALL' | 'MEETING' | 'LINKEDIN' | 'CONFERENCE'> = {
          LINKEDIN: 'LINKEDIN',
          PHONE_CALL: 'CALL',
          CONFERENCE: 'CONFERENCE',
          REMOVE_AS_ACTIVE: 'EMAIL' // This won't be used but needed for type completeness
        }
        setActivityType(activityTypeMap[actionType])
        setSelectedNote(note || '')
        setShowActivityModal(true)
        
        // For test integration
        if (typeof window !== 'undefined') {
          (window as unknown as Record<string, unknown>).__modalShown = true
        }
      }
    }
  }, [quickActionMode])

  const handleActivitySubmit = useCallback(async (activityData: {
    type: string;
    subject?: string;
    note?: string;
    dueDate?: Date;
    contactId?: string;
    campaignId?: string;
  }) => {
    try {
      const cleanedData = {
        ...activityData,
        contactId: selectedContact?.id || activityData.contactId || null,
        campaignId: activityData.campaignId || null,
        note: activityData.note || null,
        dueDate: activityData.dueDate ? activityData.dueDate.toISOString() : null,
      }

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(cleanedData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Failed to create activity: ${errorData.error || response.statusText}`)
      }

      setSuccessMessage(`Activity "${cleanedData.subject}" logged successfully for ${selectedContact?.name}`)
      setShowSuccessMessage(true)
      setTimeout(() => setShowSuccessMessage(false), 3000)

      setShowActivityModal(false)
      setSelectedContact(null)
    } catch (error) {
      console.error('Failed to log activity:', error)
      alert(`Failed to log activity: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [selectedContact])

  const handleActivityCancel = useCallback(() => {
    setShowActivityModal(false)
    setSelectedContact(null)
  }, [])

  // Confirm handlers
  const handleDeactivateConfirm = async (options: { reason?: string; removeFromSystem?: boolean }) => {
    if (!actionContact) return
    try {
      await deactivateContact(actionContact.id, options)
      setDeactivateModalOpen(false)
      setActionContact(null)
      setShowSuccessMessage(true)
      setSuccessMessage(`${actionContact.name} marked as inactive.`)
      // Optionally refresh contacts here
    } catch (error) {
      setShowSuccessMessage(true)
      setSuccessMessage(`Failed to deactivate: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  const handleReactivateConfirm = async (options: { reason?: string }) => {
    if (!actionContact) return
    try {
      await reactivateContact(actionContact.id, options)
      setReactivateModalOpen(false)
      setActionContact(null)
      setShowSuccessMessage(true)
      setSuccessMessage(`${actionContact.name} reactivated.`)
      // Optionally refresh contacts here
    } catch (error) {
      setShowSuccessMessage(true)
      setSuccessMessage(`Failed to reactivate: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }


  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Sync Progress Bar */}
      {showProgressBar && syncId && (
        <div className="mb-4">
          <SyncProgressBar syncId={syncId} onComplete={handleProgressComplete} />
        </div>
      )}
      {/* Error Alert */}
      {(contactsError || syncStatusError) && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading My-500 data</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{contactsError?.message || syncStatusError?.message || 'An unknown error occurred.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Quick Action Toggle */}
      <div className="flex justify-end mb-4">
        <QuickActionToggle
          mode={quickActionMode}
          onModeChange={setQuickActionMode}
        />
      </div>

      {/* Sync Status and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <p className="text-sm text-gray-600">
            {pagination.total} contacts • Last sync: {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleDateString('en-GB') : 'Never'}
          </p>
          {/* Show sync status warnings */}
          {(syncStatus.syncInProgress || syncStatus.pendingSync || syncStatus.syncStatus === 'FAILED' || syncStatus.syncStatus === 'IN_PROGRESS') && (
            <p className="text-sm text-amber-600 mt-1">
              ⚠️ Previous sync was interrupted. Next sync will be a full import to ensure no contacts are missed.
            </p>
          )}
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
          >
            {isSyncing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Syncing...
              </div>
            ) : (
              'Sync Now'
            )}
          </Button>
          <Button
            onClick={() => handleSync(true)} // Force full sync
            disabled={isSyncing}
            variant="outline"
            className="text-gray-600 border-gray-300 hover:bg-gray-50 w-full sm:w-auto"
          >
            {isSyncing ? 'Syncing...' : 'Force Full Sync'}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Input
              type="text"
              placeholder="Search contacts by name, email, or organization..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full"
            />
          </div>
          <Select
            value={filter}
            onChange={(value) => handleFilterChange(value)}
            options={[
              { value: '', label: 'All Contacts' },
              { value: 'campaign', label: 'Campaign Contacts' }
            ]}
            className="w-full"
          />
          <Select
            value={country}
            onChange={(value) => handleCountryChange(value)}
            options={[
              { value: '', label: 'All Countries' },
              ...(filtersData?.countries || []).map(country => ({
                value: country,
                label: country
              }))
            ]}
            className="w-full"
            disabled={filtersLoading}
          />
          <Select
            value={sector}
            onChange={(value) => handleSectorChange(value)}
            options={[
              { value: '', label: 'All Sectors' },
              ...(filtersData?.sectors || []).map(sector => ({
                value: sector,
                label: sector
              }))
            ]}
            className="w-full"
            disabled={filtersLoading}
          />
          <Select
            value={`${sort}-${order}`}
            onChange={(value) => {
              const [newSort, newOrder] = value.split('-')
              handleSortChange(newSort, newOrder as 'asc' | 'desc')
            }}
            options={[
              { value: 'warmnessScore-asc', label: 'Warmness (Low to High)' },
              { value: 'warmnessScore-desc', label: 'Warmness (High to Low)' },
              { value: 'lastContacted-asc', label: 'Last Contacted (Oldest)' },
              { value: 'lastContacted-desc', label: 'Last Contacted (Newest)' },
              { value: 'createdAt-desc', label: 'Created (Newest)' },
              { value: 'createdAt-asc', label: 'Created (Oldest)' }
            ]}
            className="w-full"
          />
        </div>
      </div>

      {/* Error States */}
      {contactsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading contacts</h3>
              <div className="mt-2 text-sm text-red-700">
                {contactsError.message || 'An unexpected error occurred'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading States */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">
            Loading contacts...
          </p>
        </div>
      )}

      {/* Contact List */}
      {!isLoading && (
        <>
          {safeContacts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try adjusting your search terms.' : 'Start by syncing your Pipedrive contacts.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {safeContacts.map((contact: ContactWithActivities) => {
                const status = getContactStatus(contact)
                const daysSinceContact = getDaysSinceLastContact(contact)
                const attentionNeeded = needsAttention(contact)
                const orgName = contact.organization?.name || null
                const sector = contact.organization?.industry || null
                const country = contact.organization?.country || null
                const warmnessScore = contact.warmnessScore

                return (
                  <div
                    key={contact.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
                  >
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Name and Status Row */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-semibold text-lg sm:text-xl text-gray-900 break-words">{contact.name}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${getActivityStatusColor(status)}`}>{status}</span>
                          {/* Warmness Score Badge */}
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800" title="Warmness Score">
                            🔥 {warmnessScore}
                          </span>
                        </div>
                        
                        {/* Organisation name */}
                        {orgName && (
                          <div className="text-sm text-gray-700 font-medium mb-2" data-testid="org-name">
                            {orgName}
                          </div>
                        )}
                        
                        {/* Sector and Country badges */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {sector && (
                            <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium" title="Sector">
                              {sector}
                            </span>
                          )}
                          {country && (
                            <span className="inline-block px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium" title="Country">
                              {country}
                            </span>
                          )}
                        </div>
                        
                        {/* Attention and Activity Info */}
                        {attentionNeeded && (
                          <div className="text-xs text-red-600 font-medium mb-2">
                            Needs attention
                          </div>
                        )}
                        {Array.isArray(contact.activities) && contact.activities.length > 0 && (
                          <div className="text-xs text-gray-400 mb-3">
                            Last activity: {contact.activities[0].type} - {contact.activities[0].subject}
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons - Mobile Optimized */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-1 sm:ml-4">
                        <QuickActionButton
                          type="EMAIL"
                          onClick={(type) => handlePrimaryAction(contact, type)}
                          contactName={contact.name}
                          className="w-full sm:w-auto px-4 py-3 sm:px-3 sm:py-2 text-sm"
                        />
                        <QuickActionButton
                          type="MEETING_REQUEST"
                          onClick={(type) => handlePrimaryAction(contact, type)}
                          contactName={contact.name}
                          className="w-full sm:w-auto px-4 py-3 sm:px-3 sm:py-2 text-sm"
                        />
                        <QuickActionButton
                          type="MEETING"
                          onClick={(type) => handlePrimaryAction(contact, type)}
                          contactName={contact.name}
                          className="w-full sm:w-auto px-4 py-3 sm:px-3 sm:py-2 text-sm"
                        />
                        <div className="flex justify-center sm:justify-start">
                          <ActionMenu
                            onAction={(type, note) => handleSecondaryAction(type, contact, note)}
                            onDeactivate={() => {
                              setActionContact(contact)
                              setDeactivateModalOpen(true)
                            }}
                            onReactivate={() => {
                              setActionContact(contact)
                              setReactivateModalOpen(true)
                            }}
                            contactName={contact.name}
                            contactIsActive={contact.isActive}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Footer Section */}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
                        <span className="text-center sm:text-left">
                          {daysSinceContact !== null ? (
                            `${daysSinceContact} days since last contact`
                          ) : (
                            'Never contacted'
                          )}
                        </span>
                        {isRecentlyContacted(contact) && (
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Recently contacted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-gray-700 text-center sm:text-left">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              variant="outline"
              size="sm"
              className="min-w-[80px]"
            >
              Previous
            </Button>
            <span className="flex items-center px-3 py-2 text-sm text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasMore}
              variant="outline"
              size="sm"
              className="min-w-[80px]"
            >
              Next
            </Button>
          </div>
        </div>
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
            contacts={[{
              id: selectedContact.id,
              name: selectedContact.name,
              organisation: selectedContact.organisation || undefined
            }]}
            campaigns={campaigns}
            onSubmit={handleActivitySubmit}
            onCancel={handleActivityCancel}
            initialData={{
              type: activityType === 'MEETING_REQUEST' ? 'MEETING' : activityType,
              subject: `${activityType === 'MEETING_REQUEST' ? 'Meeting Request' : activityType} with ${selectedContact.name}`,
              contactId: selectedContact.id,
              note: selectedNote,
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
      <DeactivateConfirmationModal
        contact={actionContact || undefined}
        isOpen={deactivateModalOpen}
        onConfirm={handleDeactivateConfirm}
        onCancel={() => { setDeactivateModalOpen(false); setActionContact(null) }}
        isLoading={isDeactivating}
      />
      <ReactivateConfirmationModal
        contact={actionContact || undefined}
        isOpen={reactivateModalOpen}
        onConfirm={handleReactivateConfirm}
        onCancel={() => { setReactivateModalOpen(false); setActionContact(null) }}
        isLoading={isReactivating}
      />
    </div>
  )
} 
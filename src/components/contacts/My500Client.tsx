"use client"

import React, { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useDebouncedCallback } from 'use-debounce'
import type { ContactWithActivities } from '@/lib/my-500-data'
import { useMy500Contacts, useSyncContacts, useSyncStatus } from '@/hooks/useMy500Contacts'
import {
  getContactPriority,
  getContactStatus,
  needsAttention
} from '@/lib/my-500-data'
import { ActivityForm } from '@/components/activities/ActivityForm'
import { Button, Modal, Input, Select } from '@/components/ui'
import { QuickActionButton, type ActionType } from '@/components/actions/QuickActionButton'
import { ActionMenu, type SecondaryActionType } from '@/components/actions/ActionMenu'
import { QuickActionToggle } from '@/components/ui/QuickActionToggle'
import { type User } from '@prisma/client'

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
  initialSyncStatus
}: My500ClientProps) {
  const { data: session } = useSession()
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState('warmnessScore')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  
  // React Query hooks
  const { data: contactsData, isLoading } = useMy500Contacts({
    search: debouncedSearchTerm,
    page,
    limit: 20,
    filter,
    sort,
    order,
  })
  
  const syncMutation = useSyncContacts()
  const { data: syncStatusData } = useSyncStatus()
  
  // Extract data with fallbacks
  const contacts = (contactsData?.data?.contacts as ContactWithActivities[]) || initialContacts
  const pagination = (contactsData?.data?.pagination as PaginationInfo) || initialPagination || {
    page: 1,
    limit: 20,
    total: initialContacts.length,
    totalPages: 1,
    hasMore: false,
    hasPrev: false,
  }
  const syncStatus = (syncStatusData as SyncStatus) || initialSyncStatus || {
    lastSync: null,
    totalContacts: initialContacts.length,
    syncedContacts: 0,
    pendingSync: false,
    syncInProgress: false,
  }
  
  // UI state
  const [selectedContact, setSelectedContact] = useState<ContactWithActivities | null>(null)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [activityType, setActivityType] = useState<'EMAIL' | 'CALL' | 'MEETING'>('EMAIL')
  const [campaigns] = useState<Array<{ id: string; name: string }>>([])

  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [quickActionMode, setQuickActionMode] = useState<'SIMPLE' | 'DETAILED'>('SIMPLE')
  
  // Loading states from React Query
  const isSyncing = syncMutation.isPending

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
    setFilter(newFilter)
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
  const handleSync = useCallback(async () => {
    if (isSyncing) return
    
    let syncData: { syncType: 'INCREMENTAL' | 'FULL'; sinceTimestamp?: string }
    
    // Determine sync type based on whether we have a last sync time
    if (syncStatus.lastSync) {
      // Incremental sync if we have a last sync timestamp
      syncData = { 
        syncType: 'INCREMENTAL',
        sinceTimestamp: syncStatus.lastSync
      }
    } else {
      // Full sync if no last sync timestamp (first time)
      syncData = { syncType: 'FULL' }
    }
    
    try {
      const result = await syncMutation.mutateAsync(syncData)
      
      if (result.success && result.data?.results) {
        const results = result.data.results as { updated: number; created: number }
        setSuccessMessage(`Sync completed: ${results.updated} updated, ${results.created} created`)
        setShowSuccessMessage(true)
        setTimeout(() => setShowSuccessMessage(false), 3000)
      }
    } catch (error) {
      console.error('Sync error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Sync failed. Please try again.'
      setSuccessMessage(errorMessage)
      setShowSuccessMessage(true)
      setTimeout(() => setShowSuccessMessage(false), 5000) // Show for longer for error messages
    }
  }, [isSyncing, syncStatus.lastSync, syncMutation])



  // Action handlers
  const handlePrimaryAction = useCallback(async (contact: ContactWithActivities, type: ActionType) => {
    // For test integration - expose mode globally
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__quickActionMode = quickActionMode
    }

    if (quickActionMode === 'SIMPLE') {
      // Simple mode: direct logging
      try {
        const activityTypeMap: Record<ActionType, 'EMAIL' | 'CALL' | 'MEETING'> = {
          EMAIL: 'EMAIL',
          MEETING_REQUEST: 'MEETING',
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
      const activityTypeMap: Record<ActionType, 'EMAIL' | 'CALL' | 'MEETING'> = {
        EMAIL: 'EMAIL',
        MEETING_REQUEST: 'MEETING',
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

  const handleSecondaryAction = useCallback(async (type: SecondaryActionType) => {
    if (!selectedContact) return
    
    const activityTypeMap: Record<SecondaryActionType, 'EMAIL' | 'CALL' | 'MEETING'> = {
      LINKEDIN: 'EMAIL',
      PHONE_CALL: 'CALL',
      CONFERENCE: 'MEETING'
    }
    setActivityType(activityTypeMap[type])
    setShowActivityModal(true)
  }, [selectedContact])

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

  // Utility functions
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'hot': return 'bg-red-100 text-red-800'
      case 'warm': return 'bg-orange-100 text-orange-800'
      case 'cold': return 'bg-blue-100 text-blue-800'
      case 'lost': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }, [])

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 text-red-700'
      case 'medium': return 'border-orange-200 text-orange-700'
      case 'low': return 'border-blue-200 text-blue-700'
      default: return 'border-gray-200 text-gray-700'
    }
  }, [])

  const getDaysSinceContact = useCallback((contact: ContactWithActivities): number | null => {
    if (!contact.lastContacted) return null
    const now = new Date()
    const lastContacted = new Date(contact.lastContacted)
    const diffTime = Math.abs(now.getTime() - lastContacted.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }, [])

  const isRecentlyContacted = useCallback((contact: ContactWithActivities): boolean => {
    if (!contact.lastContacted) return false
    const now = new Date()
    const lastContacted = new Date(contact.lastContacted)
    const diffTime = now.getTime() - lastContacted.getTime()
    const diffHours = diffTime / (1000 * 60 * 60)
    return diffHours <= 24
  }, [])

  return (
    <div className="w-full">
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
            {pagination.total} contacts • Last sync: {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleDateString() : 'Never'}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
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
            className="w-full sm:w-48"
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
            className="w-full sm:w-48"
          />
        </div>
      </div>

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
          {contacts.length === 0 ? (
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
            <div className="space-y-4">
              {contacts.map((contact: ContactWithActivities) => {
                const status = getContactStatus(contact)
                const priority = getContactPriority(contact)
                const daysSinceContact = getDaysSinceContact(contact)
                const attentionNeeded = needsAttention(contact)
                
                return (
                  <div
                    key={contact.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg text-gray-900">{contact.name}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${getStatusColor(status)}`}>
                            {status}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase border ${getPriorityColor(priority)}`}>
                            {priority}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-500 mt-1">
                          {contact.organisation && <span className="mr-2">{contact.organisation}</span>}
                          {contact.email && <span>{contact.email}</span>}
                        </div>
                        
                        {attentionNeeded && (
                          <div className="mt-2 text-xs text-red-600 font-medium">
                            Needs attention
                          </div>
                        )}
                        
                        {contact.activities.length > 0 && (
                          <div className="mt-1 text-xs text-gray-400">
                            Last activity: {contact.activities[0].type} - {contact.activities[0].subject}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-1 ml-4">
                        <QuickActionButton
                          type="EMAIL"
                          onClick={(type) => handlePrimaryAction(contact, type)}
                          disabled={!contact.email}
                          contactName={contact.name}
                        />
                        <QuickActionButton
                          type="MEETING_REQUEST"
                          onClick={(type) => handlePrimaryAction(contact, type)}
                          contactName={contact.name}
                        />
                        <QuickActionButton
                          type="MEETING"
                          onClick={(type) => handlePrimaryAction(contact, type)}
                          contactName={contact.name}
                        />
                        <ActionMenu
                          onAction={handleSecondaryAction}
                          contactName={contact.name}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {daysSinceContact !== null ? (
                            `${daysSinceContact} days since last contact`
                          ) : (
                            'Never contacted'
                          )}
                        </span>
                        {isRecentlyContacted(contact) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
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
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              variant="outline"
              size="sm"
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
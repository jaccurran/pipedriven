'use client'

import React, { useState, useMemo } from 'react'
import { Contact } from '@prisma/client'
import type { UserWithoutPassword } from '@/types/user'
import Link from 'next/link'
import { ContactCard } from './ContactCard'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface ContactListProps {
  contacts: Contact[]
  user: UserWithoutPassword
  onEdit?: (contact: Contact) => void
  onDelete?: (contact: Contact) => void
  onActivity?: (contactId: string, activityType: string) => void
  onBulkAction?: (contactIds: string[], action: string) => void
  searchParams?: {
    search: string
    page: number
    limit: number
    statusFilter: string
    sourceFilter: string
    tagFilter: string
    sort: string
    order: 'asc' | 'desc'
    country?: string
    sector?: string
  }
  onSearchChange?: (params: {
    search: string
    page: number
    limit: number
    statusFilter: string
    sourceFilter: string
    tagFilter: string
    sort: string
    order: 'asc' | 'desc'
    country?: string
    sector?: string
  }) => void
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
    hasPrev: boolean
  }
  className?: string
}

// Types moved to API level since filtering/sorting is now handled server-side

export function ContactList({ 
  contacts, 
  onEdit, 
  onDelete, 
  onActivity, 
  onBulkAction,
  searchParams,
  onSearchChange,
  pagination,
  className = '' 
}: ContactListProps) {
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)

  // Use search params from props or defaults
  const currentSearchParams = searchParams || {
    search: '',
    page: 1,
    limit: 20,
    statusFilter: '',
    sourceFilter: '',
    tagFilter: '',
    sort: 'createdAt',
    order: 'desc' as const
  }

  // Helper function to update search params
  const updateSearchParams = (updates: Partial<typeof currentSearchParams>) => {
    if (onSearchChange) {
      onSearchChange({ ...currentSearchParams, ...updates })
    }
  }

  // Enhanced contact data with computed fields
  const enhancedContacts = useMemo(() => {
    return contacts.map(contact => {
      // Determine status based on warmness score and last contacted date
      const getStatus = () => {
        if (contact.warmnessScore >= 75) return 'warm'
        if (contact.warmnessScore >= 50) return 'active'
        if (contact.lastContacted && 
            (Date.now() - new Date(contact.lastContacted).getTime()) < 30 * 24 * 60 * 60 * 1000) {
          return 'active'
        }
        return 'cold'
      }

      // Determine tags based on status and other factors
      const getTags = () => {
        const tags: string[] = []
        if (contact.warmnessScore >= 75) tags.push('WARM')
        if (contact.warmnessScore < 25) tags.push('COLD')
        if (contact.addedToCampaign) tags.push('CAMPAIGN')
        return tags
      }

      // Determine pipedrive status
      const getPipedriveStatus = () => {
        return !!(contact.pipedrivePersonId || contact.pipedriveOrgId)
      }

      // Determine last activity date
      const getLastActivityDate = () => {
        return contact.lastContacted || contact.updatedAt
      }

      return {
        ...contact,
        status: getStatus(),
        tags: getTags(),
        pipedriveStatus: getPipedriveStatus(),
        lastActivityDate: getLastActivityDate(),
        recurringActivityFrequency: 3, // Default value for now
        isExistingCustomer: false, // Default value for now
        isExistingCustomerOrg: false, // Default value for now
      }
    })
  }, [contacts])

  // Filter contacts (now handled by the API, but we can do additional client-side filtering if needed)
  const filteredContacts = useMemo(() => {
    // Since filtering is now handled by the API, we just return the contacts as-is
    // Additional client-side filtering can be added here if needed
    return enhancedContacts
  }, [enhancedContacts])

  // Sort contacts (now handled by the API, but we can do additional client-side sorting if needed)
  const sortedContacts = useMemo(() => {
    // Since sorting is now handled by the API, we just return the contacts as-is
    // Additional client-side sorting can be added here if needed
    return filteredContacts
  }, [filteredContacts])

  // Handle bulk selection
  const handleSelectContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts)
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId)
    } else {
      newSelected.add(contactId)
    }
    setSelectedContacts(newSelected)
    
    if (newSelected.size > 0 && !bulkMode) {
      setBulkMode(true)
    } else if (newSelected.size === 0 && bulkMode) {
      setBulkMode(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedContacts.size === sortedContacts.length) {
      setSelectedContacts(new Set())
      setBulkMode(false)
    } else {
      setSelectedContacts(new Set(sortedContacts.map(c => c.id)))
      setBulkMode(true)
    }
  }

  const handleBulkAction = (action: string) => {
    if (onBulkAction && selectedContacts.size > 0) {
      onBulkAction(Array.from(selectedContacts), action)
      setSelectedContacts(new Set())
      setBulkMode(false)
    }
  }

  const toggleSortOrder = () => {
    updateSearchParams({ order: currentSearchParams.order === 'asc' ? 'desc' : 'asc' })
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts found</h3>
        <p className="mt-1 text-sm text-gray-500">Add your first contact to get started.</p>
        <div className="mt-6">
          <Link
            href="/contacts/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Contact
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Bulk Actions */}
      {bulkMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedContacts.size} contact{selectedContacts.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('add-to-campaign')}
                >
                  Add to Campaign
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('export')}
                >
                  Export Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('delete')}
                >
                  Delete Selected
                </Button>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedContacts(new Set())
                setBulkMode(false)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="space-y-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="sr-only">Search contacts</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                id="search"
                value={currentSearchParams.search}
                onChange={(e) => updateSearchParams({ search: e.target.value, page: 1 })}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search contacts..."
                aria-label="Search contacts"
              />
            </div>
          </div>
          
          {/* Filters */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Filters</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <select
              value={currentSearchParams.statusFilter}
              onChange={(e) => updateSearchParams({ statusFilter: e.target.value, page: 1 })}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              aria-label="Filter by status"
            >
              <option value="">All Status</option>
              <option value="warm">Warm</option>
              <option value="active">Active</option>
              <option value="cold">Cold</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <select
              value={currentSearchParams.sourceFilter}
              onChange={(e) => updateSearchParams({ sourceFilter: e.target.value, page: 1 })}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              aria-label="Filter by source"
            >
              <option value="">All Sources</option>
              <option value="pipedrive">Pipedrive</option>
              <option value="local">Local</option>
            </select>

            <select
              value={currentSearchParams.tagFilter}
              onChange={(e) => updateSearchParams({ tagFilter: e.target.value, page: 1 })}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              aria-label="Filter by tags"
            >
              <option value="">All Tags</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
              <option value="lost">Lost</option>
            </select>

            <select
              value={currentSearchParams.country || ''}
              onChange={(e) => updateSearchParams({ country: e.target.value || undefined, page: 1 })}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              aria-label="Filter by country"
            >
              <option value="">All Countries</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="Germany">Germany</option>
              <option value="France">France</option>
              <option value="Netherlands">Netherlands</option>
              <option value="Sweden">Sweden</option>
              <option value="Norway">Norway</option>
              <option value="Denmark">Denmark</option>
            </select>

            <select
              value={currentSearchParams.sector || ''}
              onChange={(e) => updateSearchParams({ sector: e.target.value || undefined, page: 1 })}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              aria-label="Filter by sector"
            >
              <option value="">All Sectors</option>
              <option value="Technology">Technology</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Finance">Finance</option>
              <option value="Education">Education</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Retail">Retail</option>
              <option value="Consulting">Consulting</option>
              <option value="Marketing">Marketing</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Transportation">Transportation</option>
            </select>

            {/* Sort */}
            <div className="flex items-center space-x-1">
              <select
                value={currentSearchParams.sort}
                onChange={(e) => updateSearchParams({ sort: e.target.value, page: 1 })}
                className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                aria-label="Sort contacts"
              >
                <option value="name">Name</option>
                <option value="lastActivity">Last Activity</option>
                <option value="warmnessScore">Warmness Score</option>
                <option value="createdAt">Created Date</option>
              </select>
              <button
                onClick={toggleSortOrder}
                className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label={`Sort ${currentSearchParams.order === 'asc' ? 'descending' : 'ascending'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 12">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            {/* Bulk Select */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleSelectAll}
              aria-label="Select all contacts"
            >
              {selectedContacts.size === sortedContacts.length ? 'Deselect All' : 'Select All'}
            </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {filteredContacts.length} of {pagination?.total || contacts.length} contacts
          {pagination && (
            <span className="ml-2">
              (Page {pagination.page} of {pagination.totalPages})
            </span>
          )}
        </span>
        {selectedContacts.size > 0 && (
          <span className="text-blue-600 font-medium">
            {selectedContacts.size} selected
          </span>
        )}
      </div>

      {/* Contacts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedContacts.map((contact) => (
          <div key={contact.id} className="relative">
            {/* Bulk Selection Checkbox */}
            {bulkMode && (
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedContacts.has(contact.id)}
                  onChange={() => handleSelectContact(contact.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  aria-label={`Select contact ${contact.name}`}
                />
              </div>
            )}
            
            <ContactCard
              contact={contact}
              onEdit={onEdit}
              onDelete={onDelete}
              onActivity={onActivity}
              className={cn(
                bulkMode && selectedContacts.has(contact.id) && 'ring-2 ring-blue-500'
              )}
            />
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSearchParams({ page: pagination.page - 1 })}
              disabled={!pagination.hasPrev}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSearchParams({ page: pagination.page + 1 })}
              disabled={!pagination.hasMore}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* No Results */}
      {filteredContacts.length === 0 && contacts.length > 0 && (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No contacts match your search criteria.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              updateSearchParams({
                search: '',
                statusFilter: '',
                sourceFilter: '',
                tagFilter: '',
                sort: 'createdAt',
                order: 'desc',
                page: 1,
                country: undefined,
                sector: undefined
              })
            }}
            className="mt-2"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  )
} 
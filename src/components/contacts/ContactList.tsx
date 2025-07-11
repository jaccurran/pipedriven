'use client'

import React, { useState, useMemo } from 'react'
import { Contact } from '@prisma/client'
import type { UserWithoutPassword } from '@/types/user'
import Link from 'next/link'
import { ContactCard } from './ContactCard'
import { Button, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

interface ContactListProps {
  contacts: Contact[]
  user: UserWithoutPassword
  onEdit?: (contact: Contact) => void
  onDelete?: (contact: Contact) => void
  onActivity?: (contactId: string, activityType: string) => void
  onBulkAction?: (contactIds: string[], action: string) => void
  className?: string
}

type SortOption = 'name' | 'lastActivity' | 'warmnessScore' | 'createdAt'
type FilterStatus = 'all' | 'warm' | 'cold' | 'active' | 'inactive'
type FilterSource = 'all' | 'pipedrive' | 'local'
type FilterTags = 'all' | 'warm' | 'cold' | 'lost'

export function ContactList({ 
  contacts, 
  user, 
  onEdit, 
  onDelete, 
  onActivity, 
  onBulkAction,
  className = '' 
}: ContactListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [sourceFilter, setSourceFilter] = useState<FilterSource>('all')
  const [tagFilter, setTagFilter] = useState<FilterTags>('all')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)

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

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return enhancedContacts.filter(contact => {
      const matchesSearch = 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.organisation && contact.organisation.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus = statusFilter === 'all' || contact.status === statusFilter
      
      const matchesSource = sourceFilter === 'all' || 
        (sourceFilter === 'pipedrive' && contact.pipedriveStatus) ||
        (sourceFilter === 'local' && !contact.pipedriveStatus)
      
      const matchesTags = tagFilter === 'all' || 
        (tagFilter === 'warm' && contact.tags.includes('WARM')) ||
        (tagFilter === 'cold' && contact.tags.includes('COLD')) ||
        (tagFilter === 'lost' && contact.tags.includes('LOST'))

      return matchesSearch && matchesStatus && matchesSource && matchesTags
    })
  }, [enhancedContacts, searchTerm, statusFilter, sourceFilter, tagFilter])

  // Sort contacts
  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'lastActivity':
          const aDate = a.lastActivityDate ? new Date(a.lastActivityDate).getTime() : 0
          const bDate = b.lastActivityDate ? new Date(b.lastActivityDate).getTime() : 0
          comparison = aDate - bDate
          break
        case 'warmnessScore':
          comparison = a.warmnessScore - b.warmnessScore
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [filteredContacts, sortBy, sortOrder])

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
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
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
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search contacts..."
                aria-label="Search contacts"
              />
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              aria-label="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="warm">Warm</option>
              <option value="active">Active</option>
              <option value="cold">Cold</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as FilterSource)}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              aria-label="Filter by source"
            >
              <option value="all">All Sources</option>
              <option value="pipedrive">Pipedrive</option>
              <option value="local">Local</option>
            </select>

            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value as FilterTags)}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              aria-label="Filter by tags"
            >
              <option value="all">All Tags</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
              <option value="lost">Lost</option>
            </select>

            {/* Sort */}
            <div className="flex items-center space-x-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
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
                aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {filteredContacts.length} of {contacts.length} contacts
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
              setSearchTerm('')
              setStatusFilter('all')
              setSourceFilter('all')
              setTagFilter('all')
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
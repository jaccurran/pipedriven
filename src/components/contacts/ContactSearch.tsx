'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Contact, User } from '@prisma/client'
import { Modal, Button, Input, Badge, Card } from '@/components/ui'
import { cn } from '@/lib/utils'
import { ContactForm } from './ContactForm'

interface ContactSearchProps {
  isOpen: boolean
  onClose: () => void
  onImport: (contact: Contact | PipedriveContact) => void
  onCreate: (contactData: CreateContactData) => void
  user: User
  existingContacts: Contact[]
  className?: string
}

interface PipedriveContact {
  id: string
  name: string
  email?: string
  phone?: string
  organisation?: string
  pipedrivePersonId: string
  pipedriveOrgId?: string
}

interface CreateContactData {
  name: string
  email: string
  phone?: string
  organisation?: string
}

type TabType = 'local' | 'pipedrive' | 'create'

export function ContactSearch({
  isOpen,
  onClose,
  onImport,
  onCreate,
  user,
  existingContacts,
  className = '',
}: ContactSearchProps) {
  const [activeTab, setActiveTab] = useState<TabType>('local')
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [pipedriveContacts, setPipedriveContacts] = useState<PipedriveContact[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)

  // Filter local contacts based on search term
  const filteredLocalContacts = useMemo(() => {
    if (!searchTerm.trim()) return existingContacts

    const term = searchTerm.toLowerCase()
    return existingContacts.filter(contact => {
      return (
        contact.name.toLowerCase().includes(term) ||
        (contact.email && contact.email.toLowerCase().includes(term)) ||
        (contact.organisation && contact.organisation.toLowerCase().includes(term))
      )
    })
  }, [existingContacts, searchTerm])

  // Search Pipedrive contacts
  const searchPipedriveContacts = useCallback(async (query: string) => {
    if (!user.pipedriveApiKey || !query.trim()) {
      setPipedriveContacts([])
      return
    }

    setIsSearching(true)
    setSearchError(null)

    try {
      const response = await fetch('/api/pipedrive/contacts/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        throw new Error('Failed to search Pipedrive')
      }

      const data = await response.json()
      setPipedriveContacts(data.data || [])
    } catch (error) {
      console.error('Error searching Pipedrive:', error)
      setSearchError('Error searching Pipedrive')
      setPipedriveContacts([])
    } finally {
      setIsSearching(false)
    }
  }, [user.pipedriveApiKey])

  // Debounced Pipedrive search
  useEffect(() => {
    if (activeTab === 'pipedrive' && searchTerm.trim()) {
      const timeoutId = setTimeout(() => {
        searchPipedriveContacts(searchTerm)
      }, 500)

      return () => clearTimeout(timeoutId)
    } else if (activeTab === 'pipedrive' && !searchTerm.trim()) {
      setPipedriveContacts([])
      setSearchError(null)
    }
  }, [searchTerm, activeTab, searchPipedriveContacts])

  // Check if contact is already imported
  const isContactImported = useCallback((contact: Contact | PipedriveContact) => {
    if ('pipedrivePersonId' in contact) {
      // Pipedrive contact
      return existingContacts.some(existing => 
        existing.pipedrivePersonId === contact.pipedrivePersonId
      )
    } else {
      // Local contact - check by email
      return existingContacts.some(existing => 
        existing.email === contact.email
      )
    }
  }, [existingContacts])

  // Handle contact import
  const handleImport = useCallback((contact: Contact | PipedriveContact) => {
    onImport(contact)
  }, [onImport])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setActiveTab('local')
      setIsSearching(false)
      setPipedriveContacts([])
      setSearchError(null)
    }
  }, [isOpen])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Search Contacts"
      size="lg"
      className={className}
    >
      <div className="space-y-6">
        {/* Search Input */}
        <div>
          <label htmlFor="search" className="sr-only">Search contacts</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <Input
              id="search"
              type="text"
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by name, email, or company..."
              className="pl-10"
              aria-label="Search contacts"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('local')}
              className={cn(
                'py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === 'local'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              Local Contacts
            </button>
            <button
              onClick={() => setActiveTab('pipedrive')}
              className={cn(
                'py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === 'pipedrive'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              Pipedrive Contacts
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={cn(
                'py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === 'create'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              Create New Contact
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* Local Contacts Tab */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              {filteredLocalContacts.length === 0 ? (
                <div className="text-center py-8">
                  {searchTerm ? (
                    <>
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">No contacts found matching your search</p>
                    </>
                  ) : (
                    <>
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">No local contacts found</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLocalContacts.map((contact) => (
                    <Card key={contact.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {contact.name}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">
                            {contact.email}
                          </p>
                          {contact.organisation && (
                            <p className="text-sm text-gray-500 truncate">
                              {contact.organisation}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {contact.pipedrivePersonId && (
                            <Badge variant="outline" size="sm" className="text-xs">
                              Already imported
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleImport(contact)}
                            aria-label="Import contact"
                          >
                            Import
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pipedrive Contacts Tab */}
          {activeTab === 'pipedrive' && (
            <div className="space-y-4">
              {!user.pipedriveApiKey ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Pipedrive API key required</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Please configure your Pipedrive API key in settings
                  </p>
                </div>
              ) : isSearching ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Searching...</p>
                </div>
              ) : searchError ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-2 text-sm text-red-600">{searchError}</p>
                </div>
              ) : pipedriveContacts.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">
                    {searchTerm ? 'No Pipedrive contacts found' : 'Search for Pipedrive contacts'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pipedriveContacts.map((contact) => (
                    <Card key={contact.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {contact.name}
                          </h3>
                          {contact.email && (
                            <p className="text-sm text-gray-600 truncate">
                              {contact.email}
                            </p>
                          )}
                          {contact.organisation && (
                            <p className="text-sm text-gray-500 truncate">
                              {contact.organisation}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {isContactImported(contact) && (
                            <Badge variant="outline" size="sm" className="text-xs">
                              Already imported
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleImport(contact)}
                            disabled={isContactImported(contact)}
                            aria-label="Import contact"
                          >
                            Import
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create Contact Tab */}
          {activeTab === 'create' && (
            <div className="space-y-6">
              <ContactForm
                onSubmit={(values) => {
                  onCreate(values)
                  setActiveTab('local')
                }}
                onCancel={() => setActiveTab('local')}
                submitLabel="Create Contact"
                cancelLabel="Cancel"
                mode="create"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
} 
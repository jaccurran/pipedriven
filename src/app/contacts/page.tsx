'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ContactList } from '@/components/contacts/ContactList'
import { useContacts, useDeleteContact } from '@/hooks/useContacts'
import Link from 'next/link'
import { useState } from 'react'
import type { Contact } from '@prisma/client'
import { SyncProgressBar } from '@/components/contacts/SyncProgressBar'
import { Toast } from '@/components/ui/Toast'
import { useQuery } from '@tanstack/react-query'
import { UserRole } from '@prisma/client'

export default function ContactsPage() {
  const { data: session, status } = useSession()
  const [searchParams, setSearchParams] = useState({
    search: '',
    page: 1,
    limit: 20,
    statusFilter: '',
    sourceFilter: '',
    tagFilter: '',
    sort: 'createdAt' as const,
    order: 'desc' as const,
    country: undefined as string | undefined,
    sector: undefined as string | undefined
  })
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'info'; title?: string; message: string }>>([])

  // Helper to show toast
  const showToast = (toast: { type: 'success' | 'error' | 'info'; title?: string; message: string }) => {
    setToasts((prev) => [
      ...prev,
      { ...toast, id: Math.random().toString(36).substr(2, 9) }
    ])
  }
  const handleToastClose = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Fetch contacts using our hook
  const { data, isLoading, isError, refetch } = useContacts(searchParams)
  
  // Mutations for real-time updates
  const deleteContactMutation = useDeleteContact()

  // Fetch latest syncId for the user
  const { data: latestSync } = useQuery({
    queryKey: ['latestSync'],
    queryFn: async () => {
      const res = await fetch('/api/pipedrive/contacts/sync/latest')
      if (!res.ok) throw new Error('Failed to fetch latest sync')
      return res.json()
    },
    refetchInterval: 5000, // Poll for updates every 5s
  })

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Handle contact edit
  const handleEditContact = async () => {
    // This will be handled by the ContactCard component
    // The mutation will automatically refresh the contacts list
  }

  // Handle contact delete
  const handleDeleteContact = async (contact: Contact) => {
    try {
      await deleteContactMutation.mutateAsync(contact.id)
      // Success handled in mutation
    } catch {
      // Error handled in mutation
    }
  }

  // Handle bulk actions
  const handleBulkAction = async (contactIds: string[], action: string) => {
    switch (action) {
      case 'delete':
        for (const contactId of contactIds) {
          try {
            await deleteContactMutation.mutateAsync(contactId)
          } catch {}
        }
        showToast({ type: 'success', title: 'Bulk delete', message: 'Selected contacts deleted.' })
        break
      case 'add-to-campaign':
        // TODO: Implement add to campaign functionality
        console.log('Add to campaign:', contactIds)
        break
      case 'export':
        // TODO: Implement export functionality
        console.log('Export contacts:', contactIds)
        break
      default:
        console.warn('Unknown bulk action:', action)
    }
  }

  // Handle search and filter changes
  const handleSearchChange = (params: {
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
  }) => {
    setSearchParams(params as typeof searchParams)
  }

  // Extract user data for the layout
  const user = {
    id: session.user.id,
    name: session.user.name || '',
    email: session.user.email || '',
    role: session.user.role as UserRole || 'USER',
    pipedriveApiKey: session.user.pipedriveApiKey || null,
    pipedriveUserId: null, // This will be null for session user
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerified: null,
    image: session.user.image || null,
    lastSyncTimestamp: null,
    syncStatus: 'IDLE',
    syncId: '',
    quickActionMode: 'SIMPLE' as const,
    emailNotifications: true,
    activityReminders: true,
    campaignUpdates: true,
    syncStatusAlerts: true,
  }

  // Extract contacts from the API response
  const contacts = data?.data?.contacts || []

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Sync Progress Bar */}
        {latestSync?.syncId && (
          <SyncProgressBar
            syncId={latestSync.syncId}
            refreshOnComplete={false}
            onComplete={() => {
              showToast({ type: 'success', title: 'Sync complete', message: 'Contacts have been synced.' })
              refetch()
            }}
            onError={() => {
              showToast({ type: 'error', title: 'Sync failed', message: 'There was an error during sync.' })
            }}
          />
        )}
        {/* Toast notifications */}
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={handleToastClose} />
        ))}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <p className="text-gray-600">Manage your leads and contacts</p>
          </div>
          <Link
            href="/contacts/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Contact
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading contacts...</span>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading contacts</h3>
                <div className="mt-2 text-sm text-red-700">
                  An unexpected error occurred
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contacts List */}
        {!isLoading && !isError && (
          <ContactList 
            contacts={contacts} 
            user={user}
            onEdit={handleEditContact}
            onDelete={handleDeleteContact}
            onBulkAction={handleBulkAction}
            searchParams={searchParams}
            onSearchChange={handleSearchChange}
            pagination={data?.data?.pagination}
          />
        )}
      </div>
    </DashboardLayout>
  )
} 
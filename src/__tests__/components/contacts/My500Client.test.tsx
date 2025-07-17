// Mock global fetch to prevent real network calls
(global as any).fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { My500Client } from '@/components/contacts/My500Client'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the sync mutation hook using correct relative path
vi.mock('../../../hooks/useMy500Contacts', () => ({
  useSyncContacts: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true, data: { syncId: 'test-sync-id' } }),
    isPending: false,
    error: null,
  })),
  useSyncStatus: vi.fn(() => ({
    data: { lastSync: null, totalContacts: 0, syncedContacts: 0, pendingSync: false, syncInProgress: false },
    isLoading: false,
    error: null,
  })),
}))

// Mock the SyncProgressBar component
vi.mock('@/components/contacts/SyncProgressBar', () => ({
  SyncProgressBar: ({ syncId, onComplete }: { syncId: string; onComplete: () => void }) => (
    <div data-testid="sync-progress-container">
      <div data-testid="sync-progress-bar">Sync Progress for {syncId}</div>
      <button onClick={onComplete} data-testid="sync-complete-btn">Complete</button>
    </div>
  )
}))

afterEach(() => {
  vi.resetAllMocks()
  cleanup()
})

describe('My500Client Sync Progress UI', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  it('shows SyncProgressBar when sync is in progress', async () => {
    // Mock the sync mutation to return a syncId
    const mockMutateAsync = vi.fn().mockResolvedValue({ success: true, data: { syncId: 'test-sync-id' } })
    vi.mocked(require('../../../hooks/useMy500Contacts').useSyncContacts).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <My500Client
          initialContacts={[]}
          initialPagination={{ page: 1, limit: 20, total: 0, totalPages: 1, hasMore: false, hasPrev: false }}
          initialSyncStatus={{ lastSync: null, totalContacts: 0, syncedContacts: 0, pendingSync: false, syncInProgress: false }}
          user={{ id: 'user-1', name: 'Test User', email: 'test@example.com' }}
        />
      </QueryClientProvider>
    )

    // Find and click the sync button
    const syncButton = screen.getByRole('button', { name: /sync/i })
    fireEvent.click(syncButton)

    // Wait for the sync to complete and progress bar to appear
    await waitFor(() => {
      expect(screen.getByTestId('sync-progress-container')).toBeInTheDocument()
    })

    // Verify the progress bar shows the correct sync ID
    expect(screen.getByTestId('sync-progress-bar')).toHaveTextContent('test-sync-id')
  })

  it('hides SyncProgressBar when sync completes', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({ success: true, data: { syncId: 'test-sync-id' } })
    vi.mocked(require('../../../hooks/useMy500Contacts').useSyncContacts).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <My500Client
          initialContacts={[]}
          initialPagination={{ page: 1, limit: 20, total: 0, totalPages: 1, hasMore: false, hasPrev: false }}
          initialSyncStatus={{ lastSync: null, totalContacts: 0, syncedContacts: 0, pendingSync: false, syncInProgress: false }}
          user={{ id: 'user-1', name: 'Test User', email: 'test@example.com' }}
        />
      </QueryClientProvider>
    )

    // Trigger sync
    const syncButton = screen.getByRole('button', { name: /sync/i })
    fireEvent.click(syncButton)

    // Wait for progress bar to appear
    await waitFor(() => {
      expect(screen.getByTestId('sync-progress-container')).toBeInTheDocument()
    })

    // Click the complete button to simulate sync completion
    const completeButton = screen.getByTestId('sync-complete-btn')
    fireEvent.click(completeButton)

    // Verify progress bar is hidden
    await waitFor(() => {
      expect(screen.queryByTestId('sync-progress-container')).not.toBeInTheDocument()
    })
  })
}) 
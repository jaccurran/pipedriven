import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { My500Client } from '@/components/contacts/My500Client'

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com'
      }
    },
    status: 'authenticated'
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, data: {} }),
    text: () => Promise.resolve(''),
  })
) as any

// Mock the React Query hooks
vi.mock('@/hooks/useMy500Contacts', () => ({
  useMy500Contacts: vi.fn(() => ({
    data: {
      contacts: [
        {
          id: 'contact-1',
          name: 'Alice',
          email: 'alice@example.com',
          activities: [],
          organisation: 'Test Org',
          warmnessScore: 5,
          lastContacted: null,
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
        hasPrev: false,
      },
      syncStatus: {
        lastSync: null,
        totalContacts: 1,
        syncedContacts: 1,
        pendingSync: false,
        syncInProgress: false,
      },
    },
    isLoading: false,
    error: null,
  })),
  useSyncContacts: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useSyncStatus: vi.fn(() => ({
    data: {
      lastSync: null,
      totalContacts: 1,
      syncedContacts: 1,
      pendingSync: false,
      syncInProgress: false,
    },
    isLoading: false,
  })),
}))

// Use realistic, complete test data (see TESTING_PATTERNS.md, testDataFactories)
const mockContacts = [
  {
    id: 'contact-1',
    name: 'Alice',
    email: 'alice@example.com',
    activities: [],
    organisation: 'Test Org',
    warmnessScore: 5,
    lastContacted: null,
  },
]
const mockUser = { id: 'user-1', name: 'Test User', email: 'test@example.com' }

afterEach(cleanup)

describe('My500Client QuickActionToggle integration', () => {
  function renderWithProviders(ui: React.ReactElement) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    return render(
      <QueryClientProvider client={queryClient}>
        <SessionProvider session={null}>{ui}</SessionProvider>
      </QueryClientProvider>
    )
  }

  it('shows the toggle and switches quick action behavior', async () => {
    // Render the component with providers
    renderWithProviders(
      <My500Client
        initialContacts={mockContacts}
        initialPagination={{
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasMore: false,
          hasPrev: false,
        }}
        initialSyncStatus={{
          lastSync: null,
          totalContacts: 1,
          syncedContacts: 1,
          pendingSync: false,
          syncInProgress: false,
        }}
        user={mockUser}
      />
    )

    // Assert the toggle is present (TESTING_PATTERNS.md: Query Specificity)
    expect(screen.getByText('Quick Actions:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /simple/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /detailed/i })).toBeInTheDocument()

    // Find the quick action button (TESTING_PATTERNS.md: Query Priority)
    // Use getByRole with name, scoped if needed
    // The aria-label for EMAIL button is "Log email sent to {contactName}"
    const logEmailButton = screen.getByRole('button', { name: 'Log email sent to Alice' })
    expect(logEmailButton).toBeInTheDocument()

    // Click the button in SIMPLE mode (should log directly, not open modal)
    fireEvent.click(logEmailButton)
    // Assert for direct log behavior (e.g., success message, no modal)
    await waitFor(() => {
      expect(screen.queryByText(/Activity "EMAIL" logged successfully for Alice/i)).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // Switch to DETAILED mode
    const detailedToggle = screen.getByRole('button', { name: /detailed/i })
    fireEvent.click(detailedToggle)

    // Click the button in DETAILED mode (should open modal)
    fireEvent.click(logEmailButton)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
}) 
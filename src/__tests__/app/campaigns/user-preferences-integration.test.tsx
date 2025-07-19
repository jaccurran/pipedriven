import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { CampaignContactList } from '@/components/campaigns/CampaignContactList'

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

// Mock fetch globally to prevent real network calls
global.fetch = vi.fn()

// Mock the preferences API
const mockPreferencesResponse = {
  success: true,
  preferences: {
    quickActionMode: 'DETAILED' as const,
    emailNotifications: true,
    activityReminders: true,
    campaignUpdates: true,
    syncStatusAlerts: true
  }
}

// Mock the activities API
const mockActivityResponse = {
  success: true,
  activity: {
    id: 'activity-1',
    type: 'EMAIL',
    subject: 'Email with contact',
    note: 'Activity logged: EMAIL'
  }
}

const mockContacts = [
  {
    id: 'contact-1',
    name: 'Alice',
    email: 'alice@example.com',
    organisation: 'Test Corp',
    warmnessScore: 7,
    lastContacted: new Date('2024-01-01'),
    isActive: true,
    activities: [],
    campaigns: [],
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    pipedrivePersonId: null,
    pipedriveOrgId: null,
    lastPipedriveUpdate: null,
    deactivatedAt: null,
    deactivatedBy: null,
    deactivationReason: null
  }
]

const mockCampaign = {
  id: 'campaign-1',
  name: 'Test Campaign',
  description: 'A test campaign',
  targetLeads: 100,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  status: 'ACTIVE' as const,
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'CONSULTANT' as const,
  quickActionMode: 'DETAILED' as const,
  emailNotifications: true,
  activityReminders: true,
  campaignUpdates: true,
  syncStatusAlerts: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  password: null,
  pipedriveApiKey: null,
  lastSyncTimestamp: null,
  syncStatus: 'SYNCED',
  emailVerified: null,
  image: null
}

describe('CampaignContactList User Preferences Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { 
        queries: { retry: false }, 
        mutations: { retry: false } 
      },
    })
    
    // Reset all mocks
    vi.resetAllMocks()
    
    // Set up fetch mock
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/preferences')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPreferencesResponse)
        })
      }
      if (url.includes('/api/activities')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockActivityResponse)
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      })
    })
  })

  afterEach(() => {
    cleanup()
  })

  function renderWithProviders(ui: React.ReactElement) {
    return render(
      <QueryClientProvider client={queryClient}>
        <SessionProvider session={null}>{ui}</SessionProvider>
      </QueryClientProvider>
    )
  }

  it('should default to user preference for quick action mode', async () => {
    // Render with user that has DETAILED preference
    renderWithProviders(
      <CampaignContactList
        contacts={mockContacts}
        campaign={mockCampaign}
        user={mockUser}
        isLoading={false}
        onContactsUpdate={() => {}}
      />
    )

    // Wait for the component to load and check that DETAILED mode is selected
    await waitFor(() => {
      expect(screen.getByText('Modal with notes')).toBeInTheDocument()
    })

    // Verify the toggle shows DETAILED mode is active
    const detailedButton = screen.getByRole('button', { name: /detailed/i })
    expect(detailedButton).toHaveClass('bg-white', 'text-gray-900', 'shadow-sm')
  })

  it('should default to SIMPLE mode when user preference is SIMPLE', async () => {
    const simpleUser = {
      ...mockUser,
      quickActionMode: 'SIMPLE' as const
    }

    renderWithProviders(
      <CampaignContactList
        contacts={mockContacts}
        campaign={mockCampaign}
        user={simpleUser}
        isLoading={false}
        onContactsUpdate={() => {}}
      />
    )

    // Wait for the component to load and check that SIMPLE mode is selected
    await waitFor(() => {
      expect(screen.getByText('One-click logging')).toBeInTheDocument()
    })

    // Verify the toggle shows SIMPLE mode is active
    const simpleButton = screen.getByRole('button', { name: /simple/i })
    expect(simpleButton).toHaveClass('bg-white', 'text-gray-900', 'shadow-sm')
  })

  it('should use DETAILED mode behavior when user preference is DETAILED', async () => {
    renderWithProviders(
      <CampaignContactList
        contacts={mockContacts}
        campaign={mockCampaign}
        user={mockUser}
        isLoading={false}
        onContactsUpdate={() => {}}
      />
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Modal with notes')).toBeInTheDocument()
    })

    // Find and click the email action button
    const logEmailButton = screen.getByRole('button', { name: /log email sent/i })
    fireEvent.click(logEmailButton)

    // In DETAILED mode, this should set the modal flag for testing
    await waitFor(() => {
      expect((window as any).__modalShown).toBe(true)
    })
  })

  it('should use SIMPLE mode behavior when user preference is SIMPLE', async () => {
    const simpleUser = {
      ...mockUser,
      quickActionMode: 'SIMPLE' as const
    }

    renderWithProviders(
      <CampaignContactList
        contacts={mockContacts}
        campaign={mockCampaign}
        user={simpleUser}
        isLoading={false}
        onContactsUpdate={() => {}}
      />
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('One-click logging')).toBeInTheDocument()
    })

    // Find and click the email action button
    const logEmailButton = screen.getByRole('button', { name: /log email sent/i })
    fireEvent.click(logEmailButton)

    // In SIMPLE mode, this should log directly and show success message
    await waitFor(() => {
      expect(screen.getByText(/Activity "EMAIL" logged successfully for contact/i)).toBeInTheDocument()
    })

    // Should not show modal
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
}) 
import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'
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

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, data: {} }),
    text: () => Promise.resolve(''),
  })
) as any

// Use realistic, complete test data (see TESTING_PATTERNS.md, testDataFactories)
const mockCampaign = {
  id: 'campaign-1',
  name: 'Test Campaign',
  status: 'ACTIVE',
  targetLeads: 10,
  budget: 1000,
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
}
const mockUser = { id: 'user-1', name: 'Test User', email: 'test@example.com' }
const mockContacts = [
  { id: 'contact-1', name: 'Alice', email: 'alice@example.com', activities: [], organisation: 'Test Org', warmnessScore: 5, lastContacted: null },
]

afterEach(cleanup)

describe('CampaignContactList QuickActionToggle integration', () => {
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
    renderWithProviders(
      <CampaignContactList
        contacts={mockContacts}
        campaign={mockCampaign}
        user={mockUser}
        isLoading={false}
        onContactsUpdate={() => {}}
      />
    )

    // Assert the toggle is present (TESTING_PATTERNS.md: Query Specificity)
    expect(screen.getByText('Quick Actions:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /simple/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /detailed/i })).toBeInTheDocument()

    // Find the quick action button (TESTING_PATTERNS.md: Query Priority)
    const logEmailButton = screen.getByRole('button', { name: /log email sent/i })
    expect(logEmailButton).toBeInTheDocument()

    // Click the button in SIMPLE mode (should log directly, not open modal)
    fireEvent.click(logEmailButton)
    await waitFor(() => {
      expect(screen.queryByText(/Activity "EMAIL" logged successfully for contact/i)).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // Switch to DETAILED mode
    const detailedToggle = screen.getByRole('button', { name: /detailed/i })
    fireEvent.click(detailedToggle)

    // Click the button in DETAILED mode (should set flag for testing)
    fireEvent.click(logEmailButton)
    await waitFor(() => {
      expect((window as any).__modalShown).toBe(true)
    })
  })
}) 
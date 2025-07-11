import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardStats } from '@/components/dashboard/DashboardStats'

// Mock fetch
global.fetch = vi.fn()

// Mock the API response
const mockStatsData = {
  totalCampaigns: 12,
  totalContacts: 245,
  totalActivities: 89,
  activeCampaigns: 8,
}

describe('DashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders all four stat cards with correct data', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatsData,
      })

      render(<DashboardStats />)

      // Wait for the component to load data and render cards
      await waitFor(() => {
        const cards = screen.getAllByTestId('stat-card')
        expect(cards).toHaveLength(4)
      })

      // Verify each stat is displayed
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('245')).toBeInTheDocument()
      expect(screen.getByText('89')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()

      // Verify API was called
      expect(fetch).toHaveBeenCalledWith('/api/dashboard/stats')
    })

    it('displays correct stat labels', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatsData,
      })

      render(<DashboardStats />)

      await waitFor(() => {
        expect(screen.getByText('Total Campaigns')).toBeInTheDocument()
        expect(screen.getByText('Total Contacts')).toBeInTheDocument()
        expect(screen.getByText('Total Activities')).toBeInTheDocument()
        expect(screen.getByText('Active Campaigns')).toBeInTheDocument()
      })
    })

    it('shows loading state initially', () => {
      ;(fetch as any).mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<DashboardStats />)

      // Check for loading indicators
      const cards = screen.getAllByTestId('stat-card')
      expect(cards).toHaveLength(4)
    })
  })

  describe('API Integration', () => {
    it('fetches data from correct endpoint', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatsData,
      })

      render(<DashboardStats />)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/dashboard/stats')
      })
    })

    it('handles API errors gracefully', async () => {
      ;(fetch as any).mockRejectedValueOnce(new Error('API Error'))

      render(<DashboardStats />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
      })
    })

    it('shows retry button on error', async () => {
      ;(fetch as any).mockRejectedValueOnce(new Error('API Error'))

      render(<DashboardStats />)

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i })
        expect(retryButton).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    it('refreshes data when refresh button is clicked', async () => {
      const user = userEvent.setup()
      
      ;(fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStatsData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockStatsData, totalCampaigns: 15 }),
        })

      render(<DashboardStats />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument()
      })

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      await user.click(refreshButton)

      // Wait for updated data
      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument()
      })

      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Accessibility', () => {
    it('has proper test IDs', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatsData,
      })

      render(<DashboardStats />)

      await waitFor(() => {
        expect(screen.getByTestId('stats-grid')).toBeInTheDocument()
        expect(screen.getAllByTestId('stat-card')).toHaveLength(4)
        expect(screen.getAllByTestId('icon-container')).toHaveLength(4)
        expect(screen.getAllByTestId('stat-icon')).toHaveLength(4)
      })
    })
  })
}) 
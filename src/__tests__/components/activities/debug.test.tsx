import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ActivityFeed } from '@/components/activities/ActivityFeed'

describe('Debug ActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call fetch when component mounts', async () => {
    // Set up a simple mock that just logs
    (global.fetch as any).mockImplementation((url: string) => {
      console.log('FETCH CALLED WITH URL:', url)
      return Promise.resolve({
        ok: true,
        json: async () => {
          console.log('RETURNING MOCK DATA')
          return { activities: [], hasMore: false }
        }
      })
    })

    render(<ActivityFeed userId="user-1" />)
    
    // Wait a bit to see if fetch is called
    await new Promise(resolve => setTimeout(resolve, 100))
    
    console.log('FETCH CALLED TIMES:', (global.fetch as any).mock.calls.length)
    console.log('FETCH CALLS:', (global.fetch as any).mock.calls)
    
    expect(global.fetch).toHaveBeenCalled()
  })
}) 
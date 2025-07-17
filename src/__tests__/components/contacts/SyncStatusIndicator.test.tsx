import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SyncStatusIndicator } from '@/components/contacts/SyncStatusIndicator'

// Mock the Button component
vi.mock('@/components/ui/Button', () => ({
  default: ({ children, onClick, disabled, variant, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  )
}))

describe('SyncStatusIndicator', () => {
  const defaultProps = {
    syncStatus: {
      lastSync: '2024-01-15T10:00:00Z',
      totalContacts: 150,
      syncedContacts: 145,
      pendingSync: false,
      syncInProgress: false,
      syncStatus: 'COMPLETED' as const,
    },
    onSync: vi.fn(),
  }

  it('should render sync status with last sync date', () => {
    render(<SyncStatusIndicator {...defaultProps} />)

    expect(screen.getByText('✓')).toBeInTheDocument()
    expect(screen.getByText('Last sync: 1/15/2024')).toBeInTheDocument()
  })

  it('should render "Never synced" when no last sync', () => {
    const props = {
      ...defaultProps,
      syncStatus: {
        ...defaultProps.syncStatus,
        lastSync: null,
      }
    }
    render(<SyncStatusIndicator {...props} />)

    expect(screen.getByText('Never synced')).toBeInTheDocument()
  })

  it('should show correct status icon for COMPLETED status', () => {
    render(<SyncStatusIndicator {...defaultProps} />)

    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('should show correct status icon for IN_PROGRESS status', () => {
    const props = {
      ...defaultProps,
      syncStatus: {
        ...defaultProps.syncStatus,
        syncStatus: 'IN_PROGRESS' as const,
      }
    }
    render(<SyncStatusIndicator {...props} />)

    expect(screen.getByText('⟳')).toBeInTheDocument()
  })

  it('should show correct status icon for FAILED status', () => {
    const props = {
      ...defaultProps,
      syncStatus: {
        ...defaultProps.syncStatus,
        syncStatus: 'FAILED' as const,
      }
    }
    render(<SyncStatusIndicator {...props} />)

    expect(screen.getByText('✗')).toBeInTheDocument()
  })

  it('should show correct status icon for unknown status', () => {
    const props = {
      ...defaultProps,
      syncStatus: {
        ...defaultProps.syncStatus,
        syncStatus: 'UNKNOWN' as any,
      }
    }
    render(<SyncStatusIndicator {...props} />)

    expect(screen.getByText('○')).toBeInTheDocument()
  })

  it('should apply correct color classes for different statuses', () => {
    // COMPLETED status
    const { rerender } = render(<SyncStatusIndicator {...defaultProps} />)
    expect(screen.getByText('✓')).toHaveClass('text-green-600')

    // IN_PROGRESS status
    rerender(<SyncStatusIndicator {...defaultProps} syncStatus={{
      ...defaultProps.syncStatus,
      syncStatus: 'IN_PROGRESS'
    }} />)
    expect(screen.getByText('⟳')).toHaveClass('text-blue-600')

    // FAILED status
    rerender(<SyncStatusIndicator {...defaultProps} syncStatus={{
      ...defaultProps.syncStatus,
      syncStatus: 'FAILED'
    }} />)
    expect(screen.getByText('✗')).toHaveClass('text-red-600')
  })

  it('should render sync buttons', () => {
    render(<SyncStatusIndicator {...defaultProps} />)

    expect(screen.getByText('Sync Now')).toBeInTheDocument()
    expect(screen.getByText('Force Full Sync')).toBeInTheDocument()
  })

  it('should call onSync with false when "Sync Now" is clicked', () => {
    const onSync = vi.fn()
    render(<SyncStatusIndicator {...defaultProps} onSync={onSync} />)

    fireEvent.click(screen.getByText('Sync Now'))
    expect(onSync).toHaveBeenCalledWith(false)
  })

  it('should call onSync with true when "Force Full Sync" is clicked', () => {
    const onSync = vi.fn()
    render(<SyncStatusIndicator {...defaultProps} onSync={onSync} />)

    fireEvent.click(screen.getByText('Force Full Sync'))
    expect(onSync).toHaveBeenCalledWith(true)
  })

  it('should disable sync buttons when sync is in progress', () => {
    const props = {
      ...defaultProps,
      syncStatus: {
        ...defaultProps.syncStatus,
        syncInProgress: true,
      }
    }
    render(<SyncStatusIndicator {...props} />)

    const syncButton = screen.getByText('Sync Now')
    const forceSyncButton = screen.getByText('Force Full Sync')
    
    expect(syncButton).toBeDisabled()
    expect(forceSyncButton).toBeDisabled()
  })

  it('should show loading state when sync is in progress', () => {
    const props = {
      ...defaultProps,
      syncStatus: {
        ...defaultProps.syncStatus,
        syncInProgress: true,
      }
    }
    render(<SyncStatusIndicator {...props} />)

    expect(screen.getByText('Syncing...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveClass('animate-spin')
  })

  it('should show cancel button when sync is in progress and onCancel is provided', () => {
    const onCancel = vi.fn()
    const props = {
      ...defaultProps,
      syncStatus: {
        ...defaultProps.syncStatus,
        syncInProgress: true,
      },
      onCancel,
    }
    render(<SyncStatusIndicator {...props} />)

    const cancelButton = screen.getByText('Cancel')
    expect(cancelButton).toBeInTheDocument()
    expect(cancelButton).toHaveClass('text-red-600', 'border-red-300', 'hover:bg-red-50')
  })

  it('should call onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    const props = {
      ...defaultProps,
      syncStatus: {
        ...defaultProps.syncStatus,
        syncInProgress: true,
      },
      onCancel,
    }
    render(<SyncStatusIndicator {...props} />)

    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('should not show cancel button when sync is not in progress', () => {
    render(<SyncStatusIndicator {...defaultProps} onCancel={vi.fn()} />)

    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('should not show cancel button when onCancel is not provided', () => {
    const props = {
      ...defaultProps,
      syncStatus: {
        ...defaultProps.syncStatus,
        syncInProgress: true,
      },
    }
    render(<SyncStatusIndicator {...props} />)

    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('should apply correct CSS classes to sync buttons', () => {
    render(<SyncStatusIndicator {...defaultProps} />)

    const syncButton = screen.getByText('Sync Now')
    const forceSyncButton = screen.getByText('Force Full Sync')
    
    expect(syncButton).toHaveClass('bg-blue-600', 'hover:bg-blue-700', 'text-white')
    expect(forceSyncButton).toHaveAttribute('data-variant', 'outline')
  })

  it('should handle sync status with pending sync', () => {
    const props = {
      ...defaultProps,
      syncStatus: {
        ...defaultProps.syncStatus,
        pendingSync: true,
      }
    }
    render(<SyncStatusIndicator {...props} />)

    // Should still show normal sync buttons
    expect(screen.getByText('Sync Now')).toBeInTheDocument()
    expect(screen.getByText('Force Full Sync')).toBeInTheDocument()
  })

  it('should format date correctly for different locales', () => {
    // Test with a specific date
    const props = {
      ...defaultProps,
      syncStatus: {
        ...defaultProps.syncStatus,
        lastSync: '2024-12-25T15:30:00Z',
      }
    }
    render(<SyncStatusIndicator {...props} />)

    expect(screen.getByText('Last sync: 12/25/2024')).toBeInTheDocument()
  })

  it('should handle edge case with invalid date string', () => {
    const props = {
      ...defaultProps,
      syncStatus: {
        ...defaultProps.syncStatus,
        lastSync: 'invalid-date',
      }
    }
    render(<SyncStatusIndicator {...props} />)

    // Should handle gracefully and show the date as is or fallback
    expect(screen.getByText(/Last sync:/)).toBeInTheDocument()
  })
}) 
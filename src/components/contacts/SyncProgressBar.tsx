'use client'

import { useEffect, useState, useCallback, useRef, memo } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

// Enhanced types for sync progress data
interface SyncProgressData {
  syncId: string
  totalContacts: number
  processedContacts: number
  currentContact: string
  percentage: number
  status: 'processing' | 'completed' | 'failed' | 'cancelled'
  errors: string[]
  // Enhanced fields
  startTime?: string
  estimatedTimeRemaining?: number
  processingSpeed?: number
  syncType?: 'FULL' | 'INCREMENTAL'
  rateLimited?: boolean
  rateLimitDelay?: number
  errorCategories?: Record<string, number>
  retrySuggestion?: string
}

interface SyncProgressEvent {
  type: 'progress' | 'complete' | 'error' | 'cancelled'
  data: SyncProgressData
  error?: string
}

interface SyncProgressBarProps {
  syncId: string
  onComplete?: (data: SyncProgressData) => void
  onError?: (data: SyncProgressData & { error?: string }) => void
  onCancel?: (syncId: string) => void
  refreshOnComplete?: boolean // NEW: triggers page reload on completion
}

// Debounced progress updates to prevent excessive re-renders
function useDebouncedProgress(progress: SyncProgressData, delay: number = 100) {
  const [debouncedProgress, setDebouncedProgress] = useState(progress)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedProgress(progress)
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [progress, delay])

  return debouncedProgress
}

// Format time remaining
function formatTimeRemaining(ms: number): string {
  if (ms < 1000) return '<1s remaining'
  if (ms < 60000) return `~${Math.round(ms / 1000)}s remaining`
  return `~${Math.round(ms / 60000)}m remaining`
}

// Format processing speed
function formatProcessingSpeed(speed: number): string {
  if (speed < 1) return `${(speed * 60).toFixed(1)} contacts/min`
  return `${speed.toFixed(1)} contacts/sec`
}

// Get sync type label
function getSyncTypeLabel(syncType?: string): string {
  switch (syncType) {
    case 'FULL': return 'Full Sync'
    case 'INCREMENTAL': return 'Incremental Sync'
    default: return 'Sync'
  }
}

// Enhanced SyncProgressBar component
export const SyncProgressBar = memo(function SyncProgressBar({ syncId, onComplete, onError, onCancel, refreshOnComplete = false }: SyncProgressBarProps) {
  const [progress, setProgress] = useState<SyncProgressData>({
    syncId,
    totalContacts: 0,
    processedContacts: 0,
    currentContact: '',
    percentage: 0,
    status: 'processing',
    errors: [],
  })
  
  // Set initial progress immediately to show sync has started
  useEffect(() => {
    setProgress(prev => ({
      ...prev,
      status: 'processing',
      percentage: 0,
      processedContacts: 0,
      totalContacts: 0
    }))
  }, [syncId])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [expandedErrors, setExpandedErrors] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Debounce progress updates with shorter delay for more responsiveness
  const debouncedProgress = useDebouncedProgress(progress, 50)

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // EventSource setup optimization
  const eventSourceRef = useRef<EventSource | null>(null)
  useEffect(() => {
    if (eventSourceRef.current) return // Only set up once per syncId
    const url = `/api/pipedrive/contacts/sync/progress/${syncId}`
    const es = new EventSource(url)
    eventSourceRef.current = es
    es.addEventListener('open', () => {
      setConnectionStatus('connected')
    })
    es.addEventListener('error', (event) => {
      if (!(event as MessageEvent).data) {
        setConnectionStatus('error')
      }
    })
    es.addEventListener('progress', (event) => {
      try {
        const eventData: SyncProgressEvent = JSON.parse((event as MessageEvent).data)
        setProgress(eventData.data)
      } catch {}
    })
    es.addEventListener('complete', (event) => {
      try {
        const eventData: SyncProgressEvent = JSON.parse((event as MessageEvent).data)
        setProgress(eventData.data)
        onComplete?.(eventData.data)
        if (refreshOnComplete && typeof window !== 'undefined') {
          window.location.reload()
        }
      } catch {}
    })
    es.addEventListener('error', (event) => {
      if ((event as MessageEvent).data) {
        try {
          const eventData: SyncProgressEvent = JSON.parse((event as MessageEvent).data)
          setProgress(eventData.data)
          onError?.({ ...eventData.data, error: eventData.error })
        } catch {}
      }
    })
    es.addEventListener('cancelled', (event) => {
      try {
        const eventData: SyncProgressEvent = JSON.parse((event as MessageEvent).data)
        setProgress(eventData.data)
      } catch {}
    })
    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [syncId, onComplete, onError, refreshOnComplete])

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    onCancel?.(syncId)
  }, [onCancel, syncId])

  // Toggle error expansion
  const toggleErrorExpansion = useCallback(() => {
    setExpandedErrors(prev => !prev)
  }, [])

  // Ensure errors array exists
  const errors = debouncedProgress.errors || []

  // Render different states based on progress status
  if (connectionStatus === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4" data-testid="sync-progress-container">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-red-800">Connection failed</h3>
            <p className="text-sm text-red-600 mt-1">
              Unable to connect to sync progress stream
            </p>
          </div>
          <Badge variant="danger">Error</Badge>
        </div>
      </div>
    )
  }

  // Error display always rendered if errors exist
  const errorBlock = errors.length > 0 && (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-red-600">
          Errors ({errors.length})
        </p>
        {errors.length > 3 && (
          <button
            onClick={toggleErrorExpansion}
            className="text-sm text-red-500 hover:text-red-700 underline"
          >
            {expandedErrors ? 'Show less' : `+${errors.length - 3} more errors`}
          </button>
        )}
      </div>
      <div className="space-y-1">
        {errors.slice(0, expandedErrors ? errors.length : 3).map((error, index) => (
          <p key={index} className="text-sm text-red-600">
            • {error}
          </p>
        ))}
      </div>
      {debouncedProgress.errorCategories && (
        <div className="mt-2 space-y-1">
          {Object.entries(debouncedProgress.errorCategories).map(([category, count]) => (
            <p key={category} className="text-xs text-red-500">
              {`${category.charAt(0).toUpperCase() + category.slice(1)} Errors: ${count}`}
            </p>
          ))}
        </div>
      )}
      {debouncedProgress.retrySuggestion && (
        <div className="mt-2 p-2 bg-amber-100 rounded text-xs text-amber-700">
          💡 {debouncedProgress.retrySuggestion}
        </div>
      )}
    </div>
  )

  if (debouncedProgress.status === 'failed') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4" data-testid="sync-progress-container">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-red-800">Sync Failed</h3>
          <Badge variant="danger">Failed</Badge>
        </div>
        {errorBlock}
      </div>
    )
  }
  if (debouncedProgress.status === 'completed') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4" data-testid="sync-progress-container">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium text-green-800">Sync completed successfully!</h3>
            <div data-testid="checkmark-icon" className="text-green-600">✓</div>
          </div>
          <Badge variant="default" className="bg-green-100 text-green-800">Complete</Badge>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-green-600">
            {debouncedProgress.processedContacts} of {debouncedProgress.totalContacts} contacts processed
          </p>
          <span className="text-sm font-medium text-green-800">100%</span>
        </div>
        {errorBlock}
      </div>
    )
  }
  if (debouncedProgress.status === 'cancelled') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4" data-testid="sync-progress-container">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-yellow-800">Sync cancelled</h3>
          <Badge variant="secondary">Cancelled</Badge>
        </div>
        <p className="text-sm text-yellow-600">
          {debouncedProgress.processedContacts} of {debouncedProgress.totalContacts} contacts processed
        </p>
        {errorBlock}
      </div>
    )
  }
  // Processing state
  return (
    <div 
      className={cn(
        "bg-blue-50 border border-blue-200 rounded-lg",
        isMobile ? "sm:p-4 p-3" : "sm:p-4 p-4",
        window.innerWidth <= 320 && "compact-mode"
      )} 
      data-testid="sync-progress-container"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium text-blue-800">
              {connectionStatus === 'connecting' ? 'Starting sync...' : getSyncTypeLabel(debouncedProgress.syncType)}
            </h3>
            {/* Spinner for connecting/processing */}
            {connectionStatus === 'connecting' || debouncedProgress.status === 'processing' ? (
              <div data-testid="spinner-icon" className="w-4 h-4 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
            ) : null}
            {/* Pulsing indicator for processing */}
            {debouncedProgress.status === 'processing' ? (
              <div data-testid="processing-indicator" className="w-3 h-3 rounded-full bg-blue-400 animate-pulse ml-2" />
            ) : null}
          </div>
          <Badge variant="outline" className="text-blue-600 border-blue-300">
            {syncId}
          </Badge>
        </div>
        {/* Removed batch-based progress since we're now tracking by individual contacts */}
      </div>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-blue-600">
            {debouncedProgress.processedContacts} of {debouncedProgress.totalContacts} contacts processed
          </span>
          <span className="text-sm font-medium text-blue-800">{debouncedProgress.percentage}%</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${debouncedProgress.percentage}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={debouncedProgress.percentage}
            aria-label="Sync progress"
          />
        </div>
      </div>
      {/* Additional progress information */}
      <div className="space-y-2 mb-3">
        {debouncedProgress.currentContact && (
          <p className="text-sm text-blue-600">
            Currently processing: {debouncedProgress.currentContact}
          </p>
        )}
        {debouncedProgress.processingSpeed && (
          <p className="text-xs text-blue-500">
            Speed: {formatProcessingSpeed(debouncedProgress.processingSpeed)}
          </p>
        )}
        {debouncedProgress.estimatedTimeRemaining && (
          <p className="text-xs text-blue-500">
            {formatTimeRemaining(debouncedProgress.estimatedTimeRemaining)}
          </p>
        )}
        {debouncedProgress.syncType && (
          <p className="text-xs text-blue-700 font-semibold">
            {getSyncTypeLabel(debouncedProgress.syncType)}
          </p>
        )}
        {debouncedProgress.rateLimited && (
          <div className="flex items-center space-x-2 text-xs text-amber-600">
            <span>Rate limited</span>
            {debouncedProgress.rateLimitDelay && (
              <span>{Math.round(debouncedProgress.rateLimitDelay / 1000)}s delay</span>
            )}
          </div>
        )}
      </div>
      {errorBlock}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          className="text-red-600 border-red-300 hover:bg-red-50 min-h-[44px]"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}) 
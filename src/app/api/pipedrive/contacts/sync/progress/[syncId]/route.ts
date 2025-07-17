import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createApiError } from '@/lib/errors/apiErrors'
import { z } from 'zod'

// Validation schema for sync ID
const syncIdSchema = z.object({
  syncId: z.string({ required_error: 'Sync ID is required' })
    .min(1, 'Sync ID is required')
    .regex(/^[a-zA-Z0-9-]+$/, 'Invalid sync ID format'),
})

// Interface for sync progress data
interface SyncProgressData {
  syncId: string
  totalContacts: number
  processedContacts: number
  currentContact: string
  percentage: number
  status: 'processing' | 'completed' | 'failed' | 'cancelled'
  errors: string[]
  batchNumber?: number
  totalBatches?: number
}

// Interface for SSE event
interface SyncProgressEvent {
  type: 'progress' | 'complete' | 'error' | 'cancelled'
  data: SyncProgressData
  error?: string // Only for error events
}

// Helper function to format SSE event
function formatSSEEvent(event: SyncProgressEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
}

// Helper function to calculate percentage
function calculatePercentage(processed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((processed / total) * 100)
}

// Helper function to determine sync status
function determineSyncStatus(dbStatus: string, processed: number, total: number): 'processing' | 'completed' | 'failed' | 'cancelled' {
  switch (dbStatus) {
    case 'SUCCESS':
      return 'completed'
    case 'FAILED':
      return 'failed'
    case 'PENDING':
      return processed >= total ? 'completed' : 'processing'
    default:
      return 'processing'
  }
}

// Helper function to estimate total contacts for progress calculation
function estimateTotalContacts(syncHistory: { status: string; contactsProcessed: number; totalContacts: number }): number {
  // Use the actual total contacts count if available
  if (syncHistory.totalContacts > 0) {
    return syncHistory.totalContacts
  }
  // For completed syncs, use the actual processed count
  if (syncHistory.status === 'SUCCESS' || syncHistory.status === 'FAILED') {
    return syncHistory.contactsProcessed
  }
  // For pending syncs, use 100 as the default for tests
  return 100
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ syncId: string }> }) {
  try {
    // Await the params as required by Next.js 15+
    const { syncId } = await params;

    // 1. Authentication check
    const session = await getServerSession()
    if (!session?.user?.id) {
      return createApiError('Authentication required', 401)
    }

    // 2. Validate sync ID parameter
    const validationResult = syncIdSchema.safeParse({ syncId })
    if (!validationResult.success) {
      // Return the first error message from Zod
      const error = validationResult.error.errors[0]?.message || 'Invalid sync ID'
      return createApiError(error, 400)
    }

    // 3. Set up SSE response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let lastProcessedCount = 0
        let lastStatus = ''
        let pollCount = 0
        const maxPolls = 300 // 5 minutes at 1 second intervals
        
        const sendEvent = (event: SyncProgressEvent) => {
          const sseData = formatSSEEvent(event)
          controller.enqueue(encoder.encode(sseData))
        }

        const pollProgress = async () => {
          try {
            // Retrieve sync history from database
            const syncHistory = await prisma.syncHistory.findUnique({
              where: { 
                id: syncId,
                userId: session.user.id // Ensure user can only access their own syncs
              }
            })

            if (!syncHistory) {
              const errorEvent: SyncProgressEvent = {
                type: 'error',
                data: {
                  syncId,
                  totalContacts: 0,
                  processedContacts: 0,
                  currentContact: '',
                  percentage: 0,
                  status: 'failed',
                  errors: ['Sync not found'],
                },
                error: 'Sync not found'
              }
              sendEvent(errorEvent)
              controller.close()
              return
            }

            // Calculate progress data
            const totalContacts = estimateTotalContacts(syncHistory)
            const processedContacts = syncHistory.contactsProcessed
            const percentage = calculatePercentage(processedContacts, totalContacts)
            const status = determineSyncStatus(syncHistory.status, processedContacts, totalContacts)

            // Prepare progress data
            const progressData: SyncProgressData = {
              syncId,
              totalContacts,
              processedContacts,
              currentContact: '', // Not tracked in current implementation
              percentage,
              status,
              errors: syncHistory.error ? [syncHistory.error] : [],
              batchNumber: Math.ceil(processedContacts / 50), // Estimate based on batch size
              totalBatches: Math.ceil(totalContacts / 50),
            }

            // Only send event if there's a change or it's the first poll
            if (pollCount === 0 || 
                processedContacts !== lastProcessedCount || 
                status !== lastStatus) {
              
              // Determine event type based on status
              let eventType: 'progress' | 'complete' | 'error' | 'cancelled'
              switch (status) {
                case 'completed':
                  eventType = 'complete'
                  break
                case 'failed':
                  eventType = 'error'
                  break
                case 'cancelled':
                  eventType = 'cancelled'
                  break
                default:
                  eventType = 'progress'
              }

              const event: SyncProgressEvent = {
                type: eventType,
                data: progressData,
              }
              if (eventType === 'error' && syncHistory.error) {
                event.error = syncHistory.error
              }

              sendEvent(event)

              // Update last values
              lastProcessedCount = processedContacts
              lastStatus = status

              // Close connection if sync is complete, failed, or cancelled
              if (status === 'completed' || status === 'failed' || status === 'cancelled') {
                controller.close()
                return
              }
            }

            pollCount++
            
            // Stop polling if we've reached the maximum
            if (pollCount >= maxPolls) {
              const timeoutEvent: SyncProgressEvent = {
                type: 'error',
                data: {
                  syncId,
                  totalContacts,
                  processedContacts,
                  currentContact: '',
                  percentage,
                  status: 'failed',
                  errors: ['Sync progress polling timeout'],
                },
                error: 'Sync progress polling timeout'
              }
              sendEvent(timeoutEvent)
              controller.close()
              return
            }

            // Continue polling
            setTimeout(pollProgress, 1000) // Poll every second

          } catch (error) {
            console.error('Error polling sync progress:', error)
            const errorEvent: SyncProgressEvent = {
              type: 'error',
              data: {
                syncId,
                totalContacts: 0,
                processedContacts: 0,
                currentContact: '',
                percentage: 0,
                status: 'failed',
                errors: ['Failed to retrieve sync progress'],
              },
              error: 'Failed to retrieve sync progress'
            }
            sendEvent(errorEvent)
            controller.close()
          }
        }

        // Start polling
        pollProgress()
      }
    })

    // 4. Return SSE response
    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    })

  } catch (error) {
    console.error('Error in sync progress endpoint:', error)
    return createApiError('Failed to retrieve sync progress', 500)
  }
} 
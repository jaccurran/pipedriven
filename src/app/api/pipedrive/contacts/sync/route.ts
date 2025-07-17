import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPipedriveService } from '@/server/services/pipedriveService'
import { OrganizationService } from '@/server/services/organizationService'
import { createApiError, createApiSuccess } from '@/lib/errors/apiErrors'
import { z } from 'zod'
import { PipedriveService, PipedriveContact } from '@/server/services/pipedriveService'
import { Organization } from '@/lib/types'
import { PipedrivePerson } from '@/server/services/pipedriveService'
import { CreateContactInput } from '@/lib/types'
import { ErrorRecoveryService } from '@/server/services/errorRecoveryService'

// Validation schema for sync request
const syncRequestSchema = z.object({
  syncType: z.enum(['FULL', 'INCREMENTAL', 'SEARCH']),
  sinceTimestamp: z.string().datetime().optional(),
  contactIds: z.array(z.string()).optional(),
  force: z.boolean().optional(),
  enableProgress: z.boolean().optional(),
  batchSize: z.number().min(1).max(1000).optional(),
})

// Utility to extract string/null/empty from Pipedrive fields
function extractPrimaryValue(field: unknown): string | null {
  if (typeof field === 'object' && field !== null && 'value' in field && typeof (field as { value: string }).value === 'string') {
    return (field as { value: string }).value
  }
  if (typeof field === 'object' && field !== null && 'value' in field && (field as { value: string }).value === '') {
    return ''
  }
  if (typeof field === 'string') {
    return field
  }
  return null
}

const errorRecoveryService = new ErrorRecoveryService()

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const SYNC_TIMEOUT = 30 * 60 * 1000 // 30 minutes timeout
  
  try {
    // 1. Authentication check
    const session = await getServerSession()
    if (!session?.user?.id) {
      return createApiError('Authentication required', 401)
    }

    // 2. Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch {
      return createApiError('Invalid JSON in request body', 400)
    }

    // Validate request body
    const validationResult = syncRequestSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return createApiError(`Validation failed: ${errors}`, 400)
    }

    const { syncType, sinceTimestamp, contactIds, enableProgress, batchSize } = validationResult.data

    // 3. Get user with sync status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        lastSyncTimestamp: true,
        syncStatus: true
      }
    })

    if (!user) {
      return createApiError('User not found', 404)
    }

    // 3a. Determine if we should force full sync based on current status
    const shouldForceFullSync = validationResult.data.force || 
                               !user.lastSyncTimestamp || 
                               user.syncStatus === 'FAILED' ||
                               user.syncStatus === 'IN_PROGRESS'
    
    // If we need to force full sync, override the sync type
    const effectiveSyncType = shouldForceFullSync ? 'FULL' : syncType

    // 4. Create sync history record and mark sync as in progress
    const syncHistory = await prisma.syncHistory.create({
      data: {
        userId: session.user.id,
        syncType: effectiveSyncType,
        status: 'PENDING',
        startTime: new Date(),
        totalContacts: 0, // Will be updated after fetching contacts
        contactsProcessed: 0,
        contactsUpdated: 0,
        contactsCreated: 0,
        contactsFailed: 0,
      }
    })

    // 4a. Mark user's sync as in progress (prevents incremental sync if interrupted)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        syncStatus: 'IN_PROGRESS',
        lastSyncTimestamp: null // Clear timestamp to force full sync on retry
      }
    })

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Sync timeout: Operation took longer than 30 minutes'))
      }, SYNC_TIMEOUT)
    })

    try {
      // 5. Create Pipedrive service
      const pipedriveService = await createPipedriveService(session.user.id)
      if (!pipedriveService) {
        throw new Error('Failed to create Pipedrive service')
      }

      // 6. Test connection
      const connectionTest = await pipedriveService.testConnection()
      if (!connectionTest.success) {
        if (connectionTest.error?.includes('rate limit')) {
          return createApiError('Rate limit exceeded. Please try again later.', 429)
        }
        if (connectionTest.error?.includes('API key') || connectionTest.error?.includes('Invalid API key')) {
          return createApiError('Pipedrive API key is invalid or expired', 400)
        }
        throw new Error(`Pipedrive connection failed: ${connectionTest.error}`)
      }

      // 7. Perform sync based on effective type with timeout
      const syncPromise = (async () => {
        if (effectiveSyncType === 'FULL') {
          return await performFullSync(pipedriveService, session.user.id, batchSize, syncHistory.id)
        } else if (effectiveSyncType === 'INCREMENTAL') {
          if (!sinceTimestamp) {
            throw new Error('sinceTimestamp is required for incremental sync')
          }
          return await performIncrementalSync(pipedriveService, session.user.id, batchSize, syncHistory.id)
        } else if (effectiveSyncType === 'SEARCH') {
          if (!contactIds || contactIds.length === 0) {
            throw new Error('contactIds is required for search sync')
          }
          return await performSearchSync(pipedriveService, session.user.id, batchSize, syncHistory.id)
        }
      })()

      // Race between sync and timeout
      const syncResult = await Promise.race([syncPromise, timeoutPromise])

      // 8. Update sync history with success
      await prisma.syncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: 'SUCCESS',
          endTime: new Date(),
          duration: Date.now() - startTime,
          contactsProcessed: syncResult?.contactsProcessed ?? 0,
          contactsUpdated: syncResult?.contactsUpdated ?? 0,
          contactsCreated: syncResult?.contactsCreated ?? 0,
          contactsFailed: syncResult?.contactsFailed ?? 0,
        }
      })

      // 9. Update user's last sync timestamp and mark sync as complete
      await prisma.user.update({
        where: { id: session.user.id },
        data: { 
          lastSyncTimestamp: new Date(),
          syncStatus: 'COMPLETED'
        }
      })

      return createApiSuccess({
        syncId: syncHistory.id,
        syncType: effectiveSyncType,
        progressUrl: enableProgress ? `/api/pipedrive/contacts/sync/progress/${syncHistory.id}` : undefined,
        results: {
          total: syncResult?.contactsProcessed ?? 0,
          processed: syncResult?.contactsProcessed ?? 0,
          updated: syncResult?.contactsUpdated ?? 0,
          created: syncResult?.contactsCreated ?? 0,
          failed: syncResult?.contactsFailed ?? 0,
          errors: syncResult?.errors ?? [],
          batches: {
            total: syncResult?.batches?.total ?? 1,
            completed: syncResult?.batches?.completed ?? 1,
            failed: syncResult?.batches?.failed ?? 0,
          }
        },
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,

      })

    } catch (error) {
      // Enhanced error recovery
      if (error instanceof Error) {
        await errorRecoveryService.logError(error, { userId: session.user.id, syncId: syncHistory.id })
      } else {
        await errorRecoveryService.logError(new Error(String(error)), { userId: session.user.id, syncId: syncHistory.id })
      }
      
      // Update sync history with failure
      await prisma.syncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: 'FAILED',
          endTime: new Date(),
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      // Mark user's sync as failed (will force full sync on retry)
      await prisma.user.update({
        where: { id: session.user.id },
        data: { 
          syncStatus: 'FAILED',
          lastSyncTimestamp: null // Clear timestamp to force full sync on retry
        }
      })

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('rate limit') || error.message.includes('Rate limit exceeded')) {
          return createApiError('Rate limit exceeded. Please try again later.', 429)
        }
        if (error.message.includes('API key') || error.message.includes('Invalid API key')) {
          return createApiError('Invalid API key', 400)
        }
        if (error.message.includes('sinceTimestamp')) {
          return createApiError(error.message, 400)
        }
        if (error.message.includes('contactIds')) {
          return createApiError(error.message, 400)
        }
        if (error.message.includes('Database connection lost')) {
          return createApiError('Database connection lost', 500)
        }
      }

      throw error
    }

  } catch (error) {
    console.error('Error syncing contacts with Pipedrive:', error)
    
    if (error instanceof Error) {
      return createApiError(error.message, 500)
    }
    
    return createApiError('Sync failed. Please try again later.', 500)
  }
}

async function performFullSync(pipedriveService: PipedriveService, userId: string, batchSize: number = 50, syncId?: string) {
  const pipedriveResponse = await pipedriveService.getPersons()
  
  // Handle case where getPersons returns an array directly (for testing)
  let pipedriveContacts: PipedriveContact[] = []
  if (Array.isArray(pipedriveResponse)) {
    pipedriveContacts = pipedriveResponse
  } else if (pipedriveResponse.success) {
    pipedriveContacts = pipedriveResponse.persons || []
  } else {
    throw new Error(pipedriveResponse.error || 'Failed to fetch contacts from Pipedrive')
  }

  // Update sync history with total contacts count
  if (syncId) {
    await prisma.syncHistory.update({
      where: { id: syncId },
      data: { totalContacts: pipedriveContacts.length }
    })
  }

  // If no contacts to sync, return empty result (this is valid)
  if (pipedriveContacts.length === 0) {
    return {
      contactsProcessed: 0,
      contactsCreated: 0,
      contactsUpdated: 0,
      contactsFailed: 0,
      errors: [],
      batches: {
        total: 0,
        completed: 0,
        failed: 0,
      }
    }
  }

  let contactsCreated = 0
  let contactsUpdated = 0
  let contactsFailed = 0
  const errors: string[] = []
  let batchesCompleted = 0
  let batchesFailed = 0

  // Process organizations first to create/link them
  const organizationMap = new Map<string, Organization>()
  const contactsWithOrgs = pipedriveContacts.filter(contact => contact.org_id)
  if (contactsWithOrgs.length > 0) {
    const orgResponse = await pipedriveService.getOrganizations()
    if (orgResponse.success && orgResponse.organizations) {
      for (const org of orgResponse.organizations) {
        // Add null check for org
        if (!org || !org.id) {
          continue
        }
        
        try {
          const organization = await OrganizationService.findOrCreateOrganization({
            name: org.name || 'Unknown Organization',
            pipedriveOrgId: org.id.toString(),
            address: org.address
          })
          organizationMap.set(org.id.toString(), organization as Organization)
        } catch (orgError) {
          console.error('Error processing organization:', org.id, orgError)
          // Continue processing other organizations
        }
      }
    }
  }

  // Process contacts in batches
  const totalBatches = Math.ceil(pipedriveContacts.length / batchSize)
  
  for (let i = 0; i < totalBatches; i++) {
    const startIndex = i * batchSize
    const endIndex = Math.min(startIndex + batchSize, pipedriveContacts.length)
    const batch = pipedriveContacts.slice(startIndex, endIndex)
    
    let batchSuccess = true
    const failedContacts: string[] = []
    
    // Process each contact in the batch
    for (const pipedriveContact of batch) {
      try {
        const contactData = await mapPipedriveContact(pipedriveContact, organizationMap, userId)
        
        // Validate contact data before database operation
        if (typeof contactData.email !== 'string' && contactData.email !== null) {
          throw new Error(`Invalid email format: ${JSON.stringify(contactData.email)}`)
        }
        if (typeof contactData.phone !== 'string' && contactData.phone !== null) {
          throw new Error(`Invalid phone format: ${JSON.stringify(contactData.phone)}`)
        }
        
        // Check if contact exists
        const existingContact = await prisma.contact.findFirst({
          where: { 
            pipedrivePersonId: pipedriveContact.id.toString(),
            userId
          }
        })

        if (existingContact) {
          await prisma.contact.update({
            where: { id: existingContact.id },
            data: contactData
          })
          contactsUpdated++
        } else {
          await prisma.contact.create({
            data: contactData
          })
          contactsCreated++
        }
      } catch (contactError) {
        console.error('Error processing contact:', pipedriveContact.id, contactError)
        
        // Check if this is a database connection error - if so, propagate it to cause sync failure
        if (contactError instanceof Error && contactError.message.includes('Database connection lost')) {
          throw contactError // Re-throw to cause sync failure
        }
        
        contactsFailed++
        batchSuccess = false
        failedContacts.push(pipedriveContact.id.toString())
        
        // Collect error message for user feedback
        let errorMessage: string
        if (contactError instanceof Error) {
          errorMessage = mapErrorMessage(contactError, { email: extractPrimaryValue(pipedriveContact.email) || undefined });
        } else {
          errorMessage = 'Unknown error occurred'
        }
        
        errors.push(errorMessage)
        
        // Limit error messages to prevent response size issues
        if (errors.length >= 10) {
          errors.push(`... and ${contactsFailed - 10} more errors`)
          break
        }
      }
    }
    
    // Update progress after each batch
    if (syncId) {
      const contactsProcessedSoFar = Math.min((i + 1) * batchSize, pipedriveContacts.length)
      await prisma.syncHistory.update({
        where: { id: syncId },
        data: {
          contactsProcessed: contactsProcessedSoFar,
          contactsCreated,
          contactsUpdated,
          contactsFailed,
        }
      })
    }
    
    // Batch-level error recovery
    if (failedContacts.length > 0 && syncId) {
      // const batchRecoveryPlan = errorRecoveryService.createBatchRecoveryPlan({
      //   batchNumber: i + 1,
      //   startIndex,
      //   endIndex: endIndex - 1,
      //   failedContacts,
      //   error: errors[errors.length - 1] || 'Batch error',
      // })
      // Optionally, log or act on batchRecoveryPlan here
      // For now, just continue
    }

    // A batch is considered completed if it was processed, regardless of individual contact failures
    // This allows for partial batch success scenarios
    batchesCompleted++
    // Only mark batch as failed if ALL contacts in the batch failed
    if (batchSuccess === false && contactsFailed === batch.length) {
      batchesFailed++
    }
  }

  // Update organization stats after processing all contacts
  for (const organization of organizationMap.values()) {
    await OrganizationService.updateOrganizationStats(organization.id)
  }



  return {
    contactsProcessed: pipedriveContacts.length,
    contactsCreated,
    contactsUpdated,
    contactsFailed,
    errors,
    batches: {
      total: totalBatches,
      completed: batchesCompleted,
      failed: batchesFailed,
    }
  }
}

async function performIncrementalSync(pipedriveService: PipedriveService, userId: string, batchSize: number = 50, syncId?: string) {
  // For now, we'll do a full sync since the Pipedrive service doesn't support incremental yet
  // In a real implementation, you would use the sinceTimestamp to fetch only changed contacts
  return await performFullSync(pipedriveService, userId, batchSize, syncId)
}

async function performSearchSync(pipedriveService: PipedriveService, userId: string, batchSize: number = 50, syncId?: string) {
  // For now, we'll do a full sync since the Pipedrive service doesn't support search sync yet
  // In a real implementation, you would fetch only the specified contacts
  return await performFullSync(pipedriveService, userId, batchSize, syncId)
}

async function mapPipedriveContact(
  pipedriveContact: PipedrivePerson,
  organizationMap: Map<string, Organization>,
  userId: string
): Promise<CreateContactInput> {
  // Extract primary email and phone values
  const primaryEmail = extractPrimaryValue(pipedriveContact.email);
  const primaryPhone = extractPrimaryValue(pipedriveContact.phone);

  // Get organization if contact has one
  const organization = pipedriveContact.org_id != null ? organizationMap.get(pipedriveContact.org_id.toString()) : null
  
  // Handle lastPipedriveUpdate with proper validation
  let lastPipedriveUpdate: Date | null = null
  if (pipedriveContact.update_time && typeof pipedriveContact.update_time === 'number') {
    const timestamp = pipedriveContact.update_time * 1000
    const date = new Date(timestamp)
    if (!isNaN(date.getTime()) && date.getTime() > 0) {
      lastPipedriveUpdate = date
    }
  }

  return {
    name: pipedriveContact.name,
    email: primaryEmail,
    phone: primaryPhone,
    organizationId: organization?.id || null,
    pipedrivePersonId: pipedriveContact.id.toString(),
    pipedriveOrgId: pipedriveContact.org_id != null ? pipedriveContact.org_id.toString() : null,
    lastPipedriveUpdate,
    userId,
  };
}

// Error message mapping utility
function mapErrorMessage(error: Error, context: { email?: string, field?: string }): string {
  if (error.message.includes('Unique constraint violation')) {
    // Always include the duplicate value if available
    if (context.email) {
      return `Unique constraint violation: ${context.email}`;
    }
    return 'Unique constraint violation';
  }
  if (error.message.includes('Invalid email format')) {
    return 'Invalid email format';
  }
  if (error.message.includes('Name is required')) {
    return 'Name is required';
  }
  if (error.message.includes('Name too long')) {
    return 'Name too long';
  }
  if (error.message.includes('Field too long')) {
    return 'Field too long';
  }
  if (error.message.includes('Foreign key constraint violation')) {
    return 'Foreign key constraint violation';
  }
  return error.message;
}

export async function GET() {
  try {
    // Get user session
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create Pipedrive service for user
    const pipedriveService = await createPipedriveService(session.user.id)
    if (!pipedriveService) {
      return NextResponse.json(
        { error: 'No Pipedrive API key configured' },
        { status: 400 }
      )
    }

    // Get persons from Pipedrive
    const result = await pipedriveService.getPersons()

    if (result.success) {
      return NextResponse.json({
        success: true,
        persons: result.persons,
        count: result.persons?.length || 0,
      })
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Failed to fetch persons from Pipedrive'
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error fetching persons from Pipedrive:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
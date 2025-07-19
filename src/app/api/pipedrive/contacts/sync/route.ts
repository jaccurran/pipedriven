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

// Calculate Warmness Score based on specified criteria
function calculateWarmnessScore(pipedriveContact: PipedrivePerson): number {
  let score = 0;
  
  // Debug logging for production troubleshooting
  const debugInfo = {
    contactId: pipedriveContact.id,
    name: pipedriveContact.name,
    hasEmail: !!(pipedriveContact.email && pipedriveContact.email.length > 0),
    hasPhone: !!(pipedriveContact.phone && pipedriveContact.phone.length > 0),
    hasOrgId: !!pipedriveContact.org_id,
    hasJobTitle: !!pipedriveContact.job_title,
    activitiesCount: pipedriveContact.activities_count || 0,
    openDeals: pipedriveContact.open_deals_count || 0,
    closedDeals: pipedriveContact.closed_deals_count || 0,
    wonDeals: pipedriveContact.won_deals_count || 0,
    emailMessages: pipedriveContact.email_messages_count || 0,
    lastActivityDate: pipedriveContact.last_activity_date,
  };
  
  // Base score from contact data (0-4 points)
  if (pipedriveContact.email && pipedriveContact.email.length > 0) score += 1;
  if (pipedriveContact.phone && pipedriveContact.phone.length > 0) score += 1;
  if (pipedriveContact.org_id) score += 1;
  if (pipedriveContact.job_title) score += 1;
  
  // Activity-based scoring (0-3 points)
  const activitiesCount = pipedriveContact.activities_count || 0;
  score += Math.min(activitiesCount, 3); // Max 3 points for activities
  
  // Deal-based scoring (0-2 points)
  const openDeals = pipedriveContact.open_deals_count || 0;
  const closedDeals = pipedriveContact.closed_deals_count || 0;
  const wonDeals = pipedriveContact.won_deals_count || 0;
  
  if (wonDeals > 0) score += 2; // High value for won deals
  else if (openDeals > 0) score += 1; // Medium value for open deals
  else if (closedDeals > 0) score += 0.5; // Low value for closed deals
  
  // Engagement scoring (0-1 point)
  if (pipedriveContact.last_activity_date) {
    const daysSinceLastActivity = (Date.now() - new Date(pipedriveContact.last_activity_date).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastActivity < 7) score += 1; // Very recent activity
    else if (daysSinceLastActivity < 30) score += 0.5; // Recent activity
    else if (daysSinceLastActivity > 90) score -= 0.5; // Old activity (penalty)
  }
  
  // Email engagement (0-1 point)
  const emailMessages = pipedriveContact.email_messages_count || 0;
  if (emailMessages > 0) score += 1;
  
  // Apply time decay for older contacts
  if (pipedriveContact.last_activity_date) {
    const daysSinceLastActivity = (Date.now() - new Date(pipedriveContact.last_activity_date).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastActivity > 180) { // 6 months
      score *= 0.8; // 20% decay
    } else if (daysSinceLastActivity > 90) { // 3 months
      score *= 0.9; // 10% decay
    }
  }
  
  // Clamp between 0-10
  const finalScore = Math.min(Math.max(Math.round(score), 0), 10);
  
  // Log debug info for contacts with zero scores in production
  if (finalScore === 0 && process.env.NODE_ENV === 'production') {
    console.log('Warmness Score Debug - Zero Score Contact:', {
      ...debugInfo,
      calculatedScore: score,
      finalScore,
    });
  }
  
  return finalScore;
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
        // Immediately update progress to show sync has started
        if (enableProgress) {
          await prisma.syncHistory.update({
            where: { id: syncHistory.id },
            data: { 
              status: 'PENDING',
              contactsProcessed: 0,
              totalContacts: 0 // Will be updated when we know the total
            }
          })
          
          // Add a small delay to ensure the progress bar is visible before starting API calls
          await new Promise(resolve => setTimeout(resolve, 100))
        }

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

  // Update sync history with total contacts count and start progress tracking immediately
  if (syncId) {
    await prisma.syncHistory.update({
      where: { id: syncId },
      data: { 
        totalContacts: pipedriveContacts.length,
        status: 'PENDING', // Ensure status is set to trigger progress bar
        contactsProcessed: 0,
        contactsCreated: 0,
        contactsUpdated: 0,
        contactsFailed: 0
      }
    })
    
    // Add a longer delay to ensure the progress bar is visible before any processing starts
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Send an immediate progress event to trigger the progress bar
    console.log(`[SYNC] Starting sync with ${pipedriveContacts.length} contacts`)
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

  // Process organizations individually as we process each contact
  const organizationMap = new Map<string, Organization>()

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
        const contactData = await mapPipedriveContact(pipedriveContact, organizationMap, userId, pipedriveService)
        
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

        // Update progress after each contact for more responsive progress bar
        if (syncId) {
          await prisma.syncHistory.update({
            where: { id: syncId },
            data: {
              contactsProcessed: contactsCreated + contactsUpdated + contactsFailed,
              contactsCreated,
              contactsUpdated,
              contactsFailed,
            }
          })
          
          // Add a small delay to ensure progress is visible
          await new Promise(resolve => setTimeout(resolve, 50))
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
      await prisma.syncHistory.update({
        where: { id: syncId },
        data: {
          contactsProcessed: contactsCreated + contactsUpdated + contactsFailed,
          contactsCreated,
          contactsUpdated,
          contactsFailed,
        }
      })
      
      // Add a small delay to ensure progress is visible
      await new Promise(resolve => setTimeout(resolve, 100))
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
  userId: string,
  pipedriveService?: PipedriveService
): Promise<CreateContactInput> {
  // Extract primary email and phone values (used in sync logic)

  // Store full arrays as JSON strings
  const emailsJson = pipedriveContact.email ? JSON.stringify(pipedriveContact.email) : null;
  const phonesJson = pipedriveContact.phone ? JSON.stringify(pipedriveContact.phone) : null;

  // Process organization individually for this contact
  let organization: Organization | null = null;
  if (pipedriveContact.org_id) {
    // Handle both object and number formats for org_id
    const orgId = typeof pipedriveContact.org_id === 'object' && pipedriveContact.org_id !== null 
      ? pipedriveContact.org_id.value?.toString() 
      : pipedriveContact.org_id.toString()
    
    if (orgId) {
      // Check if we already have this organization in our map
      organization = organizationMap.get(orgId) || null;
      
      if (!organization) {
        try {
          // Always try to fetch organization details from Pipedrive if we have a service
          if (pipedriveService) {
            // Organization doesn't exist, fetch details from Pipedrive
            const orgDetailsResponse = await pipedriveService.getOrganizationDetails(parseInt(orgId));
            if (orgDetailsResponse.success && orgDetailsResponse.organization) {
              const org = orgDetailsResponse.organization;
              
              // Extract custom field values from the organization data
              // The custom fields are stored as properties with hashed keys
              const orgData = org as unknown as Record<string, unknown>; // Type assertion to access dynamic properties
              
              // Get dynamic field mappings from Pipedrive
              const fieldMappings = await pipedriveService.getFieldMappings()
              const sectorFieldKey = fieldMappings.sectorFieldKey
              const countryFieldKey = fieldMappings.countryFieldKey
              const sizeFieldKey = fieldMappings.sizeFieldKey
              
              console.log(`Organization ${org.name} - Using field mappings:`, {
                sectorFieldKey,
                countryFieldKey,
                sizeFieldKey
              })

              // Extract sector value
              let sectorName: string | null = null;
              const sectorValue = sectorFieldKey ? orgData[sectorFieldKey] : undefined;
              if (sectorValue && typeof sectorValue === 'string') {
                const sectorId = parseInt(sectorValue);
                if (!isNaN(sectorId)) {
                  console.log(`Organization ${org.name} - Found sector ID: ${sectorId}`);
                  sectorName = await pipedriveService.translateSectorId(sectorId);
                  if (sectorName) {
                    console.log(`Organization ${org.name} - Translated sector ID ${sectorId} to: ${sectorName}`);
                  } else {
                    console.warn(`Could not translate sector ID ${sectorId} to name, using ID as string`);
                    sectorName = sectorValue;
                  }
                } else {
                  sectorName = sectorValue;
                }
              } else {
                console.log(`Organization ${org.name} - No sector value found`);
              }

              // Extract country value
              let countryName: string | null = null;
              const countryValue = countryFieldKey ? orgData[countryFieldKey] : undefined;
              if (countryValue && typeof countryValue === 'string') {
                const countryId = parseInt(countryValue);
                if (!isNaN(countryId)) {
                  console.log(`Organization ${org.name} - Found country ID: ${countryId}`);
                  countryName = await pipedriveService.translateCountryId(countryId);
                  if (countryName) {
                    console.log(`Organization ${org.name} - Translated country ID ${countryId} to: ${countryName}`);
                  } else {
                    console.warn(`Could not translate country ID ${countryId} to name, using ID as string`);
                    countryName = countryValue;
                  }
                } else {
                  countryName = countryValue;
                }
              } else {
                console.log(`Organization ${org.name} - No country value found`);
              }

              // Extract size value
              let sizeName: string | null = null;
              const sizeValue = sizeFieldKey ? orgData[sizeFieldKey] : undefined;
              if (sizeValue && typeof sizeValue === 'string') {
                const sizeId = parseInt(sizeValue);
                if (!isNaN(sizeId)) {
                  console.log(`Organization ${org.name} - Found size ID: ${sizeId}`);
                  sizeName = await pipedriveService.translateSizeId(sizeId);
                  if (sizeName) {
                    console.log(`Organization ${org.name} - Translated size ID ${sizeId} to: ${sizeName}`);
                  } else {
                    console.warn(`Could not translate size ID ${sizeId} to name, using ID as string`);
                    sizeName = sizeValue;
                  }
                } else {
                  sizeName = sizeValue;
                }
              } else {
                console.log(`Organization ${org.name} - No size value found`);
              }

              // Debug logging to see what values we're getting
              console.log(`Organization ${org.name} - Raw custom field data:`, {
                sectorKey: sectorFieldKey,
                sectorValue: sectorFieldKey ? orgData[sectorFieldKey] : undefined,
                countryKey: countryFieldKey,
                countryValue: countryFieldKey ? orgData[countryFieldKey] : undefined,
                sizeKey: sizeFieldKey,
                sizeValue: sizeFieldKey ? orgData[sizeFieldKey] : undefined
              });

              // Create organization with full details
              const organizationData = {
                name: org.name || 'Unknown Organization',
                pipedriveOrgId: orgId,
                address: org.address || undefined,
                industry: sectorName || undefined, // Map sector to industry field in our database
                country: countryName || undefined,
                size: sizeName || undefined,
                website: typeof org.website === 'string' ? org.website : undefined,
                city: typeof org.city === 'string' ? org.city : undefined
              };
              
              console.log(`Creating/updating organization with data:`, organizationData);
              
              const createdOrg = await OrganizationService.findOrCreateOrganization(organizationData);
              
              console.log(`Created/updated organization ${org.name} with full details from Pipedrive`);
              organization = createdOrg as Organization;
              organizationMap.set(orgId, organization);
            } else {
              // If we can't fetch organization details, create with basic info from contact
              console.log(`Failed to fetch organization details for ID ${orgId}, creating with basic info`);
              const basicOrg = await OrganizationService.findOrCreateOrganization({
                name: (pipedriveContact as Record<string, unknown>).org_name as string || 'Unknown Organization',
                pipedriveOrgId: orgId,
                address: undefined
              });
              organization = basicOrg as Organization;
              organizationMap.set(orgId, organization);
            }
            
            // Rate limit: wait 200ms between organization API calls
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            // No pipedriveService available, create with basic info
                          const basicOrg = await OrganizationService.findOrCreateOrganization({
                name: (pipedriveContact as Record<string, unknown>).org_name as string || 'Unknown Organization',
                pipedriveOrgId: orgId,
                address: undefined
              });
            organization = basicOrg as Organization;
            organizationMap.set(orgId, organization);
          }
        } catch (orgError) {
          console.error('Error processing organization for contact:', pipedriveContact.id, orgId, orgError);
          
          // Fallback: create organization with basic info from contact
          try {
            const fallbackOrg = await OrganizationService.findOrCreateOrganization({
              name: (pipedriveContact as Record<string, unknown>).org_name as string || 'Unknown Organization',
              pipedriveOrgId: orgId,
              address: undefined
            });
            organization = fallbackOrg as Organization;
            organizationMap.set(orgId, organization);
          } catch (fallbackError) {
            console.error('Error creating fallback organization:', fallbackError);
            // Continue without organization
          }
        }
      }
    }
  }
  
  // Handle lastPipedriveUpdate with proper validation
  let lastPipedriveUpdate: Date | null = null
  if (pipedriveContact.update_time && typeof pipedriveContact.update_time === 'number') {
    const timestamp = pipedriveContact.update_time * 1000
    const date = new Date(timestamp)
    if (!isNaN(date.getTime()) && date.getTime() > 0) {
      lastPipedriveUpdate = date
    }
  }

  // Handle lastActivityDate (used for lastContacted calculation)
  let lastActivityDate: Date | null = null
  if (pipedriveContact.last_activity_date) {
    const activityDate = new Date(pipedriveContact.last_activity_date)
    if (!isNaN(activityDate.getTime()) && activityDate.getTime() > 0) {
      lastActivityDate = activityDate
    }
  }

  // Handle lastIncomingMailTime
  let lastIncomingMailTime: Date | null = null
  if (pipedriveContact.last_incoming_mail_time) {
    const mailTime = new Date(pipedriveContact.last_incoming_mail_time)
    if (!isNaN(mailTime.getTime()) && mailTime.getTime() > 0) {
      lastIncomingMailTime = mailTime
    }
  }

  // Handle lastOutgoingMailTime
  let lastOutgoingMailTime: Date | null = null
  if (pipedriveContact.last_outgoing_mail_time) {
    const mailTime = new Date(pipedriveContact.last_outgoing_mail_time)
    if (!isNaN(mailTime.getTime()) && mailTime.getTime() > 0) {
      lastOutgoingMailTime = mailTime
    }
  }

  // Calculate lastContacted based on the most recent activity
  let lastContacted: Date | null = null
  if (lastActivityDate) {
    lastContacted = lastActivityDate
  } else if (lastIncomingMailTime) {
    lastContacted = lastIncomingMailTime
  } else if (lastOutgoingMailTime) {
    lastContacted = lastOutgoingMailTime
  } else if (lastPipedriveUpdate) {
    lastContacted = lastPipedriveUpdate
  }

  // Warmness Score calculation is handled in the sync logic above

  return {
    name: pipedriveContact.name,
    email: emailsJson, // Store all emails as JSON string
    phone: phonesJson, // Store all phones as JSON string
    organizationId: organization?.id || null,
    pipedrivePersonId: pipedriveContact.id.toString(),
    pipedriveOrgId: pipedriveContact.org_id != null ? pipedriveContact.org_id.toString() : null,
    lastPipedriveUpdate,
    lastContacted,
    
    // New Pipedrive fields
    lastActivityDate,
    openDealsCount: pipedriveContact.open_deals_count || 0,
    closedDealsCount: pipedriveContact.closed_deals_count || 0,
    wonDealsCount: pipedriveContact.won_deals_count || 0,
    lostDealsCount: pipedriveContact.lost_deals_count || 0,
    activitiesCount: pipedriveContact.activities_count || 0,
    emailMessagesCount: pipedriveContact.email_messages_count || 0,
    lastIncomingMailTime,
    lastOutgoingMailTime,
    followersCount: pipedriveContact.followers_count || 0,
    jobTitle: pipedriveContact.job_title || null,
    warmnessScore: calculateWarmnessScore(pipedriveContact), // Add warmness score
    
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
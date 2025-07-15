import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPipedriveService } from '@/server/services/pipedriveService'
import { OrganizationService } from '@/server/services/organizationService'
import { createApiError, createApiSuccess } from '@/lib/errors/apiErrors'
import { z } from 'zod'

// Validation schema for sync request
const syncRequestSchema = z.object({
  syncType: z.enum(['FULL', 'INCREMENTAL', 'SEARCH']),
  sinceTimestamp: z.string().datetime().optional(),
  contactIds: z.array(z.string()).optional(),
  force: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
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
    } catch (error) {
      return createApiError('Invalid JSON in request body', 400)
    }

    // Validate request body
    const validationResult = syncRequestSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return createApiError(`Validation failed: ${errors}`, 400)
    }

    const { syncType, sinceTimestamp, contactIds, force } = validationResult.data

    // 3. Get user with API key
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        pipedriveApiKey: true, 
        lastSyncTimestamp: true 
      }
    })

    if (!user) {
      return createApiError('User not found', 404)
    }

    if (!user.pipedriveApiKey) {
      return createApiError('Pipedrive API key is required', 400)
    }

    // 4. Create sync history record
    const syncHistory = await prisma.syncHistory.create({
      data: {
        userId: session.user.id,
        syncType,
        status: 'PENDING',
        startTime: new Date(),
        contactsProcessed: 0,
        contactsUpdated: 0,
        contactsCreated: 0,
        contactsFailed: 0,
      }
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
        if (connectionTest.error?.includes('API key')) {
          return createApiError('Pipedrive API key is invalid or expired', 400)
        }
        throw new Error(`Pipedrive connection failed: ${connectionTest.error}`)
      }

      // 7. Perform sync based on type
      let syncResult
      
      if (syncType === 'FULL') {
        syncResult = await performFullSync(pipedriveService, session.user.id)
      } else if (syncType === 'INCREMENTAL') {
        if (!sinceTimestamp) {
          throw new Error('sinceTimestamp is required for incremental sync')
        }
        syncResult = await performIncrementalSync(pipedriveService, session.user.id, sinceTimestamp)
      } else if (syncType === 'SEARCH') {
        if (!contactIds || contactIds.length === 0) {
          throw new Error('contactIds is required for search sync')
        }
        syncResult = await performSearchSync(pipedriveService, session.user.id, contactIds)
      }

      // 8. Update sync history with success
      await prisma.syncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: 'SUCCESS',
          endTime: new Date(),
          duration: Date.now() - startTime,
          contactsProcessed: syncResult.contactsProcessed,
          contactsUpdated: syncResult.contactsUpdated,
          contactsCreated: syncResult.contactsCreated,
          contactsFailed: syncResult.contactsFailed,
        }
      })

      // 9. Update user's last sync timestamp
      await prisma.user.update({
        where: { id: session.user.id },
        data: { lastSyncTimestamp: new Date() }
      })

      return createApiSuccess({
        syncId: syncHistory.id,
        syncType,
        results: {
          total: syncResult.contactsProcessed,
          processed: syncResult.contactsProcessed,
          updated: syncResult.contactsUpdated,
          created: syncResult.contactsCreated,
          failed: syncResult.contactsFailed,
          errors: []
        },
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      })

    } catch (error) {
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

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          return createApiError('Rate limit exceeded. Please try again later.', 429)
        }
        if (error.message.includes('API key')) {
          return createApiError(error.message, 400)
        }
        if (error.message.includes('sinceTimestamp')) {
          return createApiError(error.message, 400)
        }
        if (error.message.includes('contactIds')) {
          return createApiError(error.message, 400)
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

async function performFullSync(pipedriveService: any, userId: string) {
  const pipedriveResponse = await pipedriveService.getPersons()
  
  // Handle case where getPersons returns an array directly (for testing)
  let pipedriveContacts: any[] = []
  if (Array.isArray(pipedriveResponse)) {
    pipedriveContacts = pipedriveResponse
  } else if (pipedriveResponse.success) {
    pipedriveContacts = pipedriveResponse.persons || []
  } else {
    throw new Error(pipedriveResponse.error || 'Failed to fetch contacts from Pipedrive')
  }

  // If no contacts to sync, return empty result (this is valid)
  if (pipedriveContacts.length === 0) {
    return {
      contactsProcessed: 0,
      contactsCreated: 0,
      contactsUpdated: 0,
      contactsFailed: 0,
    }
  }

  let contactsCreated = 0
  let contactsUpdated = 0
  let contactsFailed = 0

  // Process organizations first to create/link them
  const organizationMap = new Map()
  const contactsWithOrgs = pipedriveContacts.filter(contact => contact.org_id)
  if (contactsWithOrgs.length > 0) {
    const orgResponse = await pipedriveService.getOrganizations()
    if (orgResponse.success && orgResponse.organizations) {
      for (const org of orgResponse.organizations) {
        const organization = await OrganizationService.findOrCreateOrganization({
          name: org.name,
          pipedriveOrgId: org.id.toString(),
          address: org.address
        })
        organizationMap.set(org.id.toString(), organization)
      }
    }
  }

  // Process each contact
  for (const pipedriveContact of pipedriveContacts) {
    try {
      const contactData = await mapPipedriveContact(pipedriveContact, organizationMap, userId)
      
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
      contactsFailed++
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
  }
}

async function performIncrementalSync(pipedriveService: any, userId: string, sinceTimestamp: string) {
  // For now, we'll do a full sync since the Pipedrive service doesn't support incremental yet
  // In a real implementation, you would use the sinceTimestamp to fetch only changed contacts
  return await performFullSync(pipedriveService, userId)
}

async function performSearchSync(pipedriveService: any, userId: string, contactIds: string[]) {
  // For now, we'll do a full sync since the Pipedrive service doesn't support search sync yet
  // In a real implementation, you would fetch only the specified contacts
  return await performFullSync(pipedriveService, userId)
}

async function mapPipedriveContact(pipedriveContact: any, organizationMap: Map<string, any>, userId: string) {
  // Extract primary email
  const primaryEmail = pipedriveContact.email?.find(e => e.primary)?.value || 
                     pipedriveContact.email?.[0]?.value || null

  // Extract primary phone
  const primaryPhone = pipedriveContact.phone?.find(p => p.primary)?.value || 
                     pipedriveContact.phone?.[0]?.value || null

  // Safely parse the date
  let lastPipedriveUpdate: Date | null = null
  if (pipedriveContact.updated) {
    const parsedDate = new Date(pipedriveContact.updated)
    if (!isNaN(parsedDate.getTime())) {
      lastPipedriveUpdate = parsedDate
    }
  }

  // Get organization if contact has one
  const organization = pipedriveContact.org_id ? organizationMap.get(pipedriveContact.org_id.toString()) : null

  return {
    name: pipedriveContact.name,
    email: primaryEmail,
    phone: primaryPhone,
    organizationId: organization?.id || null,
    pipedrivePersonId: pipedriveContact.id.toString(),
    pipedriveOrgId: pipedriveContact.org_id ? pipedriveContact.org_id.toString() : null,
    lastPipedriveUpdate,
    userId,
  }
}

export async function GET(request: NextRequest) {
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
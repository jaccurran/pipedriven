import { NextRequest, NextResponse } from 'next/server'
import { ActivityService } from '@/server/services/activityService'
import { ActivityReplicationService } from '@/server/services/activityReplicationService'
import { createPipedriveService } from '@/server/services/pipedriveService'
import { getServerSession } from '@/lib/auth'
import { z } from 'zod'
import type { ActivityType } from '@prisma/client'

// Validation schemas
const createActivitySchema = z.object({
  type: z.enum(['EMAIL', 'CALL', 'MEETING', 'MEETING_REQUEST', 'LINKEDIN', 'REFERRAL', 'CONFERENCE']),
  subject: z.string().optional(),
  note: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional().refine((val) => {
    if (val === null || val === undefined) return true
    const date = new Date(val)
    return !isNaN(date.getTime())
  }, 'Invalid date format'),
  contactId: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
})

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as ActivityType | null
    const contactId = searchParams.get('contactId')
    const campaignId = searchParams.get('campaignId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')

    // Validate query parameters
    try {
      if (page && isNaN(Number(page))) {
        return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
      }
      if (limit && isNaN(Number(limit))) {
        return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }

    // Build filters
    const filters: {
      userId: string;
      page: number;
      limit: number;
      type?: ActivityType;
      contactId?: string;
      campaignId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {
      userId: session.user.id,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    }

    if (type) filters.type = type
    if (contactId) filters.contactId = contactId
    if (campaignId) filters.campaignId = campaignId
    if (dateFrom) filters.dateFrom = new Date(dateFrom)
    if (dateTo) filters.dateTo = new Date(dateTo)

    // Create service instance and get activities
    const activityService = new ActivityService()
    const result = await activityService.getActivities(filters)

    return NextResponse.json(result)
  } catch {
    console.error('Failed to fetch activities');
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Validate request data
    let validatedData
    try {
      validatedData = createActivitySchema.parse(body)
    } catch {
      console.error('Activity validation error')
      return NextResponse.json({ 
        error: 'Validation failed'
      }, { status: 400 })
    }

    // Create Pipedrive service and replication service
    const pipedriveService = await createPipedriveService(session.user.id)
    const replicationService = pipedriveService 
      ? new ActivityReplicationService(pipedriveService)
      : undefined

    // Create service instance with replication service and create activity
    const activityService = new ActivityService(replicationService)
    const activity = await activityService.createActivity({
      ...validatedData,
      note: validatedData.note ?? undefined,
      contactId: validatedData.contactId ?? undefined,
      campaignId: validatedData.campaignId ?? undefined,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
      userId: session.user.id,
    })

    return NextResponse.json(activity, { status: 201 })
  } catch {
    console.error('Failed to create activity');
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    );
  }
} 
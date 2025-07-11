import { NextRequest, NextResponse } from 'next/server'
import { ActivityService } from '@/server/services/activityService'
import { getServerSession } from '@/lib/auth'
import { z } from 'zod'
import type { ActivityType } from '@prisma/client'

// Validation schemas
const createActivitySchema = z.object({
  type: z.enum(['EMAIL', 'CALL', 'MEETING', 'LINKEDIN', 'REFERRAL', 'CONFERENCE']),
  subject: z.string().optional(),
  note: z.string().optional(),
  dueDate: z.string().refine((val) => {
    const date = new Date(val)
    return !isNaN(date.getTime())
  }, 'Invalid date format').optional(),
  contactId: z.string().optional(),
  campaignId: z.string().optional(),
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
    } catch (error) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }

    // Build filters
    const filters: any = {
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
  } catch (error) {
    console.error('Error in GET /api/activities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Validate request data
    let validatedData
    try {
      validatedData = createActivitySchema.parse(body)
    } catch (error) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    // Create service instance and create activity
    const activityService = new ActivityService()
    const activity = await activityService.createActivity({
      ...validatedData,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
      userId: session.user.id,
    })

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/activities:', error)
    
    // Handle specific error cases
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
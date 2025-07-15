import { NextRequest, NextResponse } from 'next/server'
import { ActivityService, UpdateActivityData } from '@/server/services/activityService'
import { getServerSession } from '@/lib/auth'
import { z } from 'zod'

// Validation schemas
const updateActivitySchema = z.object({
  type: z.enum(['EMAIL', 'CALL', 'MEETING', 'LINKEDIN', 'REFERRAL', 'CONFERENCE']).optional(),
  subject: z.string().optional(),
  note: z.string().optional(),
  dueDate: z.string().refine((val) => {
    const date = new Date(val)
    return !isNaN(date.getTime())
  }, 'Invalid date format').optional(),
  contactId: z.string().optional(),
  campaignId: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create service instance and get activity
    const { id } = await params
    const activityService = new ActivityService()
    const activity = await activityService.getActivityById(id)

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error in GET /api/activities/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      validatedData = updateActivitySchema.parse(body)
    } catch {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    // Transform date if provided
    if (validatedData.dueDate) {
      const dueDate = new Date(validatedData.dueDate)
      validatedData = { ...validatedData, dueDate }
    }

    // Create service instance and update activity
    const { id } = await params
    const activityService = new ActivityService()
    const activity = await activityService.updateActivity(id, validatedData as UpdateActivityData)

    return NextResponse.json(activity)
  } catch {
    console.error('Error in PUT /api/activities/[id]')
    
    // Handle specific error cases
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create service instance and delete activity
    const { id } = await params
    const activityService = new ActivityService()
    const activity = await activityService.deleteActivity(id)

    return NextResponse.json(activity)
  } catch {
    console.error('Error in DELETE /api/activities/[id]')
    
    // Handle specific error cases
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
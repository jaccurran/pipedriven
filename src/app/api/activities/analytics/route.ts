import { NextRequest, NextResponse } from 'next/server'
import { ActivityService } from '@/server/services/activityService'
import { getServerSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create service instance and get analytics
    const activityService = new ActivityService()
    const analytics = await activityService.getActivityAnalytics({ userId: session.user.id })

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error in GET /api/activities/analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
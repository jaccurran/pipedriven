import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { authOptions } from '@/lib/auth'
import { createPipedriveService } from '@/server/services/pipedriveService'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
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

    // Get user's activities that haven't been synced yet
    const activities = await prisma.activity.findMany({
      where: { 
        userId: session.user.id,
        pipedriveActivityId: null, // Only sync activities not already in Pipedrive
      },
      include: {
        contact: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (activities.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No activities to sync',
        synced: 0,
        failed: 0,
      })
    }

    // Sync each activity
    const results = await Promise.allSettled(
      activities.map(async (activity) => {
        const result = await pipedriveService.createActivity(activity)
        
        // If successful, update the activity with Pipedrive ID
        if (result.success && result.activityId) {
          await prisma.activity.update({
            where: { id: activity.id },
            data: { pipedriveActivityId: result.activityId.toString() },
          })
        }
        
        return result
      })
    )

    const synced = results.filter(
      result => result.status === 'fulfilled' && result.value.success
    ).length

    const failed = results.length - synced

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} activities to Pipedrive`,
      synced,
      failed,
      total: activities.length,
    })
  } catch (error) {
    console.error('Error syncing activities with Pipedrive:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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

    // Get user's activities with sync status
    const activities = await prisma.activity.findMany({
      where: { userId: session.user.id },
      include: {
        contact: {
          select: {
            name: true,
            email: true,
            pipedrivePersonId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const syncedActivities = activities.filter(a => a.pipedriveActivityId)
    const unsyncedActivities = activities.filter(a => !a.pipedriveActivityId)

    return NextResponse.json({
      success: true,
      activities: {
        total: activities.length,
        synced: syncedActivities.length,
        unsynced: unsyncedActivities.length,
        list: activities.map(activity => ({
          id: activity.id,
          type: activity.type,
          subject: activity.subject,
          dueDate: activity.dueDate,
          synced: !!activity.pipedriveActivityId,
          pipedriveActivityId: activity.pipedriveActivityId,
          contact: activity.contact ? {
            name: activity.contact.name,
            email: activity.contact.email,
            pipedrivePersonId: activity.contact.pipedrivePersonId,
          } : null,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching activities sync status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
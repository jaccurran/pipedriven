import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get recent activities for the user
    const recentActivities = await prisma.activity.findMany({
      where: {
        userId
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        campaign: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    return NextResponse.json({
      activities: recentActivities.map(activity => ({
        id: activity.id,
        type: activity.type,
        subject: activity.subject,
        note: activity.note,
        dueDate: activity.dueDate,
        createdAt: activity.createdAt,
        contact: activity.contact,
        campaign: activity.campaign,
      }))
    })
  } catch (error) {
    console.error('Recent activities error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent activities' },
      { status: 500 }
    )
  }
} 
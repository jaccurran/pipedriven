import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get statistics for the user
    const [
      totalCampaigns,
      totalContacts,
      totalActivities,
      activeCampaigns,
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.contact.count({
        where: {
          userId
        }
      }),
      prisma.activity.count({
        where: {
          userId
        }
      }),
      prisma.campaign.count({
        where: {
          endDate: {
            gte: new Date()
          }
        }
      }),
    ])

    return NextResponse.json({
      totalCampaigns,
      totalContacts,
      totalActivities,
      activeCampaigns,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
} 
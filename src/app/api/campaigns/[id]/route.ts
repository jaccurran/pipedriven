import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CampaignService } from '@/server/services/campaignService'

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

    const { id: campaignId } = await params

    // Get campaign with contacts
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        contacts: true,
        users: true,
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Check if user has access to this campaign
    const hasAccess = campaign.users.some(user => user.id === session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(campaign)
  } catch (error) {
    console.error('Error in GET /api/campaigns/[id]:', error)
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

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      )
    }

    // Validate and parse dates
    const updateData: {
      name?: string;
      description?: string;
      sector?: string;
      theme?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      targetLeads?: number;
      budget?: number;
    } = {}

    if (body.name !== undefined) {
      updateData.name = body.name.trim()
    }

    if (body.description !== undefined) {
      updateData.description = body.description
    }

    if (body.sector !== undefined) {
      updateData.sector = body.sector
    }

    if (body.theme !== undefined) {
      updateData.theme = body.theme
    }

    if (body.startDate !== undefined) {
      const startDate = new Date(body.startDate)
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        )
      }
      updateData.startDate = startDate
    }

    if (body.endDate !== undefined) {
      const endDate = new Date(body.endDate)
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        )
      }
      updateData.endDate = endDate
    }

    try {
      const { id } = await params
      const campaignService = new CampaignService()
      const campaign = await campaignService.updateCampaign(id, updateData)
      return NextResponse.json(campaign)
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        )
      }
      throw error
    }
  } catch (error) {
    console.error('Failed to update campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
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

    try {
      const { id } = await params
      const campaignService = new CampaignService()
      await campaignService.deleteCampaign(id)
      return NextResponse.json({ message: 'Campaign deleted successfully' })
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        )
      }
      throw error
    }
  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    )
  }
} 
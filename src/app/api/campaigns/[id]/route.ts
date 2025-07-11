import { NextRequest, NextResponse } from 'next/server'
import { CampaignService } from '@/server/services/campaignService'
import { getServerSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignService = new CampaignService()
    const campaign = await campaignService.getCampaignById(params.id)
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(campaign)
  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const updateData: any = {}

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
      const campaignService = new CampaignService()
      const campaign = await campaignService.updateCampaign(params.id, updateData)
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
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    try {
      const campaignService = new CampaignService()
      await campaignService.deleteCampaign(params.id)
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
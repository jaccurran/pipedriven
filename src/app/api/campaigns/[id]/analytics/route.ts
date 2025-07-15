import { NextRequest, NextResponse } from 'next/server'
import { CampaignService } from '@/server/services/campaignService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    try {
      const { id } = await params
      const campaignService = new CampaignService()
      const analytics = await campaignService.getCampaignAnalytics(id)
      return NextResponse.json(analytics)
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
    console.error('Error fetching campaign analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign analytics' },
      { status: 500 }
    )
  }
} 
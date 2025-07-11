import { NextRequest, NextResponse } from 'next/server'
import { CampaignService } from '@/server/services/campaignService'
import { getServerSession } from '@/lib/auth'

function validateContactIds(body: any): { isValid: boolean; error?: string } {
  if (!body.contactIds) {
    return { isValid: false, error: 'contactIds is required' }
  }

  if (!Array.isArray(body.contactIds)) {
    return { isValid: false, error: 'contactIds must be an array' }
  }

  if (body.contactIds.length === 0) {
    return { isValid: false, error: 'contactIds array cannot be empty' }
  }

  if (!body.contactIds.every((id: any) => typeof id === 'string')) {
    return { isValid: false, error: 'All contactIds must be strings' }
  }

  return { isValid: true }
}

export async function POST(
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

    // Validate contactIds
    const validation = validateContactIds(body)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    try {
      const campaignService = new CampaignService()
      const result = await campaignService.assignContactsToCampaign(params.id, body.contactIds)
      return NextResponse.json(result)
    } catch (error) {
      if (error instanceof Error && error.message === 'Some contacts not found') {
        return NextResponse.json(
          { error: 'Some contacts not found' },
          { status: 400 }
        )
      }
      throw error
    }
  } catch (error) {
    console.error('Error assigning contacts to campaign:', error)
    return NextResponse.json(
      { error: 'Failed to assign contacts to campaign' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Validate contactIds
    const validation = validateContactIds(body)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const campaignService = new CampaignService()
    const result = await campaignService.removeContactsFromCampaign(params.id, body.contactIds)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error removing contacts from campaign:', error)
    return NextResponse.json(
      { error: 'Failed to remove contacts from campaign' },
      { status: 500 }
    )
  }
} 
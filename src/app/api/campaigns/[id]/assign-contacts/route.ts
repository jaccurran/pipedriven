import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const assignContactsSchema = z.object({
  contactIds: z.array(z.string()),
})

export async function POST(
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
      validatedData = assignContactsSchema.parse(body)
    } catch {
      console.error('Validation error in POST /api/campaigns/[id]/assign-contacts')
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const { id: campaignId } = await params

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Add contacts to campaign
    const result = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        contacts: {
          connect: validatedData.contactIds.map(contactId => ({ id: contactId })),
        },
      },
      include: {
        contacts: true,
      },
    })

    return NextResponse.json(result, { status: 200 })
  } catch {
    console.error('Error in POST /api/campaigns/[id]/assign-contacts')
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
      validatedData = assignContactsSchema.parse(body)
    } catch {
      console.error('Validation error in DELETE /api/campaigns/[id]/assign-contacts')
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const { id: campaignId } = await params

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Remove contacts from campaign
    const result = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        contacts: {
          disconnect: validatedData.contactIds.map(contactId => ({ id: contactId })),
        },
      },
      include: {
        contacts: true,
      },
    })

    return NextResponse.json(result, { status: 200 })
  } catch {
    console.error('Error in DELETE /api/campaigns/[id]/assign-contacts')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
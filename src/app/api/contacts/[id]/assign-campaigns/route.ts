import { NextRequest, NextResponse } from 'next/server'
import { ContactService } from '@/server/services/contactService'
import { getServerSession } from '@/lib/auth'
import { z } from 'zod'

// Validation schema
const assignCampaignsSchema = z.object({
  action: z.enum(['assign', 'remove'], {
    errorMap: () => ({ message: 'Invalid action. Must be "assign" or "remove"' }),
  }),
  campaignIds: z.array(z.string(), {
    errorMap: () => ({ message: 'Campaign IDs must be an array' }),
  }).min(1, 'Campaign IDs array cannot be empty'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Validate request data
    let validatedData
    try {
      validatedData = assignCampaignsSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0]
        return NextResponse.json({ error: firstError.message }, { status: 400 })
      }
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    // Create service instance and perform action
    const contactService = new ContactService()
    let contact

    if (validatedData.action === 'assign') {
      contact = await contactService.assignContactToCampaigns(params.id, validatedData.campaignIds)
    } else {
      contact = await contactService.removeContactFromCampaigns(params.id, validatedData.campaignIds)
    }

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error in POST /api/contacts/[id]/assign-campaigns:', error)
    
    // Handle specific error cases
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
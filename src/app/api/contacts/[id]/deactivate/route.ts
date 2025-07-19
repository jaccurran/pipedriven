import { NextRequest, NextResponse } from 'next/server'
import { ContactService } from '@/server/services/contactService'
import { getServerSession } from '@/lib/auth'
import { z } from 'zod'

// Validation schema for deactivate request
const deactivateContactSchema = z.object({
  reason: z.string().optional(),
  removeFromSystem: z.boolean().optional().default(false),
  syncToPipedrive: z.boolean().optional().default(true),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 2. Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    let validatedData
    try {
      validatedData = deactivateContactSchema.parse(body)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      )
    }

    // 3. Get contact ID from params
    const { id: contactId } = await params

    // 4. Create service instance and deactivate contact
    const contactService = new ContactService()
    const result = await contactService.deactivateContact(
      contactId,
      session.user.id,
      validatedData
    )

    // 5. Return appropriate response
    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      // Determine appropriate status code based on error
      let statusCode = 500
      if (result.error?.includes('not found')) {
        statusCode = 404
      } else if (result.error?.includes('already inactive')) {
        statusCode = 400
      } else if (result.error?.includes('pending activities')) {
        statusCode = 400
      }

      return NextResponse.json(result, { status: statusCode })
    }
  } catch {
    console.error('Error in POST /api/contacts/[id]/deactivate')
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
} 
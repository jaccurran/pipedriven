import { NextRequest, NextResponse } from 'next/server'
import { ContactService } from '@/server/services/contactService'
import { getServerSession } from '@/lib/auth'
import { z } from 'zod'

// Validation schemas
const updateContactSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  organisation: z.string().optional().or(z.literal('')),
  warmnessScore: z.number().min(0).max(10).optional(),
  lastContacted: z.string().datetime().optional().or(z.literal('')),
  addedToCampaign: z.boolean().optional(),
  pipedrivePersonId: z.string().optional().or(z.literal('')),
  pipedriveOrgId: z.string().optional().or(z.literal('')),
})

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

    // Create service instance and get contact
    const { id } = await params
    const contactService = new ContactService()
    const contact = await contactService.getContactById(id)

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json(contact)
  } catch {
    console.error('Error in GET /api/contacts/[id]')
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

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Validate update data
    let validatedData
    try {
      validatedData = updateContactSchema.parse(body)
    } catch {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    // Clean up empty strings
    const cleanData = Object.fromEntries(
      Object.entries(validatedData).map(([key, value]) => [
        key,
        value === '' ? undefined : value,
      ])
    )

    // Create service instance and update contact
    const { id } = await params
    const contactService = new ContactService()
    const contact = await contactService.updateContact(id, cleanData)

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error in PUT /api/contacts/[id]:', error)
    
    // Handle specific error cases
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

    // Create service instance and delete contact
    const { id } = await params
    const contactService = new ContactService()
    await contactService.deleteContact(id)

    return NextResponse.json({ message: 'Contact deleted successfully' })
  } catch {
    console.error('Error in DELETE /api/contacts/[id]')
    
    // Handle specific error cases
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
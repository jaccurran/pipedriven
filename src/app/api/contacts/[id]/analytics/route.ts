import { NextRequest, NextResponse } from 'next/server'
import { ContactService } from '@/server/services/contactService'
import { getServerSession } from '@/lib/auth'

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

    // Create service instance and get contact analytics
    const { id } = await params
    const contactService = new ContactService()
    const analytics = await contactService.getContactAnalytics(id)

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error in GET /api/contacts/[id]/analytics:', error)
    
    // Handle specific error cases
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
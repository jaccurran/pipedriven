import { NextRequest, NextResponse } from 'next/server'
import { ContactService } from '@/server/services/contactService'
import { getServerSession } from '@/lib/auth'

import { z } from 'zod'

// Validation schemas
const createContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  organisation: z.string().optional().or(z.literal('')),
  warmnessScore: z.number().min(0).max(10).optional(),
  lastContacted: z.string().datetime().optional().or(z.literal('')).or(z.date()),
  addedToCampaign: z.boolean().optional(),
  pipedrivePersonId: z.string().optional().or(z.literal('')),
  pipedriveOrgId: z.string().optional().or(z.literal('')),
})

const queryParamsSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  q: z.string().optional(), // Search query
  filter: z.string().optional(), // Filter by status/source
  sort: z.enum(['name', 'createdAt', 'warmnessScore', 'lastContacted']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  country: z.string().optional(), // Filter by organization country
  sector: z.string().optional(), // Filter by organization industry/sector
  name: z.string().optional(),
  email: z.string().optional(),
  organisation: z.string().optional(),
  minWarmnessScore: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0).max(10)).optional(),
  maxWarmnessScore: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0).max(10)).optional(),
  campaignId: z.string().optional(),
  addedToCampaign: z.string().transform(val => val === 'true').optional(),
})

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    
    let validatedParams
    try {
      validatedParams = queryParamsSchema.parse(queryParams)
    } catch {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }

    // Create service instance and get contacts
    const contactService = new ContactService()
    
    // Map query parameters to service options
    const serviceOptions = {
      page: validatedParams.page || 1,
      limit: validatedParams.limit || 20,
      userId: session.user.id,
      // Use search query if provided
      query: validatedParams.q,
      // Map filter to appropriate service parameters
      ...(validatedParams.filter && {
        addedToCampaign: validatedParams.filter === 'campaign' ? true : undefined,
        // Add more filter mappings as needed
      }),
      // Add sorting if provided
      sortBy: validatedParams.sort,
      sortOrder: validatedParams.order,
      // Add organization filters
      country: validatedParams.country,
      sector: validatedParams.sector,
    }

    const result = await contactService.getContacts(serviceOptions)

    return NextResponse.json(result)
  } catch {
    console.error('Error in GET /api/contacts')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
      console.log('Contact creation request body:', body)
    } catch (error) {
      console.error('Failed to parse request body:', error)
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Validate required fields
    if (!body.name) {
      console.error('Missing required field: name')
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Validate contact data
    let validatedData
    try {
      validatedData = createContactSchema.parse(body)
      console.log('Validated contact data:', validatedData)
    } catch (error) {
      console.error('Contact validation failed:', error)
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    // Clean up empty strings
    const cleanData = Object.fromEntries(
      Object.entries(validatedData).map(([key, value]) => [
        key,
        value === '' ? undefined : value,
      ])
    )

    console.log('Clean contact data:', cleanData)

    // If this is a Pipedrive contact, we'll let the sync process handle last contacted calculation
    // For manual contact creation, we'll use the provided lastContacted or set to null
    let lastContacted: Date | undefined = undefined
    if (cleanData.pipedrivePersonId && typeof cleanData.pipedrivePersonId === 'string') {
      // For manual contact creation, we'll use the provided lastContacted value
      // The accurate calculation will happen during the next sync when we have all the data
      if (cleanData.lastContacted) {
        lastContacted = new Date(cleanData.lastContacted as string | number | Date)
        console.log('Using provided last contacted date:', lastContacted)
      } else {
        console.log('No last contacted date provided, will be calculated during next sync')
      }
    }

    // Create service instance and create contact
    const contactService = new ContactService()
    const contact = await contactService.createContact({
      name: cleanData.name as string,
      ...cleanData,
      lastContacted,
      userId: session.user.id,
    })

    console.log('Created contact:', contact)
    return NextResponse.json(contact, { status: 201 })
  } catch {
    console.error('Error in POST /api/contacts')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
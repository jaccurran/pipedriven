import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { CampaignService } from '@/server/services/campaignService'
import { ShortcodeService } from '@/server/services/shortcodeService'
import { z } from 'zod'

const campaignSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).min(1, 'Name is required').max(255, 'Campaign name must be less than 255 characters'),
  description: z.string().optional(),
  sector: z.string().optional(),
  theme: z.string().optional(),
  status: z.enum(['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  targetLeads: z.number().min(0, 'Target leads must be a positive number').optional(),
  budget: z.number().min(0, 'Budget must be a positive number').optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const validation = campaignSchema.safeParse(body)
    if (!validation.success) {
      const firstError = validation.error.errors[0]
      return NextResponse.json(
        { error: firstError?.message || 'Invalid request data' },
        { status: 400 }
      )
    }
    const {
      name,
      description,
      sector,
      theme,
      status = 'PLANNED',
      startDate,
      endDate,
      targetLeads,
      budget,
    } = validation.data
    let parsedStartDate: Date | undefined
    let parsedEndDate: Date | undefined
    if (startDate) {
      if (isNaN(Date.parse(startDate))) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }
      parsedStartDate = new Date(startDate)
    }
    if (endDate) {
      if (isNaN(Date.parse(endDate))) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }
      parsedEndDate = new Date(endDate)
    }
    if (parsedStartDate && parsedEndDate && parsedEndDate <= parsedStartDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }
    const campaignService = new CampaignService()
    const shortcodeService = new ShortcodeService()
    try {
      // Generate shortcode for the campaign
      const shortcode = await shortcodeService.generateShortcode(name)
      
      // Only pass defined fields
      const createData: {
        name: string;
        status: 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
        description?: string;
        sector?: string;
        theme?: string;
        targetLeads?: number;
        budget?: number;
        startDate?: Date;
        endDate?: Date;
        shortcode: string;
      } = { 
        name, 
        status: status as 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED',
        shortcode
      }
      if (description !== undefined) createData.description = description
      if (sector !== undefined) createData.sector = sector
      if (theme !== undefined) createData.theme = theme
      if (targetLeads !== undefined) createData.targetLeads = targetLeads
      if (budget !== undefined) createData.budget = budget
      if (parsedStartDate) createData.startDate = parsedStartDate
      if (parsedEndDate) createData.endDate = parsedEndDate
      const campaign = await campaignService.createCampaign(createData)
      return NextResponse.json(campaign, { status: 201 })
    } catch {
      return NextResponse.json(
        { error: 'Failed to create campaign' },
        { status: 500 }
      )
    }
  } catch {
    console.error('Failed to create campaign');
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const sector = searchParams.get('sector')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }
    let parsedStartDate: Date | undefined
    let parsedEndDate: Date | undefined
    if (startDate) {
      if (isNaN(Date.parse(startDate))) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }
      parsedStartDate = new Date(startDate)
    }
    if (endDate) {
      if (isNaN(Date.parse(endDate))) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }
      parsedEndDate = new Date(endDate)
    }
    const campaignService = new CampaignService()
    try {
      // Only pass defined fields
      const getOptions: {
        page?: number;
        limit?: number;
        sector?: string;
        startDate?: Date;
        endDate?: Date;
      } = {}
      if (typeof page === 'number') getOptions.page = page
      if (typeof limit === 'number') getOptions.limit = limit
      if (sector) getOptions.sector = sector
      if (parsedStartDate) getOptions.startDate = parsedStartDate
      if (parsedEndDate) getOptions.endDate = parsedEndDate
      const result = await campaignService.getCampaigns(getOptions)
      return NextResponse.json(result)
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      )
    }
  } catch {
    console.error('Failed to fetch campaigns');
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
} 
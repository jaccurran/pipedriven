import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WarmLeadService } from '@/server/services/warmLeadService';
import { PipedriveService } from '@/server/services/pipedriveService';
import { PipedriveUserService } from '@/server/services/pipedriveUserService';
import { PipedriveLabelService } from '@/server/services/pipedriveLabelService';
import { PipedriveOrganizationService } from '@/server/services/pipedriveOrganizationService';
import { decryptApiKey } from '@/lib/apiKeyEncryption';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: contactId } = await params;

    // Get contact with warmness score
    const contact = await prisma.contact.findUnique({
      where: { id: contactId, userId: session.user.id }
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Get user with Pipedrive API key
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user?.pipedriveApiKey) {
      return NextResponse.json(
        { error: 'Pipedrive API key not configured' },
        { status: 400 }
      );
    }

    // Decrypt and create Pipedrive service
    const apiKey = await decryptApiKey(user.pipedriveApiKey);
    const pipedriveService = new PipedriveService(apiKey);
    
    // Initialize all required services
    const userService = new PipedriveUserService(pipedriveService);
    const labelService = new PipedriveLabelService(pipedriveService);
    const orgService = new PipedriveOrganizationService(pipedriveService);
    
    const warmLeadService = new WarmLeadService(
      pipedriveService,
      userService,
      labelService,
      orgService
    );

    // Check and create warm lead
    const isWarmLead = await warmLeadService.checkAndCreateWarmLead({
      contactId,
      userId: session.user.id,
      warmnessScore: contact.warmnessScore
    });

    if (isWarmLead) {
      return NextResponse.json({
        success: true,
        isWarmLead: true,
        pipedrivePersonId: contact.pipedrivePersonId
      });
    } else {
      return NextResponse.json({
        success: true,
        isWarmLead: false
      });
    }
  } catch (error) {
    console.error('Error checking warm lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
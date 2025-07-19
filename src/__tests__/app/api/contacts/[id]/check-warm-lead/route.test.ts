import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/contacts/[id]/check-warm-lead/route';
import { prisma } from '@/lib/prisma';
import { WarmLeadService } from '@/server/services/warmLeadService';
import { getServerSession } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn()
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findUnique: vi.fn()
    }
  }
}));
vi.mock('@/server/services/warmLeadService');
vi.mock('@/server/services/pipedriveService');
vi.mock('@/server/services/pipedriveUserService');
vi.mock('@/server/services/pipedriveLabelService');
vi.mock('@/server/services/pipedriveOrganizationService');

const mockSession = { user: { id: 'user-123' } };
const mockContact = {
  id: 'contact-123',
  name: 'John Doe',
  warmnessScore: 5,
  pipedrivePersonId: null
};

const mockGetServerSession = vi.mocked(getServerSession);
const mockPrismaContact = vi.mocked(prisma.contact);

// Mock the WarmLeadService instance method
WarmLeadService.prototype.checkAndCreateWarmLead = vi.fn();

describe('/api/contacts/[id]/check-warm-lead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);
    mockPrismaContact.findUnique.mockResolvedValue(mockContact as any);
  });

  it('should check and create warm lead', async () => {
    vi.mocked(WarmLeadService.prototype.checkAndCreateWarmLead).mockResolvedValue(true);

    const request = new NextRequest('http://localhost:3000/api/contacts/contact-123/check-warm-lead', {
      method: 'POST'
    });

    const response = await POST(request, { params: { id: 'contact-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      isWarmLead: true,
      pipedrivePersonId: null
    });
  });

  it('should return false for non-warm leads', async () => {
    vi.mocked(WarmLeadService.prototype.checkAndCreateWarmLead).mockResolvedValue(false);

    const request = new NextRequest('http://localhost:3000/api/contacts/contact-123/check-warm-lead', {
      method: 'POST'
    });

    const response = await POST(request, { params: { id: 'contact-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      isWarmLead: false
    });
  });

  it('should return 401 if not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);
    
    const request = new NextRequest('http://localhost:3000/api/contacts/contact-123/check-warm-lead', {
      method: 'POST'
    });

    const response = await POST(request, { params: { id: 'contact-123' } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('should return 404 if contact not found', async () => {
    mockPrismaContact.findUnique.mockResolvedValue(null);
    
    const request = new NextRequest('http://localhost:3000/api/contacts/contact-123/check-warm-lead', {
      method: 'POST'
    });

    const response = await POST(request, { params: { id: 'contact-123' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Contact not found' });
  });
}); 
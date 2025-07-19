import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/pipedrive/batch-update/route';
import { getServerSession } from '@/lib/auth';
import { PipedriveUpdateService } from '@/server/services/pipedriveUpdateService';

vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn()
}));

vi.mock('@/server/services/pipedriveUpdateService');
vi.mock('@/server/services/pipedriveService', () => ({
  createPipedriveService: vi.fn()
}));

const mockSession = { user: { id: 'user-123' } };
const mockGetServerSession = vi.mocked(getServerSession);

// Import the mocked function
import { createPipedriveService } from '@/server/services/pipedriveService';
const mockCreatePipedriveService = vi.mocked(createPipedriveService);

describe('/api/pipedrive/batch-update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);
    
    // Mock the Pipedrive service creation
    mockCreatePipedriveService.mockResolvedValue({
      updatePerson: vi.fn(),
      updateActivity: vi.fn(),
      updateOrganization: vi.fn(),
      updateDeal: vi.fn()
    } as any);
  });

  it('should process batch updates successfully', async () => {
    const updates = [
      { recordType: 'activity', recordId: 'act-1', data: { subject: 'Update 1' } },
      { recordType: 'person', recordId: 'person-1', data: { name: 'Update 2' } }
    ];

    vi.mocked(PipedriveUpdateService.prototype.batchUpdate).mockResolvedValue({
      success: true,
      results: [
        { success: true, recordId: 'act-1', timestamp: new Date(), retryCount: 0 },
        { success: true, recordId: 'person-1', timestamp: new Date(), retryCount: 0 }
      ],
      summary: {
        total: 2,
        successful: 2,
        failed: 0,
        errors: []
      }
    });

    const request = new NextRequest('http://localhost:3000/api/pipedrive/batch-update', {
      method: 'POST',
      body: JSON.stringify({ updates })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      summary: {
        total: 2,
        successful: 2,
        failed: 0,
        errors: []
      }
    });
  });

  it('should handle partial failures in batch', async () => {
    const updates = [
      { recordType: 'activity', recordId: 'act-1', data: { subject: 'Update 1' } },
      { recordType: 'person', recordId: 'person-1', data: { name: 'Update 2' } }
    ];

    vi.mocked(PipedriveUpdateService.prototype.batchUpdate).mockResolvedValue({
      success: false,
      results: [
        { success: true, recordId: 'act-1', timestamp: new Date(), retryCount: 0 },
        { success: false, error: 'API Error', timestamp: new Date(), retryCount: 3 }
      ],
      summary: {
        total: 2,
        successful: 1,
        failed: 1,
        errors: ['API Error']
      }
    });

    const request = new NextRequest('http://localhost:3000/api/pipedrive/batch-update', {
      method: 'POST',
      body: JSON.stringify({ updates })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(207); // Multi-Status
    expect(data).toEqual({
      success: false,
      summary: {
        total: 2,
        successful: 1,
        failed: 1,
        errors: ['API Error']
      }
    });
  });

  it('should return 401 if not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/pipedrive/batch-update', {
      method: 'POST',
      body: JSON.stringify({ updates: [] })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('should return 400 if Pipedrive not configured', async () => {
    // Mock the createPipedriveService to return null (not configured)
    mockCreatePipedriveService.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/pipedrive/batch-update', {
      method: 'POST',
      body: JSON.stringify({ updates: [{ recordType: 'activity', recordId: 'act-1', data: {} }] })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Pipedrive not configured' });
  });

  it('should validate request body structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/pipedrive/batch-update', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid request body: updates array is required' });
  });

  it('should handle empty updates array', async () => {
    const request = new NextRequest('http://localhost:3000/api/pipedrive/batch-update', {
      method: 'POST',
      body: JSON.stringify({ updates: [] })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'At least one update is required' });
  });

  it('should handle internal server errors', async () => {
    vi.mocked(PipedriveUpdateService.prototype.batchUpdate).mockRejectedValue(
      new Error('Internal error')
    );

    const request = new NextRequest('http://localhost:3000/api/pipedrive/batch-update', {
      method: 'POST',
      body: JSON.stringify({ updates: [{ recordType: 'activity', recordId: 'act-1', data: {} }] })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });
}); 
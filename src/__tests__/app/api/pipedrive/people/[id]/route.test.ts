import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PUT } from '@/app/api/pipedrive/people/[id]/route';
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

describe('/api/pipedrive/people/[id]', () => {
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

  it('should update person in Pipedrive successfully', async () => {
    const updateData = {
      name: 'Updated Name',
      email: ['updated@example.com']
    };

    vi.mocked(PipedriveUpdateService.prototype.updatePerson).mockResolvedValue({
      success: true,
      recordId: 'person-123',
      timestamp: new Date(),
      retryCount: 0
    });

    const request = new NextRequest('http://localhost:3000/api/pipedrive/people/person-123', {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });

    const response = await PUT(request, { params: { id: 'person-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      recordId: 'person-123'
    });
  });

  it('should handle update conflicts', async () => {
    const updateData = { name: 'Updated Name' };

    vi.mocked(PipedriveUpdateService.prototype.updatePerson).mockResolvedValue({
      success: false,
      error: 'Conflict: Record modified by another user',
      timestamp: new Date(),
      retryCount: 3
    });

    const request = new NextRequest('http://localhost:3000/api/pipedrive/people/person-123', {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });

    const response = await PUT(request, { params: { id: 'person-123' } });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('Conflict');
  });

  it('should return 401 if not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/pipedrive/people/person-123', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Name' })
    });

    const response = await PUT(request, { params: { id: 'person-123' } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('should return 400 if Pipedrive not configured', async () => {
    // Mock the createPipedriveService to return null (not configured)
    mockCreatePipedriveService.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/pipedrive/people/person-123', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Name' })
    });

    const response = await PUT(request, { params: { id: 'person-123' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Pipedrive not configured' });
  });

  it('should handle internal server errors', async () => {
    vi.mocked(PipedriveUpdateService.prototype.updatePerson).mockRejectedValue(
      new Error('Internal error')
    );

    const request = new NextRequest('http://localhost:3000/api/pipedrive/people/person-123', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Name' })
    });

    const response = await PUT(request, { params: { id: 'person-123' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });
}); 
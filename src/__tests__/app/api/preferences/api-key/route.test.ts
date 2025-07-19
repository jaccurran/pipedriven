import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PUT, POST } from '@/app/api/preferences/api-key/route';
import { UserPreferencesService } from '@/server/services/userPreferencesService';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/server/services/userPreferencesService');
vi.mock('next-auth');
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

describe('API Key Management Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PUT /api/preferences/api-key', () => {
    it('should update API key successfully when authenticated', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const apiKeyData = {
        apiKey: 'api_test123456789',
      };

      (getServerSession as any).mockResolvedValue(mockSession);
      (UserPreferencesService.updateApiKey as any).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/preferences/api-key', {
        method: 'PUT',
        body: JSON.stringify(apiKeyData),
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      expect(UserPreferencesService.updateApiKey).toHaveBeenCalledWith(
        'user-123',
        apiKeyData.apiKey
      );
    });

    it('should return 401 when not authenticated', async () => {
      (getServerSession as any).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/preferences/api-key', {
        method: 'PUT',
        body: JSON.stringify({ apiKey: 'api_test123456789' }),
      });

      const response = await PUT(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 when request body is invalid', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      (getServerSession as any).mockResolvedValue(mockSession);

      const invalidData = {
        apiKey: 'invalid-key',
      };

      const request = new NextRequest('http://localhost:3000/api/preferences/api-key', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
      });

      const response = await PUT(request);

      expect(response.status).toBe(400);
    });

    it('should return 500 when service throws error', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const apiKeyData = {
        apiKey: 'api_test123456789',
      };

      (getServerSession as any).mockResolvedValue(mockSession);
      (UserPreferencesService.updateApiKey as any).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3000/api/preferences/api-key', {
        method: 'PUT',
        body: JSON.stringify(apiKeyData),
      });

      const response = await PUT(request);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/preferences/api-key/test', () => {
    it('should test API key successfully when authenticated', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const apiKeyData = {
        apiKey: 'api_test123456789',
      };

      (getServerSession as any).mockResolvedValue(mockSession);
      (UserPreferencesService.testApiKey as any).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/preferences/api-key/test', {
        method: 'POST',
        body: JSON.stringify(apiKeyData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
      expect(UserPreferencesService.testApiKey).toHaveBeenCalledWith(apiKeyData.apiKey);
    });

    it('should return false for invalid API key', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const apiKeyData = {
        apiKey: 'api_invalid123',
      };

      (getServerSession as any).mockResolvedValue(mockSession);
      (UserPreferencesService.testApiKey as any).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/preferences/api-key/test', {
        method: 'POST',
        body: JSON.stringify(apiKeyData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(false);
    });

    it('should return 401 when not authenticated', async () => {
      (getServerSession as any).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/preferences/api-key/test', {
        method: 'POST',
        body: JSON.stringify({ apiKey: 'api_test123456789' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 when request body is invalid', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      (getServerSession as any).mockResolvedValue(mockSession);

      const invalidData = {
        apiKey: 'invalid-key',
      };

      const request = new NextRequest('http://localhost:3000/api/preferences/api-key/test', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 500 when service throws error', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const apiKeyData = {
        apiKey: 'api_test123456789',
      };

      (getServerSession as any).mockResolvedValue(mockSession);
      (UserPreferencesService.testApiKey as any).mockRejectedValue(
        new Error('Network error')
      );

      const request = new NextRequest('http://localhost:3000/api/preferences/api-key/test', {
        method: 'POST',
        body: JSON.stringify(apiKeyData),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });
}); 
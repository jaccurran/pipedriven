import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PipedriveUserService } from '@/server/services/pipedriveUserService';
import { PipedriveUser } from '@/types/pipedrive';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: vi.fn(),
      findUnique: vi.fn()
    }
  }
}));

describe('PipedriveUserService', () => {
  let service: PipedriveUserService;
  let mockPipedriveService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPipedriveService = {
      makeApiRequest: vi.fn()
    };
    service = new PipedriveUserService(mockPipedriveService);
  });

  describe('findUserByEmail', () => {
    it('should find Pipedrive user by email', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: {
            id: 123,
            name: 'John Doe',
            email: 'john@example.com'
          }
        }
      };
      
      mockPipedriveService.makeApiRequest.mockResolvedValue(mockResponse);

      const result = await service.findUserByEmail('john@example.com');

      expect(result).toEqual({
        id: 123,
        name: 'John Doe',
        email: 'john@example.com'
      });
      expect(mockPipedriveService.makeApiRequest).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          method: 'GET',
          params: { email: 'john@example.com' }
        })
      );
    });

    it('should return null when user not found', async () => {
      mockPipedriveService.makeApiRequest.mockResolvedValue({
        success: false,
        error: 'User not found'
      });

      const result = await service.findUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should return null when API response has no data', async () => {
      mockPipedriveService.makeApiRequest.mockResolvedValue({
        success: true,
        data: { data: null }
      });

      const result = await service.findUserByEmail('test@example.com');

      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      mockPipedriveService.makeApiRequest.mockRejectedValue(
        new Error('API Error')
      );

      const result = await service.findUserByEmail('test@example.com');

      expect(result).toBeNull();
    });
  });

  describe('storeUserPipedriveId', () => {
    it('should store Pipedrive user ID in database', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ 
        id: 'user-123', 
        pipedriveUserId: 456 
      });
      vi.mocked(prisma.user.update).mockImplementation(mockUpdate);

      await service.storeUserPipedriveId('user-123', 456);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { pipedriveUserId: 456 }
      });
    });

    it('should handle database update errors', async () => {
      const mockUpdate = vi.fn().mockRejectedValue(new Error('Database Error'));
      vi.mocked(prisma.user.update).mockImplementation(mockUpdate);

      await expect(
        service.storeUserPipedriveId('user-123', 456)
      ).rejects.toThrow('Database Error');
    });
  });

  describe('integration scenarios', () => {
    it('should find and store user Pipedrive ID', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: {
            id: 789,
            name: 'Jane Smith',
            email: 'jane@example.com'
          }
        }
      };
      
      const mockUpdate = vi.fn().mockResolvedValue({ 
        id: 'user-456', 
        pipedriveUserId: 789 
      });

      mockPipedriveService.makeApiRequest.mockResolvedValue(mockResponse);
      vi.mocked(prisma.user.update).mockImplementation(mockUpdate);

      // Find user
      const user = await service.findUserByEmail('jane@example.com');
      expect(user).toEqual({
        id: 789,
        name: 'Jane Smith',
        email: 'jane@example.com'
      });

      // Store user ID
      await service.storeUserPipedriveId('user-456', user!.id);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'user-456' },
        data: { pipedriveUserId: 789 }
      });
    });
  });
}); 
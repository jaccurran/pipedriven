import { prisma } from '@/lib/prisma';
import { PipedriveService } from './pipedriveService';

export interface PipedriveUser {
  id: number;
  name: string;
  email: string;
}

export class PipedriveUserService {
  constructor(private pipedriveService: PipedriveService) {}

  async findUserByEmail(email: string): Promise<PipedriveUser | null> {
    try {
      const result = await this.pipedriveService.makeApiRequest(`/users?email=${encodeURIComponent(email)}`, {
        method: 'GET'
      });

      if (!result.success || !result.data?.data) {
        return null;
      }

      return result.data.data as PipedriveUser;
    } catch (error) {
      console.error('Error finding Pipedrive user:', error);
      return null;
    }
  }

  async storeUserPipedriveId(userId: string, pipedriveUserId: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { pipedriveUserId }
    });
  }
} 
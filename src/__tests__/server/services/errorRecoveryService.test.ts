import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ErrorRecoveryService, ErrorType, RecoveryStrategy } from '@/server/services/errorRecoveryService'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    syncHistory: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}))

describe('ErrorRecoveryService', () => {
  let errorRecoveryService: ErrorRecoveryService

  beforeEach(() => {
    errorRecoveryService = new ErrorRecoveryService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Error Classification', () => {
    it('should classify rate limit errors', () => {
      const error = new Error('Rate limit exceeded')
      const result = errorRecoveryService.classifyError(error)
      
      expect(result.type).toBe(ErrorType.RATE_LIMIT)
      expect(result.recoverable).toBe(true)
      expect(result.retryAfter).toBeDefined()
    })

    it('should classify authentication errors', () => {
      const error = new Error('API key expired')
      const result = errorRecoveryService.classifyError(error)
      
      expect(result.type).toBe(ErrorType.AUTHENTICATION)
      expect(result.recoverable).toBe(false)
    })

    it('should classify network errors', () => {
      const error = new Error('Failed to connect to Pipedrive API')
      const result = errorRecoveryService.classifyError(error)
      
      expect(result.type).toBe(ErrorType.NETWORK)
      expect(result.recoverable).toBe(true)
    })

    it('should classify database errors', () => {
      const error = new Error('Database connection lost')
      const result = errorRecoveryService.classifyError(error)
      
      expect(result.type).toBe(ErrorType.DATABASE)
      expect(result.recoverable).toBe(true)
    })

    it('should classify validation errors', () => {
      const error = new Error('Invalid email format')
      const result = errorRecoveryService.classifyError(error)
      
      expect(result.type).toBe(ErrorType.VALIDATION)
      expect(result.recoverable).toBe(false)
    })

    it('should classify unknown errors', () => {
      const error = new Error('Unexpected error')
      const result = errorRecoveryService.classifyError(error)
      
      expect(result.type).toBe(ErrorType.UNKNOWN)
      expect(result.recoverable).toBe(true)
    })
  })

  describe('Recovery Strategy Selection', () => {
    it('should select retry strategy for rate limit errors', () => {
      const error = new Error('Rate limit exceeded')
      const strategy = errorRecoveryService.selectRecoveryStrategy(error)
      
      expect(strategy).toBe(RecoveryStrategy.RETRY_WITH_BACKOFF)
    })

    it('should select resume strategy for network errors', () => {
      const error = new Error('Network timeout')
      const strategy = errorRecoveryService.selectRecoveryStrategy(error)
      
      expect(strategy).toBe(RecoveryStrategy.RESUME_FROM_LAST_SUCCESS)
    })

    it('should select full retry strategy for database errors', () => {
      const error = new Error('Database connection lost')
      const strategy = errorRecoveryService.selectRecoveryStrategy(error)
      
      expect(strategy).toBe(RecoveryStrategy.FULL_RETRY)
    })

    it('should select no recovery for authentication errors', () => {
      const error = new Error('Invalid API key')
      const strategy = errorRecoveryService.selectRecoveryStrategy(error)
      
      expect(strategy).toBe(RecoveryStrategy.NO_RECOVERY)
    })
  })

  describe('Sync Recovery', () => {
    it('should find last successful sync point', async () => {
      const mockSyncHistory = {
        id: 'sync-1',
        contactsProcessed: 150,
        contactsUpdated: 100,
        contactsCreated: 50,
        contactsFailed: 0,
        status: 'SUCCESS',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:30:00Z'),
      }

      vi.mocked(prisma.syncHistory.findFirst).mockResolvedValue(mockSyncHistory as any)

      const recoveryPoint = await errorRecoveryService.findLastSuccessfulSyncPoint('user-1')
      
      expect(recoveryPoint).toEqual({
        contactsProcessed: 150,
        contactsUpdated: 100,
        contactsCreated: 50,
        contactsFailed: 0,
        lastSuccessfulTime: new Date('2024-01-01T10:30:00Z'),
      })
    })

    it('should return null when no successful sync found', async () => {
      vi.mocked(prisma.syncHistory.findFirst).mockResolvedValue(null)

      const recoveryPoint = await errorRecoveryService.findLastSuccessfulSyncPoint('user-1')
      
      expect(recoveryPoint).toBeNull()
    })

    it('should calculate resume parameters for batch recovery', () => {
      const lastSuccessful = {
        contactsProcessed: 150,
        contactsUpdated: 100,
        contactsCreated: 50,
        contactsFailed: 0,
        lastSuccessfulTime: new Date('2024-01-01T10:30:00Z'),
      }

      const resumeParams = errorRecoveryService.calculateResumeParameters(lastSuccessful, 50)
      
      expect(resumeParams).toEqual({
        startFromContact: 150,
        skipContacts: 150,
        estimatedRemaining: 350, // Assuming 500 total contacts
        batchSize: 50,
      })
    })
  })

  describe('Error Recovery Execution', () => {
    it('should execute retry with backoff strategy', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce('success')

      const result = await errorRecoveryService.executeWithRecovery(
        mockOperation,
        RecoveryStrategy.RETRY_WITH_BACKOFF,
        { maxRetries: 3, baseDelay: 1000 }
      )

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(2)
    })

    it('should fail after max retries', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Persistent error'))

      const result = await errorRecoveryService.executeWithRecovery(
        mockOperation,
        RecoveryStrategy.RETRY_WITH_BACKOFF,
        { maxRetries: 2, baseDelay: 100 }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Persistent error')
      expect(result.attempts).toBe(3)
    })

    it('should handle no recovery strategy', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Authentication failed'))

      const result = await errorRecoveryService.executeWithRecovery(
        mockOperation,
        RecoveryStrategy.NO_RECOVERY
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication failed')
      expect(result.attempts).toBe(1)
    })
  })

  describe('Batch Recovery', () => {
    it('should recover from batch failure', async () => {
      const failedBatch = {
        batchNumber: 3,
        startIndex: 100,
        endIndex: 149,
        failedContacts: ['contact-101', 'contact-102'],
        error: 'Rate limit exceeded',
      }

      const recoveryPlan = errorRecoveryService.createBatchRecoveryPlan(failedBatch)
      
      expect(recoveryPlan).toEqual({
        retryBatch: 3,
        startIndex: 100,
        endIndex: 149,
        skipContacts: ['contact-101', 'contact-102'],
        strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
        estimatedDuration: 98000, // 49 contacts * 2000ms per contact
      })
    })

    it('should handle multiple batch failures', async () => {
      const failedBatches = [
        { batchNumber: 2, startIndex: 50, endIndex: 99, error: 'Network timeout' },
        { batchNumber: 4, startIndex: 150, endIndex: 199, error: 'Rate limit exceeded' },
      ]

      const recoveryPlan = errorRecoveryService.createMultiBatchRecoveryPlan(failedBatches)
      
      expect(recoveryPlan.batchesToRetry).toHaveLength(2)
      expect(recoveryPlan.totalEstimatedDuration).toBeGreaterThan(0)
      expect(recoveryPlan.strategy).toBe(RecoveryStrategy.RESUME_FROM_LAST_SUCCESS)
    })
  })

  describe('Timeout Protection', () => {
    it('should timeout long-running operations', async () => {
      const slowOperation = () => new Promise(resolve => setTimeout(resolve, 2000))
      
      const result = await errorRecoveryService.executeWithTimeout(
        slowOperation,
        1000 // 1 second timeout
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('timed out')
    })

    it('should complete operations within timeout', async () => {
      const fastOperation = () => Promise.resolve('success')
      
      const result = await errorRecoveryService.executeWithTimeout(
        fastOperation,
        5000 // 5 second timeout
      )

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
    })
  })

  describe('Error Logging and Monitoring', () => {
    it('should log error with context', async () => {
      const error = new Error('Test error')
      const context = { userId: 'user-1', syncId: 'sync-1', batchNumber: 3 }
      
      await errorRecoveryService.logError(error, context)
      
      expect(prisma.syncHistory.update).toHaveBeenCalledWith({
        where: { id: 'sync-1' },
        data: {
          status: 'FAILED',
          error: 'UNKNOWN: Test error',
          endTime: expect.any(Date),
        },
      })
    })

    it('should track error metrics', () => {
      const error = new Error('Rate limit exceeded')
      const metrics = errorRecoveryService.trackErrorMetrics(error, 'user-1')
      
      expect(metrics).toEqual({
        errorType: ErrorType.RATE_LIMIT,
        userId: 'user-1',
        timestamp: expect.any(Date),
        recoverable: true,
      })
    })
  })
}) 
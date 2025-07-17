import { prisma } from '@/lib/prisma'

export enum ErrorType {
  RATE_LIMIT = 'RATE_LIMIT',
  AUTHENTICATION = 'AUTHENTICATION',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  VALIDATION = 'VALIDATION',
  PIPEDRIVE_API = 'PIPEDRIVE_API',
  UNKNOWN = 'UNKNOWN',
}

export enum RecoveryStrategy {
  RETRY_WITH_BACKOFF = 'RETRY_WITH_BACKOFF',
  RESUME_FROM_LAST_SUCCESS = 'RESUME_FROM_LAST_SUCCESS',
  FULL_RETRY = 'FULL_RETRY',
  NO_RECOVERY = 'NO_RECOVERY',
}

export interface ErrorClassification {
  type: ErrorType
  recoverable: boolean
  retryAfter?: number
  userMessage: string
}

export interface RecoveryPoint {
  contactsProcessed: number
  contactsUpdated: number
  contactsCreated: number
  contactsFailed: number
  lastSuccessfulTime: Date
}

export interface ResumeParameters {
  startFromContact: number
  skipContacts: number
  estimatedRemaining: number
  batchSize: number
}

export interface RecoveryResult<T> {
  success: boolean
  data?: T
  error?: string
  attempts: number
  recoveryStrategy?: RecoveryStrategy
}

export interface BatchRecoveryPlan {
  retryBatch: number
  startIndex: number
  endIndex: number
  skipContacts: string[]
  strategy: RecoveryStrategy
  estimatedDuration: number
}

export interface MultiBatchRecoveryPlan {
  batchesToRetry: BatchRecoveryPlan[]
  totalEstimatedDuration: number
  strategy: RecoveryStrategy
}

export interface ErrorMetrics {
  errorType: ErrorType
  userId: string
  timestamp: Date
  recoverable: boolean
}

export class ErrorRecoveryService {
  private readonly errorPatterns = {
    [ErrorType.RATE_LIMIT]: [
      /rate limit/i,
      /too many requests/i,
      /retry after/i,
    ],
    [ErrorType.AUTHENTICATION]: [
      /api key/i,
      /invalid.*token/i,
      /unauthorized/i,
      /authentication failed/i,
    ],
    [ErrorType.NETWORK]: [
      /network timeout/i,
      /connection failed/i,
      /failed to connect/i,
      /timeout/i,
    ],
    [ErrorType.DATABASE]: [
      /database connection/i,
      /connection lost/i,
      /prisma.*error/i,
    ],
    [ErrorType.VALIDATION]: [
      /invalid.*format/i,
      /validation failed/i,
      /required field/i,
    ],
    [ErrorType.PIPEDRIVE_API]: [
      /pipedrive.*error/i,
      /api.*error/i,
    ],
  }

  private readonly userMessages = {
    [ErrorType.RATE_LIMIT]: 'Rate limit exceeded. Please wait a moment and try again.',
    [ErrorType.AUTHENTICATION]: 'Authentication failed. Please check your API key.',
    [ErrorType.NETWORK]: 'Network connection issue. Please check your internet connection.',
    [ErrorType.DATABASE]: 'Database connection issue. Please try again later.',
    [ErrorType.VALIDATION]: 'Invalid data format. Please check your input.',
    [ErrorType.PIPEDRIVE_API]: 'Pipedrive API error. Please try again later.',
    [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.',
  }

  /**
   * Classify an error based on its message and context
   */
  classifyError(error: Error): ErrorClassification {
    const message = error.message.toLowerCase()
    
    for (const [type, patterns] of Object.entries(this.errorPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          const errorType = type as ErrorType
          return {
            type: errorType,
            recoverable: this.isRecoverable(errorType),
            retryAfter: this.calculateRetryAfter(errorType),
            userMessage: this.userMessages[errorType],
          }
        }
      }
    }

    return {
      type: ErrorType.UNKNOWN,
      recoverable: true,
      userMessage: this.userMessages[ErrorType.UNKNOWN],
    }
  }

  /**
   * Select appropriate recovery strategy based on error type
   */
  selectRecoveryStrategy(error: Error): RecoveryStrategy {
    const classification = this.classifyError(error)
    
    switch (classification.type) {
      case ErrorType.RATE_LIMIT:
        return RecoveryStrategy.RETRY_WITH_BACKOFF
      case ErrorType.NETWORK:
        return RecoveryStrategy.RESUME_FROM_LAST_SUCCESS
      case ErrorType.DATABASE:
        return RecoveryStrategy.FULL_RETRY
      case ErrorType.AUTHENTICATION:
      case ErrorType.VALIDATION:
        return RecoveryStrategy.NO_RECOVERY
      default:
        return RecoveryStrategy.RETRY_WITH_BACKOFF
    }
  }

  /**
   * Find the last successful sync point for a user
   */
  async findLastSuccessfulSyncPoint(userId: string): Promise<RecoveryPoint | null> {
    const lastSuccessful = await prisma.syncHistory.findFirst({
      where: {
        userId,
        status: 'SUCCESS',
      },
      orderBy: {
        endTime: 'desc',
      },
    })

    if (!lastSuccessful) {
      return null
    }

    return {
      contactsProcessed: lastSuccessful.contactsProcessed,
      contactsUpdated: lastSuccessful.contactsUpdated,
      contactsCreated: lastSuccessful.contactsCreated,
      contactsFailed: lastSuccessful.contactsFailed,
      lastSuccessfulTime: lastSuccessful.endTime!,
    }
  }

  /**
   * Calculate resume parameters for batch recovery
   */
  calculateResumeParameters(
    lastSuccessful: RecoveryPoint,
    batchSize: number,
    estimatedTotalContacts: number = 500
  ): ResumeParameters {
    const startFromContact = lastSuccessful.contactsProcessed
    const remainingContacts = estimatedTotalContacts - startFromContact
    
    return {
      startFromContact,
      skipContacts: startFromContact,
      estimatedRemaining: remainingContacts,
      batchSize,
    }
  }

  /**
   * Execute an operation with recovery strategy
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    strategy: RecoveryStrategy,
    options: {
      maxRetries?: number
      baseDelay?: number
      timeout?: number
    } = {}
  ): Promise<RecoveryResult<T>> {
    const { maxRetries = 3, baseDelay = 1000, timeout = 30000 } = options
    let attempts = 0
    let lastError: Error

    while (attempts <= maxRetries) {
      attempts++
      
      try {
        const result = await this.executeWithTimeout(operation, timeout)
        if (result.success) {
          return {
            success: true,
            data: result.data,
            attempts,
            recoveryStrategy: strategy,
          }
        }
        lastError = new Error(result.error)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
      }

      if (attempts > maxRetries) {
        break
      }

      // Apply recovery strategy
      switch (strategy) {
        case RecoveryStrategy.RETRY_WITH_BACKOFF:
          const delay = baseDelay * Math.pow(2, attempts - 1)
          await this.sleep(delay)
          break
        case RecoveryStrategy.NO_RECOVERY:
          return {
            success: false,
            error: lastError.message,
            attempts,
            recoveryStrategy: strategy,
          }
        default:
          await this.sleep(baseDelay)
      }
    }

    return {
      success: false,
      error: lastError!.message,
      attempts,
      recoveryStrategy: strategy,
    }
  }

  /**
   * Execute operation with timeout protection
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<RecoveryResult<T>> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      })

      const result = await Promise.race([operation(), timeoutPromise])
      
      return {
        success: true,
        data: result,
        attempts: 1
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        attempts: 1
      }
    }
  }

  /**
   * Create recovery plan for a failed batch
   */
  createBatchRecoveryPlan(failedBatch: {
    batchNumber: number
    startIndex: number
    endIndex: number
    failedContacts: string[]
    error: string
  }): BatchRecoveryPlan {
    const error = new Error(failedBatch.error)
    const strategy = this.selectRecoveryStrategy(error)
    
    return {
      retryBatch: failedBatch.batchNumber,
      startIndex: failedBatch.startIndex,
      endIndex: failedBatch.endIndex,
      skipContacts: failedBatch.failedContacts,
      strategy,
      estimatedDuration: this.estimateBatchDuration(failedBatch.endIndex - failedBatch.startIndex),
    }
  }

  /**
   * Create recovery plan for multiple failed batches
   */
  createMultiBatchRecoveryPlan(failedBatches: Array<{
    batchNumber: number
    startIndex: number
    endIndex: number
    error: string
  }>): MultiBatchRecoveryPlan {
    const batchesToRetry = failedBatches.map(batch => 
      this.createBatchRecoveryPlan({
        ...batch,
        failedContacts: [],
      })
    )

    const totalEstimatedDuration = batchesToRetry.reduce(
      (total, batch) => total + batch.estimatedDuration,
      0
    )

    return {
      batchesToRetry,
      totalEstimatedDuration,
      strategy: RecoveryStrategy.RESUME_FROM_LAST_SUCCESS,
    }
  }

  /**
   * Log error with context
   */
  async logError(error: Error, context: {
    userId: string
    syncId: string
    batchNumber?: number
  }): Promise<void> {
    const classification = this.classifyError(error)
    
    await prisma.syncHistory.update({
      where: { id: context.syncId },
      data: {
        status: 'FAILED',
        error: `${classification.type}: ${error.message}`,
        endTime: new Date(),
      },
    })

    // Track error metrics
    this.trackErrorMetrics(error, context.userId)
  }

  /**
   * Track error metrics for monitoring
   */
  trackErrorMetrics(error: Error, userId: string): ErrorMetrics {
    const classification = this.classifyError(error)
    
    return {
      errorType: classification.type,
      userId,
      timestamp: new Date(),
      recoverable: classification.recoverable,
    }
  }

  /**
   * Private helper methods
   */
  private isRecoverable(errorType: ErrorType): boolean {
    return ![ErrorType.AUTHENTICATION, ErrorType.VALIDATION].includes(errorType)
  }

  private calculateRetryAfter(errorType: ErrorType): number | undefined {
    switch (errorType) {
      case ErrorType.RATE_LIMIT:
        return 60000 // 1 minute
      case ErrorType.NETWORK:
        return 5000 // 5 seconds
      default:
        return undefined
    }
  }

  private estimateBatchDuration(contactCount: number): number {
    // Estimate 2 seconds per contact for API calls
    return contactCount * 2000
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
} 
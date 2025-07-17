import { prisma } from '@/lib/prisma'

export interface TimeoutConfig {
  syncTimeoutMs: number
  batchTimeoutMs: number
  maxBatchTimeoutMs: number
  progressiveTimeoutEnabled: boolean
}

export interface TimeoutResult<T> {
  success: boolean
  data?: T
  error?: string
  duration: number
}

export interface BatchResult {
  processed: number
  failed: number
  errors?: string[]
}

export interface TimeoutMetrics {
  syncId: string
  batchNumber: number
  timeoutMs: number
  actualDuration: number
  wasTimeout: boolean
  timestamp: Date
}

export interface TimeoutPatterns {
  timeoutCount: number
  totalBatches: number
  timeoutRate: number
  averageDuration: number
  maxDuration: number
}

export interface TimeoutSuggestions {
  shouldIncrease: boolean
  recommendedTimeout: number
  reason: string
}

export interface ConfigValidation {
  isValid: boolean
  errors: string[]
}

export class TimeoutProtectionService {
  private readonly defaultConfig: TimeoutConfig = {
    syncTimeoutMs: 300000, // 5 minutes
    batchTimeoutMs: 30000, // 30 seconds
    maxBatchTimeoutMs: 120000, // 2 minutes
    progressiveTimeoutEnabled: true,
  }

  private timeoutMetrics: Map<string, TimeoutMetrics[]> = new Map()

  /**
   * Execute a sync operation with timeout protection
   */
  async executeSyncWithTimeout<T>(
    operation: () => Promise<T>,
    config: Partial<TimeoutConfig> & { syncId?: string; userId?: string } = {}
  ): Promise<TimeoutResult<T>> {
    const timeoutConfig = { ...this.defaultConfig, ...config }
    const startTime = Date.now()

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Sync timed out after ${timeoutConfig.syncTimeoutMs}ms`)), timeoutConfig.syncTimeoutMs)
      })

      const result = await Promise.race([operation(), timeoutPromise])
      const duration = Date.now() - startTime

      return {
        success: true,
        data: result,
        duration,
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Update sync history and user status on timeout
      if (config.syncId && config.userId && errorMessage.includes('timeout')) {
        try {
          await this.handleSyncTimeout(config.syncId, config.userId, errorMessage)
        } catch (dbError) {
          console.error('Failed to update sync history on timeout:', dbError)
        }
      }

      return {
        success: false,
        error: errorMessage,
        duration,
      }
    }
  }

  /**
   * Execute a batch operation with timeout protection
   */
  async executeBatchWithTimeout(
    operation: () => Promise<BatchResult>,
    config: Partial<TimeoutConfig> & { syncId?: string; batchNumber?: number } = {}
  ): Promise<TimeoutResult<BatchResult>> {
    const timeoutConfig = { ...this.defaultConfig, ...config }
    const startTime = Date.now()

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Batch ${config.batchNumber || 'unknown'} timed out after ${timeoutConfig.batchTimeoutMs}ms`)), timeoutConfig.batchTimeoutMs)
      })

      const result = await Promise.race([operation(), timeoutPromise])
      const duration = Date.now() - startTime

      // Track successful batch metrics
      if (config.syncId && config.batchNumber) {
        this.trackTimeoutMetrics({
          syncId: config.syncId,
          batchNumber: config.batchNumber,
          timeoutMs: timeoutConfig.batchTimeoutMs,
          actualDuration: duration,
          wasTimeout: false,
          timestamp: new Date()
        })
      }

      return {
        success: true,
        data: result,
        duration,
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Track timeout metrics
      if (config.syncId && config.batchNumber) {
        this.trackTimeoutMetrics({
          syncId: config.syncId,
          batchNumber: config.batchNumber,
          timeoutMs: timeoutConfig.batchTimeoutMs,
          actualDuration: duration,
          wasTimeout: true,
          timestamp: new Date()
        })
      }

      // Update sync history on batch timeout
      if (config.syncId && errorMessage.includes('timeout')) {
        try {
          await this.handleBatchTimeout(config.syncId, config.batchNumber, errorMessage)
        } catch (dbError) {
          console.error('Failed to update sync history on batch timeout:', dbError)
        }
      }

      return {
        success: false,
        error: errorMessage,
        duration,
      }
    }
  }

  /**
   * Calculate progressive timeout based on batch size
   */
  calculateProgressiveTimeout(totalContacts: number, batchSize: number): TimeoutConfig {
    const baseTimeout = this.defaultConfig.batchTimeoutMs
    const maxTimeout = this.defaultConfig.maxBatchTimeoutMs

    if (!this.defaultConfig.progressiveTimeoutEnabled) {
      return this.defaultConfig
    }

    // For very large batches relative to total contacts, use max timeout
    if (batchSize >= totalContacts || batchSize >= 1000) {
      return {
        ...this.defaultConfig,
        batchTimeoutMs: maxTimeout,
      }
    }

    // For very small batches, use base timeout
    if (batchSize <= 10 || batchSize <= totalContacts * 0.05) {
      return {
        ...this.defaultConfig,
        batchTimeoutMs: baseTimeout,
      }
    }

    // Calculate progressive timeout for medium batches
    const batchRatio = batchSize / totalContacts
    let progressiveTimeout = baseTimeout + (batchRatio * (maxTimeout - baseTimeout))
    progressiveTimeout = Math.min(Math.max(progressiveTimeout, baseTimeout), maxTimeout)
    
    return {
      ...this.defaultConfig,
      batchTimeoutMs: Math.round(progressiveTimeout),
    }
  }

  /**
   * Validate timeout configuration
   */
  validateTimeoutConfig(config: TimeoutConfig): ConfigValidation {
    const errors: string[] = []

    if (config.syncTimeoutMs <= 0) {
      errors.push('syncTimeoutMs must be positive')
    }

    if (config.batchTimeoutMs <= 0) {
      errors.push('batchTimeoutMs must be positive')
    }

    if (config.maxBatchTimeoutMs <= 0) {
      errors.push('maxBatchTimeoutMs must be positive')
    }

    if (config.batchTimeoutMs > config.syncTimeoutMs) {
      errors.push('batchTimeoutMs cannot exceed syncTimeoutMs')
    }

    if (config.maxBatchTimeoutMs > config.syncTimeoutMs) {
      errors.push('maxBatchTimeoutMs cannot exceed syncTimeoutMs')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Track timeout metrics for analysis
   */
  trackTimeoutMetrics(metrics: TimeoutMetrics): TimeoutMetrics {
    const key = metrics.syncId
    const metricsWithTimestamp = { ...metrics, timestamp: metrics.timestamp || new Date() }
    if (!this.timeoutMetrics.has(key)) {
      this.timeoutMetrics.set(key, [])
    }
    this.timeoutMetrics.get(key)!.push(metricsWithTimestamp)
    return metricsWithTimestamp
  }

  /**
   * Analyze timeout patterns for a sync
   */
  analyzeTimeoutPatterns(syncId: string): TimeoutPatterns {
    const metrics = this.timeoutMetrics.get(syncId) || []
    
    if (metrics.length === 0) {
      return {
        timeoutCount: 0,
        totalBatches: 0,
        timeoutRate: 0,
        averageDuration: 0,
        maxDuration: 0,
      }
    }

    const timeoutCount = metrics.filter(m => m.wasTimeout).length
    const totalBatches = metrics.length
    const timeoutRate = timeoutCount / totalBatches
    const averageDuration = metrics.reduce((sum, m) => sum + m.actualDuration, 0) / totalBatches
    const maxDuration = Math.max(...metrics.map(m => m.actualDuration))

    return {
      timeoutCount,
      totalBatches,
      timeoutRate,
      averageDuration,
      maxDuration,
    }
  }

  /**
   * Suggest timeout adjustments based on patterns
   */
  suggestTimeoutAdjustments(data: {
    currentTimeout: number
    averageDuration: number
    timeoutRate: number
    totalBatches: number
  }): TimeoutSuggestions {
    const { currentTimeout, averageDuration, timeoutRate, totalBatches } = data

    // Suggest increase if average duration exceeds current timeout
    if (averageDuration > currentTimeout * 0.8) {
      const recommendedTimeout = Math.min(
        Math.round(averageDuration * 1.5),
        this.defaultConfig.maxBatchTimeoutMs
      )
      return {
        shouldIncrease: true,
        recommendedTimeout,
        reason: 'average duration exceeds current timeout',
      }
    }

    // Suggest increase if timeout rate is high and enough batches
    if (timeoutRate > 0.2 && totalBatches > 5) {
      const recommendedTimeout = Math.min(
        Math.round(currentTimeout * 1.5),
        this.defaultConfig.maxBatchTimeoutMs
      )
      return {
        shouldIncrease: true,
        recommendedTimeout,
        reason: `High timeout rate (${(timeoutRate * 100).toFixed(1)}%) suggests timeout is too aggressive`,
      }
    }

    // No increase needed for low timeout rates
    return {
      shouldIncrease: false,
      recommendedTimeout: currentTimeout,
      reason: 'low timeout rate',
    }
  }

  /**
   * Handle sync timeout by updating database
   */
  private async handleSyncTimeout(syncId: string, userId: string, errorMessage: string): Promise<void> {
    try {
      await Promise.all([
        prisma.syncHistory.update({
          where: { id: syncId },
          data: {
            status: 'FAILED',
            error: errorMessage,
            endTime: new Date(),
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: {
            syncStatus: 'FAILED',
            lastSyncTimestamp: null,
          },
        }),
      ])
    } catch (error) {
      console.error('Failed to update sync history on timeout:', error)
    }
  }

  /**
   * Handle batch timeout by updating sync history
   */
  private async handleBatchTimeout(syncId: string, batchNumber: number | undefined, errorMessage: string): Promise<void> {
    try {
      await prisma.syncHistory.update({
        where: { id: syncId },
        data: {
          error: errorMessage,
          endTime: new Date(),
        },
      })
    } catch (error) {
      console.error('Failed to update sync history on batch timeout:', error)
    }
  }

  /**
   * Clear timeout metrics for a sync (cleanup)
   */
  clearTimeoutMetrics(syncId: string): void {
    this.timeoutMetrics.delete(syncId)
  }

  /**
   * Get default timeout configuration
   */
  getDefaultConfig(): TimeoutConfig {
    return { ...this.defaultConfig }
  }
} 
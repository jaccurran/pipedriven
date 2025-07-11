import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { 
  pipedriveConfig, 
  getPipedriveApiUrl, 
  validatePipedriveConfig,
  type PipedriveConfig 
} from '@/lib/pipedrive-config'

// Mock environment variables
const originalEnv = process.env

describe('Pipedrive Configuration', () => {
  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv }
    
    // Clear module cache to reload configuration
    vi.resetModules()
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('Default Configuration', () => {
    it('should load default configuration when no environment variables are set', async () => {
      // Clear all Pipedrive environment variables
      delete process.env.PIPEDRIVE_BASE_URL
      delete process.env.PIPEDRIVE_API_VERSION
      delete process.env.PIPEDRIVE_TIMEOUT
      delete process.env.PIPEDRIVE_MAX_RETRIES
      delete process.env.PIPEDRIVE_RETRY_DELAY
      delete process.env.PIPEDRIVE_ENABLE_RETRIES
      delete process.env.PIPEDRIVE_ENABLE_RATE_LIMITING
      delete process.env.PIPEDRIVE_ENABLE_DATA_SANITIZATION
      delete process.env.PIPEDRIVE_ENABLE_DETAILED_LOGGING

      // Reload configuration
      const { pipedriveConfig: config } = await import('@/lib/pipedrive-config')

      expect(config.baseUrl).toBe('https://api.pipedrive.com')
      expect(config.apiVersion).toBe('v1')
      expect(config.timeout).toBe(30000)
      expect(config.maxRetries).toBe(3)
      expect(config.retryDelay).toBe(1000)
      expect(config.enableRetries).toBe(true)
      expect(config.enableRateLimiting).toBe(true)
      expect(config.enableDataSanitization).toBe(true)
      expect(config.enableDetailedLogging).toBe(true)
    })

    it('should generate correct API URL', () => {
      const apiUrl = getPipedriveApiUrl()
      expect(apiUrl).toBe('https://api.pipedrive.com/v1')
    })
  })

  describe('Environment Variable Overrides', () => {
    it('should override base URL from environment', async () => {
      process.env.PIPEDRIVE_BASE_URL = 'https://custom-pipedrive.com'
      
      const { pipedriveConfig: config, getPipedriveApiUrl } = await import('@/lib/pipedrive-config')
      
      expect(config.baseUrl).toBe('https://custom-pipedrive.com')
      expect(getPipedriveApiUrl()).toBe('https://custom-pipedrive.com/v1')
    })

    it('should override API version from environment', async () => {
      process.env.PIPEDRIVE_API_VERSION = 'v2'
      
      const { pipedriveConfig: config, getPipedriveApiUrl } = await import('@/lib/pipedrive-config')
      
      expect(config.apiVersion).toBe('v2')
      expect(getPipedriveApiUrl()).toBe('https://api.pipedrive.com/v2')
    })

    it('should override timeout from environment', async () => {
      process.env.PIPEDRIVE_TIMEOUT = '60000'
      
      const { pipedriveConfig: config } = await import('@/lib/pipedrive-config')
      
      expect(config.timeout).toBe(60000)
    })

    it('should override retry settings from environment', async () => {
      process.env.PIPEDRIVE_MAX_RETRIES = '5'
      process.env.PIPEDRIVE_RETRY_DELAY = '2000'
      
      const { pipedriveConfig: config } = await import('@/lib/pipedrive-config')
      
      expect(config.maxRetries).toBe(5)
      expect(config.retryDelay).toBe(2000)
    })

    it('should override data validation limits from environment', async () => {
      process.env.PIPEDRIVE_MAX_NAME_LENGTH = '100'
      process.env.PIPEDRIVE_MAX_EMAIL_LENGTH = '150'
      process.env.PIPEDRIVE_MAX_NOTE_LENGTH = '500'
      
      const { pipedriveConfig: config } = await import('@/lib/pipedrive-config')
      
      expect(config.maxNameLength).toBe(100)
      expect(config.maxEmailLength).toBe(150)
      expect(config.maxNoteLength).toBe(500)
    })

    it('should override feature flags from environment', async () => {
      process.env.PIPEDRIVE_ENABLE_RETRIES = 'false'
      process.env.PIPEDRIVE_ENABLE_RATE_LIMITING = 'false'
      process.env.PIPEDRIVE_ENABLE_DATA_SANITIZATION = 'false'
      process.env.PIPEDRIVE_ENABLE_DETAILED_LOGGING = 'false'
      
      const { pipedriveConfig: config } = await import('@/lib/pipedrive-config')
      
      expect(config.enableRetries).toBe(false)
      expect(config.enableRateLimiting).toBe(false)
      expect(config.enableDataSanitization).toBe(false)
      expect(config.enableDetailedLogging).toBe(false)
    })
  })

  describe('Configuration Validation', () => {
    it('should validate correct configuration', async () => {
      const { validatePipedriveConfig } = await import('@/lib/pipedrive-config')
      
      const errors = validatePipedriveConfig()
      expect(errors).toHaveLength(0)
    })

    it('should detect invalid base URL', async () => {
      process.env.PIPEDRIVE_BASE_URL = 'invalid-url'
      
      const { validatePipedriveConfig } = await import('@/lib/pipedrive-config')
      
      const errors = validatePipedriveConfig()
      expect(errors).toContain('PIPEDRIVE_BASE_URL must be a valid URL')
    })

    it('should detect invalid timeout', async () => {
      process.env.PIPEDRIVE_TIMEOUT = '500'
      
      const { validatePipedriveConfig } = await import('@/lib/pipedrive-config')
      
      const errors = validatePipedriveConfig()
      expect(errors).toContain('PIPEDRIVE_TIMEOUT must be at least 1000ms')
    })

    it('should detect negative retry count', async () => {
      process.env.PIPEDRIVE_MAX_RETRIES = '-1'
      
      const { validatePipedriveConfig } = await import('@/lib/pipedrive-config')
      
      const errors = validatePipedriveConfig()
      expect(errors).toContain('PIPEDRIVE_MAX_RETRIES must be non-negative')
    })

    it('should detect invalid retry delay', async () => {
      process.env.PIPEDRIVE_RETRY_DELAY = '50'
      
      const { validatePipedriveConfig } = await import('@/lib/pipedrive-config')
      
      const errors = validatePipedriveConfig()
      expect(errors).toContain('PIPEDRIVE_RETRY_DELAY must be at least 100ms')
    })

    it('should detect invalid name length', async () => {
      process.env.PIPEDRIVE_MAX_NAME_LENGTH = '0'
      
      const { validatePipedriveConfig } = await import('@/lib/pipedrive-config')
      
      const errors = validatePipedriveConfig()
      expect(errors).toContain('PIPEDRIVE_MAX_NAME_LENGTH must be at least 1')
    })

    it('should detect invalid email length', async () => {
      process.env.PIPEDRIVE_MAX_EMAIL_LENGTH = '-1'
      
      const { validatePipedriveConfig } = await import('@/lib/pipedrive-config')
      
      const errors = validatePipedriveConfig()
      expect(errors).toContain('PIPEDRIVE_MAX_EMAIL_LENGTH must be at least 1')
    })

    it('should detect multiple validation errors', async () => {
      process.env.PIPEDRIVE_BASE_URL = 'invalid-url'
      process.env.PIPEDRIVE_TIMEOUT = '500'
      process.env.PIPEDRIVE_MAX_RETRIES = '-1'
      
      const { validatePipedriveConfig } = await import('@/lib/pipedrive-config')
      
      const errors = validatePipedriveConfig()
      expect(errors).toHaveLength(3)
      expect(errors).toContain('PIPEDRIVE_BASE_URL must be a valid URL')
      expect(errors).toContain('PIPEDRIVE_TIMEOUT must be at least 1000ms')
      expect(errors).toContain('PIPEDRIVE_MAX_RETRIES must be non-negative')
    })
  })

  describe('Configuration Types', () => {
    it('should have correct TypeScript types', () => {
      const config: PipedriveConfig = {
        baseUrl: 'https://api.pipedrive.com',
        apiVersion: 'v1',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
        rateLimitDelay: 60000,
        maxNameLength: 255,
        maxEmailLength: 255,
        maxPhoneLength: 50,
        maxOrgNameLength: 255,
        maxSubjectLength: 255,
        maxNoteLength: 1000,
        enableRetries: true,
        enableRateLimiting: true,
        enableDataSanitization: true,
        enableDetailedLogging: true,
      }

      expect(config.baseUrl).toBe('https://api.pipedrive.com')
      expect(config.enableRetries).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string environment variables', async () => {
      process.env.PIPEDRIVE_BASE_URL = ''
      process.env.PIPEDRIVE_TIMEOUT = ''
      
      const { pipedriveConfig: config } = await import('@/lib/pipedrive-config')
      
      // Should use defaults when environment variables are empty
      expect(config.baseUrl).toBe('https://api.pipedrive.com')
      expect(config.timeout).toBe(30000)
    })

    it('should handle invalid numeric environment variables', async () => {
      process.env.PIPEDRIVE_TIMEOUT = 'not-a-number'
      process.env.PIPEDRIVE_MAX_RETRIES = 'invalid'
      
      const { pipedriveConfig: config } = await import('@/lib/pipedrive-config')
      
      // Should use defaults when environment variables are invalid
      expect(config.timeout).toBe(30000)
      expect(config.maxRetries).toBe(3)
    })

    it('should handle mixed valid and invalid environment variables', async () => {
      process.env.PIPEDRIVE_BASE_URL = 'https://custom-pipedrive.com'
      process.env.PIPEDRIVE_TIMEOUT = 'invalid'
      process.env.PIPEDRIVE_MAX_RETRIES = '5'
      
      const { pipedriveConfig: config } = await import('@/lib/pipedrive-config')
      
      // Valid variables should be used, invalid ones should use defaults
      expect(config.baseUrl).toBe('https://custom-pipedrive.com')
      expect(config.timeout).toBe(30000) // Default
      expect(config.maxRetries).toBe(5) // Valid override
    })
  })
}) 
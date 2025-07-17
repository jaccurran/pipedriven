/**
 * Pipedrive API Configuration
 * 
 * This file contains all configurable settings for the Pipedrive API integration.
 * Settings can be overridden using environment variables.
 */

export interface PipedriveConfig {
  // API Base URL - can be changed for different environments (production, staging, etc.)
  baseUrl: string
  
  // API Version - currently using v1, but can be changed if needed
  apiVersion: string
  
  // Request timeout in milliseconds
  timeout: number
  
  // Retry configuration
  maxRetries: number
  retryDelay: number
  
  // Rate limiting configuration
  rateLimitDelay: number
  
  // Data validation limits
  maxNameLength: number
  maxEmailLength: number
  maxPhoneLength: number
  maxOrgNameLength: number
  maxSubjectLength: number
  maxNoteLength: number
  
  // Feature flags
  enableRetries: boolean
  enableRateLimiting: boolean
  enableDataSanitization: boolean
  enableDetailedLogging: boolean
}

/**
 * Default configuration values
 */
const defaultConfig: PipedriveConfig = {
  // API Settings
  baseUrl: 'https://api.pipedrive.com',
  apiVersion: 'v1',
  timeout: 30000, // 30 seconds
  
  // Retry Settings
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  rateLimitDelay: 60000, // 1 minute
  
  // Data Validation Limits
  maxNameLength: 255,
  maxEmailLength: 255,
  maxPhoneLength: 50,
  maxOrgNameLength: 255,
  maxSubjectLength: 255,
  maxNoteLength: 1000,
  
  // Feature Flags
  enableRetries: true,
  enableRateLimiting: true,
  enableDataSanitization: true,
  enableDetailedLogging: false, // Disabled by default
}

/**
 * Load configuration from environment variables
 */
function loadConfigFromEnv(): Partial<PipedriveConfig> {
  const parseNumber = (value: string | undefined): number | undefined => {
    if (!value) return undefined
    const parsed = parseInt(value)
    return isNaN(parsed) ? undefined : parsed
  }

  return {
    // API Settings
    baseUrl: process.env.PIPEDRIVE_BASE_URL,
    apiVersion: process.env.PIPEDRIVE_API_VERSION,
    timeout: parseNumber(process.env.PIPEDRIVE_TIMEOUT),
    
    // Retry Settings
    maxRetries: parseNumber(process.env.PIPEDRIVE_MAX_RETRIES),
    retryDelay: parseNumber(process.env.PIPEDRIVE_RETRY_DELAY),
    rateLimitDelay: parseNumber(process.env.PIPEDRIVE_RATE_LIMIT_DELAY),
    
    // Data Validation Limits
    maxNameLength: parseNumber(process.env.PIPEDRIVE_MAX_NAME_LENGTH),
    maxEmailLength: parseNumber(process.env.PIPEDRIVE_MAX_EMAIL_LENGTH),
    maxPhoneLength: parseNumber(process.env.PIPEDRIVE_MAX_PHONE_LENGTH),
    maxOrgNameLength: parseNumber(process.env.PIPEDRIVE_MAX_ORG_NAME_LENGTH),
    maxSubjectLength: parseNumber(process.env.PIPEDRIVE_MAX_SUBJECT_LENGTH),
    maxNoteLength: parseNumber(process.env.PIPEDRIVE_MAX_NOTE_LENGTH),
    
    // Feature Flags
    enableRetries: process.env.PIPEDRIVE_ENABLE_RETRIES !== 'false',
    enableRateLimiting: process.env.PIPEDRIVE_ENABLE_RATE_LIMITING !== 'false',
    enableDataSanitization: process.env.PIPEDRIVE_ENABLE_DATA_SANITIZATION !== 'false',
    enableDetailedLogging: process.env.PIPEDRIVE_ENABLE_DETAILED_LOGGING === 'true',
  }
}

/**
 * Merge environment configuration with defaults
 */
function mergeConfig(): PipedriveConfig {
  const envConfig = loadConfigFromEnv()
  
  return {
    ...defaultConfig,
    ...Object.fromEntries(
      Object.entries(envConfig).filter(([, value]) => 
        value !== undefined && 
        value !== null && 
        value !== ''
      )
    ),
  }
}

/**
 * Export the final configuration
 */
export const pipedriveConfig: PipedriveConfig = mergeConfig()

/**
 * Get the full API URL
 */
export function getPipedriveApiUrl(): string {
  return `${pipedriveConfig.baseUrl}/${pipedriveConfig.apiVersion}`
}

/**
 * Validate configuration
 */
export function validatePipedriveConfig(): string[] {
  const errors: string[] = []
  
  // Validate URLs
  try {
    new URL(pipedriveConfig.baseUrl)
  } catch {
    errors.push('PIPEDRIVE_BASE_URL must be a valid URL')
  }
  
  // Validate timeouts
  if (pipedriveConfig.timeout < 1000) {
    errors.push('PIPEDRIVE_TIMEOUT must be at least 1000ms')
  }
  
  // Validate retry settings
  if (pipedriveConfig.maxRetries < 0) {
    errors.push('PIPEDRIVE_MAX_RETRIES must be non-negative')
  }
  
  if (pipedriveConfig.retryDelay < 100) {
    errors.push('PIPEDRIVE_RETRY_DELAY must be at least 100ms')
  }
  
  // Validate length limits
  if (pipedriveConfig.maxNameLength < 1) {
    errors.push('PIPEDRIVE_MAX_NAME_LENGTH must be at least 1')
  }
  
  if (pipedriveConfig.maxEmailLength < 1) {
    errors.push('PIPEDRIVE_MAX_EMAIL_LENGTH must be at least 1')
  }
  
  return errors
} 
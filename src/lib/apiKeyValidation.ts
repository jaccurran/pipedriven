/**
 * API Key Validation Utilities
 * Provides functions for validating Pipedrive API keys
 */

import { prisma } from '@/lib/prisma'
import { createPipedriveService } from '@/server/services/pipedriveService'

export interface ApiKeyValidationResult {
  valid: boolean
  error?: string
  user?: {
    id: number
    name: string
    email: string
  }
}

export async function checkApiKeyValidity(userId: string): Promise<ApiKeyValidationResult> {
  try {
    // Get user's encrypted API key
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pipedriveApiKey: true }
    })

    if (!user?.pipedriveApiKey) {
      return { valid: false, error: 'No API key configured' }
    }

    // Create Pipedrive service (this will decrypt the API key)
    const pipedriveService = await createPipedriveService(userId)
    
    if (!pipedriveService) {
      return { valid: false, error: 'Failed to create Pipedrive service' }
    }

    // Test the API key by making a simple API call
    const result = await pipedriveService.getPersons()
    
    if (result.success) {
      return { valid: true }
    } else {
      return { valid: false, error: result.error || 'API key validation failed' }
    }

  } catch (error) {
    console.error('API key validation error:', error)
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Unknown error during validation' 
    }
  }
}

/**
 * Validates the format of a Pipedrive API key
 * @param apiKey - The API key to validate
 * @returns boolean - True if format is valid, false otherwise
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false
  }

  // Pipedrive API keys are typically alphanumeric and around 40-50 characters
  // This is a basic format check - actual validation requires API call
  const apiKeyRegex = /^[a-zA-Z0-9]{30,60}$/
  return apiKeyRegex.test(apiKey.trim())
}

/**
 * Gets a user-friendly error message for API key validation failures
 * @param error - The error that occurred during validation
 * @returns string - User-friendly error message
 */
export function getApiKeyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Unable to connect to Pipedrive. Please check your internet connection.'
    }
    
    if (message.includes('rate limit') || message.includes('too many')) {
      return 'Too many validation attempts. Please wait a moment and try again.'
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'The API key appears to be invalid. Please check and try again.'
    }
    
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.'
    }
  }
  
  return 'An error occurred while validating your API key. Please try again.'
} 
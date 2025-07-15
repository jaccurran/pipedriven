import { prisma } from '@/lib/prisma'
import type { Contact, Activity, ActivityType } from '@prisma/client'
import { pipedriveConfig, getPipedriveApiUrl, validatePipedriveConfig } from '@/lib/pipedrive-config'

export interface PipedrivePerson {
  id: number
  name: string
  email: string[]
  phone: string[]
  org_name?: string
  org_id?: number
  created: string
  updated: string
}

// Alias for backward compatibility
export type PipedriveContact = PipedrivePerson

interface PipedriveOrganization {
  id: number
  name: string
  address?: string
  created: string
  updated: string
}



interface PipedriveUser {
  id: number
  name: string
  email: string
  created: string
  updated: string
}

interface PipedriveDiagnostics {
  responseTime?: string
  timestamp?: string
  apiVersion?: string
  endpoint?: string
  errorType?: string
  [key: string]: unknown
}

interface PipedriveApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

export class PipedriveService {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Pipedrive API key is required')
    }
    
    // Validate configuration on service creation
    const configErrors = validatePipedriveConfig()
    if (configErrors.length > 0) {
      throw new Error(`Invalid Pipedrive configuration: ${configErrors.join(', ')}`)
    }
    
    this.apiKey = apiKey.trim()
    this.baseUrl = getPipedriveApiUrl()
  }

  /**
   * Test the Pipedrive API connection
   */
  async testConnection(): Promise<{ success: boolean; user?: PipedriveUser; error?: string; diagnostics?: PipedriveDiagnostics }> {
    const startTime = Date.now()
    
    const result = await this.makeApiRequest('/users/me', {}, {
      endpoint: '/users/me',
      method: 'GET',
      testConnection: true,
    })
    
    const responseTime = Date.now() - startTime
    
    if (result.success) {
      return {
        success: true,
        user: result.data?.data as PipedriveUser | undefined,
        diagnostics: {
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString(),
          apiVersion: 'v1',
          endpoint: '/users/me',
          ...result.diagnostics,
        }
      }
    }
    
    return {
      success: false,
      error: result.error || 'Failed to connect to Pipedrive API',
      diagnostics: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        apiVersion: 'v1',
        endpoint: '/users/me',
        errorType: result.error ? 'API Error' : 'Network Error',
        ...result.diagnostics,
      }
    }
  }

  /**
   * Create or update a person in Pipedrive
   */
  async createOrUpdatePerson(contact: Contact): Promise<{ success: boolean; personId?: number; error?: string }> {
    try {
      // Check if person already exists
      if (contact.pipedrivePersonId) {
        return await this.updatePerson(contact)
      }

      const personData = this.sanitizeContactData(contact)

      const result = await this.makeApiRequest('/persons', {
        method: 'POST',
        body: JSON.stringify(personData),
      }, {
        contactId: contact.id,
        contactName: contact.name,
        endpoint: '/persons',
        method: 'POST',
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to create person in Pipedrive',
        }
      }

      const personId = (result.data?.data as { id: number } | undefined)?.id
      if (!personId) {
        console.error('Pipedrive API returned no person ID')
        return {
          success: false,
          error: 'Invalid response from Pipedrive API',
        }
      }

      // Update contact with Pipedrive person ID - only if API call succeeded
      try {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { pipedrivePersonId: personId.toString() },
        })
      } catch (dbError) {
        console.error('Database update failed after successful Pipedrive API call:', dbError)
        return {
          success: false,
          error: 'Failed to create person in Pipedrive',
        }
      }

      return {
        success: true,
        personId,
      }
    } catch (error) {
      console.error('Pipedrive API error:', error)
      return {
        success: false,
        error: 'Failed to create person in Pipedrive',
      }
    }
  }

  /**
   * Update an existing person in Pipedrive
   */
  private async updatePerson(contact: Contact): Promise<{ success: boolean; personId?: number; error?: string }> {
    try {
      const personData = this.sanitizeContactData(contact)

      const result = await this.makeApiRequest(`/persons/${contact.pipedrivePersonId}`, {
        method: 'PUT',
        body: JSON.stringify(personData),
      }, {
        contactId: contact.id,
        contactName: contact.name,
        pipedrivePersonId: contact.pipedrivePersonId,
        endpoint: `/persons/${contact.pipedrivePersonId}`,
        method: 'PUT',
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to update person in Pipedrive',
        }
      }

      return {
        success: true,
        personId: (result.data?.data as { id: number } | undefined)?.id,
      }
    } catch (error) {
      console.error('Pipedrive API error:', error)
      return {
        success: false,
        error: 'Failed to update person in Pipedrive',
      }
    }
  }

  /**
   * Create an activity in Pipedrive
   */
  async createActivity(activity: Activity & { contact?: { pipedrivePersonId?: string | null } }): Promise<{ success: boolean; activityId?: number; error?: string }> {
    try {
      // Sanitize and validate activity data
      const sanitizedSubject = pipedriveConfig.enableDataSanitization 
        ? this.sanitizeString(activity.subject || 'Activity', pipedriveConfig.maxSubjectLength)
        : (activity.subject || 'Activity')
      const sanitizedNote = pipedriveConfig.enableDataSanitization 
        ? this.sanitizeString(activity.note, pipedriveConfig.maxNoteLength)
        : activity.note
      
      const activityData = {
        subject: sanitizedSubject,
        type: this.mapActivityType(activity.type),
        due_date: activity.dueDate ? this.formatDate(activity.dueDate) : undefined,
        due_time: activity.dueDate ? this.formatTime(activity.dueDate) : undefined,
        note: sanitizedNote,
        person_id: activity.contact?.pipedrivePersonId ? parseInt(activity.contact.pipedrivePersonId) : undefined,
      }

      const result = await this.makeApiRequest('/activities', {
        method: 'POST',
        body: JSON.stringify(activityData),
      }, {
        activityId: activity.id,
        activityType: activity.type,
        endpoint: '/activities',
        method: 'POST',
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to create activity in Pipedrive',
        }
      }

      return {
        success: true,
        activityId: (result.data?.data as { id: number } | undefined)?.id,
      }
    } catch (error) {
      console.error('Pipedrive API error:', error)
      return {
        success: false,
        error: 'Failed to create activity in Pipedrive',
      }
    }
  }

  /**
   * Get all persons from Pipedrive
   */
  async getPersons(): Promise<{ success: boolean; persons?: PipedrivePerson[]; error?: string }> {
    try {
      const result = await this.makeApiRequest('/persons', {}, {
        endpoint: '/persons',
        method: 'GET',
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch persons from Pipedrive',
        }
      }

      return {
        success: true,
        persons: result.data?.data as PipedrivePerson[] | undefined,
      }
    } catch (error) {
      console.error('Pipedrive API error:', error)
      return {
        success: false,
        error: 'Failed to fetch persons from Pipedrive',
      }
    }
  }

  /**
   * Get all organizations from Pipedrive
   */
  async getOrganizations(): Promise<{ success: boolean; organizations?: PipedriveOrganization[]; error?: string }> {
    try {
      const result = await this.makeApiRequest('/organizations', {}, {
        endpoint: '/organizations',
        method: 'GET',
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch organizations from Pipedrive',
        }
      }

      return {
        success: true,
        organizations: result.data?.data as PipedriveOrganization[] | undefined,
      }
    } catch (error) {
      console.error('Pipedrive API error:', error)
      return {
        success: false,
        error: 'Failed to fetch organizations from Pipedrive',
      }
    }
  }

  /**
   * Search organizations in Pipedrive by name
   */
  async searchOrganizations(query: string): Promise<{ success: boolean; organizations?: PipedriveOrganization[]; error?: string }> {
    try {
      const result = await this.makeApiRequest(`/organizations/search?term=${encodeURIComponent(query)}`, {}, {
        endpoint: '/organizations/search',
        method: 'GET',
        searchQuery: query,
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to search organizations from Pipedrive',
        }
      }

      const organizations = (result.data?.data as { items?: unknown[] } | undefined)?.items || []
      
      // Transform the search results to match our PipedriveOrganization interface
      const transformedOrganizations = organizations.map((item: unknown) => {
        const typedItem = item as { item?: PipedriveOrganization; id?: number; name?: string; address?: string; created?: string; updated?: string }
                return {
          id: typedItem.item?.id || typedItem.id || 0,
          name: typedItem.item?.name || typedItem.name || '',
          address: typedItem.item?.address || typedItem.address,
          created: typedItem.item?.created || typedItem.created || '',
          updated: typedItem.item?.updated || typedItem.updated || '',
        }
      })

      return {
        success: true,
        organizations: transformedOrganizations,
      }
    } catch (error) {
      console.error('Pipedrive search error:', error)
      return {
        success: false,
        error: 'Failed to search organizations from Pipedrive',
      }
    }
  }

  /**
   * Search persons in Pipedrive by name or email
   */
  async searchPersons(query: string): Promise<PipedrivePerson[]> {
    try {
      // Search by name
      const nameResult = await this.makeApiRequest(`/persons/search?term=${encodeURIComponent(query)}`, {}, {
        endpoint: '/persons/search',
        method: 'GET',
        searchQuery: query,
      })

      if (!nameResult.success) {
        console.error('Pipedrive search failed:', nameResult.error)
        return []
      }

      const persons = (nameResult.data?.data as { items?: unknown[] } | undefined)?.items || []
      
      // Transform the search results to match our PipedrivePerson interface
      return persons.map((item: unknown) => {
        const typedItem = item as { item?: PipedrivePerson; id?: number; name?: string; email?: string[]; phone?: string[]; org_name?: string; org_id?: number; created?: string; updated?: string }
        return {
          id: typedItem.item?.id || typedItem.id || 0,
          name: typedItem.item?.name || typedItem.name || '',
          email: typedItem.item?.email || typedItem.email || [],
          phone: typedItem.item?.phone || typedItem.phone || [],
          org_name: typedItem.item?.org_name || typedItem.org_name,
          org_id: typedItem.item?.org_id || typedItem.org_id,
          created: typedItem.item?.created || typedItem.created || '',
          updated: typedItem.item?.updated || typedItem.updated || '',
        }
      })
    } catch (error) {
      console.error('Pipedrive search error:', error)
      return []
    }
  }

  /**
   * Map internal activity type to Pipedrive activity type
   */
  private mapActivityType(type: ActivityType): string {
    const typeMap: Record<ActivityType, string> = {
      CALL: 'call',
      EMAIL: 'email',
      MEETING: 'meeting',
      LINKEDIN: 'task',
      REFERRAL: 'task',
      CONFERENCE: 'meeting',
    }
    return typeMap[type] || 'task'
  }

  /**
   * Format date for Pipedrive API
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  /**
   * Format time for Pipedrive API
   */
  private formatTime(date: Date): string {
    return date.toTimeString().split(' ')[0]
  }

  /**
   * Sanitize string data to prevent XSS and ensure valid length
   */
  private sanitizeString(value: string | null | undefined, maxLength: number): string | undefined {
    if (!value) return undefined
    
    // Remove HTML tags and scripts
    const sanitized = value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim()
    
    // Truncate if too long
    return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized
  }

  /**
   * Sanitize contact data before sending to Pipedrive
   */
  private sanitizeContactData(contact: Contact) {
    if (!pipedriveConfig.enableDataSanitization) {
      return {
        name: contact.name || 'Unknown Contact',
        email: contact.email ? [contact.email] : [],
        phone: contact.phone ? [contact.phone] : [],
        org_name: contact.organisation,
      }
    }
    
    return {
      name: this.sanitizeString(contact.name, pipedriveConfig.maxNameLength) || 'Unknown Contact',
      email: contact.email ? [this.sanitizeString(contact.email, pipedriveConfig.maxEmailLength)] : [],
      phone: contact.phone ? [this.sanitizeString(contact.phone, pipedriveConfig.maxPhoneLength)] : [],
      org_name: this.sanitizeString(contact.organisation, pipedriveConfig.maxOrgNameLength),
    }
  }

  /**
   * Make a safe API request with retry logic and error handling
   */
  private async makeApiRequest(
    endpoint: string,
    options: RequestInit = {},
    context: Record<string, unknown> = {}
  ): Promise<{ success: boolean; data?: PipedriveApiResponse<unknown>; error?: string; diagnostics?: PipedriveDiagnostics }> {
    // Use query parameter authentication instead of Bearer token
    const separator = endpoint.includes('?') ? '&' : '?'
    const url = `${this.baseUrl}${endpoint}${separator}api_token=${this.apiKey}`
    
    const requestOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    const maxRetries = pipedriveConfig.enableRetries ? pipedriveConfig.maxRetries : 0
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const response = await fetch(url, requestOptions)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          
          // Handle specific error cases
          if (response.status === 429 && pipedriveConfig.enableRateLimiting) {
            const retryAfter = response.headers.get('retry-after')
            console.error(`Pipedrive rate limit exceeded. Retry after ${retryAfter} seconds`)
            return {
              success: false,
              error: 'Rate limit exceeded',
              diagnostics: {
                retryAfter: retryAfter,
                attempt,
                ...context,
              }
            }
          }
          
          if (response.status === 401) {
            console.error('Pipedrive API key expired or invalid')
            return {
              success: false,
              error: 'API key expired',
              diagnostics: {
                attempt,
                ...context,
              }
            }
          }

          // Log detailed error information
          if (pipedriveConfig.enableDetailedLogging) {
            console.error('Pipedrive API error:', {
              status: response.status,
              statusText: response.statusText,
              endpoint,
              method: options.method || 'GET',
              ...context,
              ...errorData,
            })
          }

          return {
            success: false,
            error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
            diagnostics: {
              attempt,
              ...context,
            }
          }
        }

        const data = await response.json()
        return { success: true, data, diagnostics: { attempt, ...context } }

      } catch (error) {
        console.error(`Pipedrive API request failed (attempt ${attempt}):`, error)
        
        if (attempt <= maxRetries) {
          const delay = pipedriveConfig.retryDelay * Math.pow(2, attempt - 1)
          console.log(`Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        } else {
          return {
            success: false,
            error: 'Failed to connect to Pipedrive API',
            diagnostics: {
              attempt,
              ...context,
            }
          }
        }
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
      diagnostics: {
        attempt: maxRetries + 1,
        ...context,
      }
    }
  }
}

/**
 * Factory function to create PipedriveService for a user
 */
export async function createPipedriveService(userId: string): Promise<PipedriveService | null> {
  try {
    // Validate user ID format
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('Invalid user ID provided to createPipedriveService')
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pipedriveApiKey: true },
    })

    if (!user) {
      console.error(`User not found: ${userId}`)
      return null
    }

    if (!user.pipedriveApiKey || user.pipedriveApiKey.trim() === '') {
      console.error(`No Pipedrive API key configured for user: ${userId}`)
      return null
    }

    return new PipedriveService(user.pipedriveApiKey)
  } catch (error) {
    console.error('Failed to create Pipedrive service:', error)
    return null
  }
} 
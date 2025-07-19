import { prisma } from '@/lib/prisma'
import type { Contact, Activity, ActivityType } from '@prisma/client'
import { pipedriveConfig, getPipedriveApiUrl, validatePipedriveConfig } from '@/lib/pipedrive-config'
import { decryptApiKey } from '@/lib/apiKeyEncryption'

export interface PipedrivePerson {
  id: number
  name: string
  email: Array<{
    label: string
    value: string
    primary: boolean
  }>
  phone: Array<{
    label: string
    value: string
    primary: boolean
  }>
  org_id?: {
    name: string
    people_count: number
    owner_id: number
    address?: string | null
    label_ids: number[]
    active_flag: boolean
    cc_email?: string
    owner_name: string
    value: number
  } | number
  created: string
  updated: string
  custom_fields?: Record<string, unknown>
  update_time?: number
  
  // Activity and engagement fields
  last_activity_date?: string
  last_activity_id?: number
  activities_count?: number
  
  // Deal counts
  open_deals_count?: number
  closed_deals_count?: number
  won_deals_count?: number
  lost_deals_count?: number
  related_open_deals_count?: number
  related_closed_deals_count?: number
  related_won_deals_count?: number
  related_lost_deals_count?: number
  
  // Email activity
  email_messages_count?: number
  last_incoming_mail_time?: string
  last_outgoing_mail_time?: string
  
  // Social and metadata
  followers_count?: number
  job_title?: string
  
  // Additional fields that might be available
  [key: string]: unknown
}

export interface PipedriveCustomField {
  id: number
  name: string
  key: string
  field_type: string
  options?: Array<{
    id: number
    label: string
    value: string
  }>
}

export interface PipedriveCustomFieldMapping {
  stillActiveFieldKey?: string
  activeValue?: string
  campaignFieldKey?: string
  warmnessScoreFieldKey?: string
  lastContactedFieldKey?: string
  // Add new field mappings
  sectorFieldKey?: string
  countryFieldKey?: string
  sizeFieldKey?: string
}

// Alias for backward compatibility
export type PipedriveContact = PipedrivePerson

export interface PipedriveOrganization {
  id: number
  name: string
  address?: string
  visible_to?: number
  owner_id?: number
  cc_email?: string
  created: string
  updated: string
  country?: string | number  // Pipedrive can return this as either string or number
  sector?: string | number  // Pipedrive can return this as either string or number
  size?: string | number    // Pipedrive can return this as either string or number
  website?: string
  city?: string
}

export interface PipedriveActivity {
  id: number
  subject: string
  type: string
  due_date?: string
  due_time?: string
  duration?: string
  note?: string
  person_id?: number
  org_id?: number
  user_id?: number
  done: boolean
  done_time?: string
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
  private requestCount = 0
  private lastResetTime = Date.now()
  private readonly RATE_LIMIT = 100 // requests per 10 seconds
  private readonly RESET_INTERVAL = 10000 // 10 seconds
  // Add field mapping cache
  private fieldMappings: PipedriveCustomFieldMapping | null = null
  private fieldMappingsTimestamp: number = 0
  private readonly FIELD_MAPPINGS_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

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
   * Check and enforce rate limiting
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now()
    
    // Reset counter if interval has passed
    if (now - this.lastResetTime >= this.RESET_INTERVAL) {
      this.requestCount = 0
      this.lastResetTime = now
    }

    // Check if we're at the limit
    if (this.requestCount >= this.RATE_LIMIT) {
      const waitTime = this.RESET_INTERVAL - (now - this.lastResetTime)
      console.log(`Pipedrive rate limit reached. Waiting ${waitTime}ms before next request`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.requestCount = 0
      this.lastResetTime = Date.now()
    }

    this.requestCount++
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
   * Create a person in Pipedrive
   */
  async createPerson(personData: {
    name: string;
    email?: string[];
    phone?: string[];
    org_id?: number;
    custom_fields?: Record<string, unknown>;
    owner_id?: number;
  }): Promise<{ success: boolean; personId?: number; error?: string }> {
    try {
      console.log('Creating person in Pipedrive with data:', JSON.stringify(personData, null, 2));
      
      const result = await this.makeApiRequest('/persons', {
        method: 'POST',
        body: JSON.stringify(personData),
      }, {
        endpoint: '/persons',
        method: 'POST',
      })

      if (!result.success) {
        console.error('Failed to create person in Pipedrive:', result.error);
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

      console.log('Successfully created person in Pipedrive with ID:', personId);
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
   * Create or update a person in Pipedrive
   */
  async createOrUpdatePerson(contact: Contact): Promise<{ success: boolean; personId?: number; error?: string }> {
    try {
      // Check if person already exists
      if (contact.pipedrivePersonId) {
        return await this.updatePersonFromContact(contact)
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
  async updatePerson(personId: string, personData: {
    name?: string;
    email?: string[];
    phone?: string[];
    org_id?: number;
    custom_fields?: Record<string, unknown>;
    owner_id?: number;
  }): Promise<{ success: boolean; personId?: number; error?: string }> {
    try {
      const result = await this.makeApiRequest(`/persons/${personId}`, {
        method: 'PUT',
        body: JSON.stringify(personData),
      }, {
        pipedrivePersonId: personId,
        endpoint: `/persons/${personId}`,
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
   * Update an existing person in Pipedrive (private method for Contact objects)
   */
  private async updatePersonFromContact(contact: Contact): Promise<{ success: boolean; personId?: number; error?: string }> {
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
  async createActivity(activity: Activity & { 
    contact?: { 
      pipedrivePersonId?: string | null; 
      pipedriveOrgId?: string | null;
      name?: string;
      organisation?: string | null;
    };
    user?: {
      name?: string | null;
      email?: string | null;
    };
    campaign?: {
      name?: string | null;
      shortcode?: string | null;
    };
  }): Promise<{ success: boolean; activityId?: number; error?: string }> {
    try {
      // Create more descriptive fallbacks based on activity type and context
      const getDefaultSubject = (type: ActivityType, context: {
        contactName?: string;
        userName?: string;
        campaignName?: string;
        campaignShortcode?: string;
      }): string => {
        const { contactName, userName, campaignName } = context;
        const contactContext = contactName ? ` - ${contactName}` : '';
        const userContext = userName ? ` by ${userName}` : '';
        const campaignContext = campaignName ? ` (${campaignName})` : '';
        
        switch (type) {
          case 'CALL': return `📞 Phone Call${contactContext}${userContext}${campaignContext}`;
          case 'EMAIL': return `📧 Email Communication${contactContext}${userContext}${campaignContext}`;
          case 'MEETING': return `🤝 Meeting${contactContext}${userContext}${campaignContext}`;
          case 'MEETING_REQUEST': return `🍽️ Meeting Request${contactContext}${userContext}${campaignContext}`;
          case 'LINKEDIN': return `💼 LinkedIn Engagement${contactContext}${userContext}${campaignContext}`;
          case 'REFERRAL': return `🔄 Referral Activity${contactContext}${userContext}${campaignContext}`;
          case 'CONFERENCE': return `🎤 Conference Meeting${contactContext}${userContext}${campaignContext}`;
          default: return `📋 Activity${contactContext}${userContext}${campaignContext}`;
        }
      }

      const getDefaultNote = (type: ActivityType, context: {
        contactName?: string;
        userName?: string;
        campaignName?: string;
        organisation?: string;
      }): string => {
        const { contactName, userName, campaignName, organisation } = context;
        const contactContext = contactName ? ` with ${contactName}` : ' with contact';
        const userContext = userName ? ` by ${userName}` : '';
        const campaignContext = campaignName ? ` as part of ${campaignName} campaign` : '';
        const orgContext = organisation ? ` from ${organisation}` : '';
        
        switch (type) {
          case 'CALL': return `📞 Phone call${contactContext}${orgContext}${userContext}${campaignContext}`;
          case 'EMAIL': return `📧 Email communication${contactContext}${orgContext}${userContext}${campaignContext}`;
          case 'MEETING': return `🤝 Meeting${contactContext}${orgContext}${userContext}${campaignContext}`;
          case 'MEETING_REQUEST': return `🍽️ Meeting request sent${contactContext}${orgContext}${userContext}${campaignContext}`;
          case 'LINKEDIN': return `💼 LinkedIn engagement${contactContext}${orgContext}${userContext}${campaignContext}`;
          case 'REFERRAL': return `🔄 Referral activity${contactContext}${orgContext}${userContext}${campaignContext}`;
          case 'CONFERENCE': return `🎤 Conference meeting at conference event${contactContext}${orgContext}${userContext}${campaignContext}`;
          default: return `📋 Activity logged${contactContext}${orgContext}${userContext}${campaignContext}`;
        }
      }

      // Build context for better descriptions
      const context = {
        contactName: activity.contact?.name,
        userName: activity.user?.name || undefined,
        campaignName: activity.campaign?.name || undefined,
        campaignShortcode: activity.campaign?.shortcode || undefined,
        organisation: activity.contact?.organisation || undefined
      };

      // Always include shortcode in subject if available
      const baseSubject = activity.subject || getDefaultSubject(activity.type, context)
      const subjectWithShortcode = context.campaignShortcode 
        ? `[CMPGN-${context.campaignShortcode}] ${baseSubject}`
        : baseSubject
      
      // Sanitize and validate activity data with better fallbacks
      const sanitizedSubject = pipedriveConfig.enableDataSanitization 
        ? this.sanitizeString(subjectWithShortcode, pipedriveConfig.maxSubjectLength)
        : subjectWithShortcode
      const sanitizedNote = pipedriveConfig.enableDataSanitization 
        ? this.sanitizeString(activity.note || getDefaultNote(activity.type, context), pipedriveConfig.maxNoteLength)
        : (activity.note || getDefaultNote(activity.type, context))
      
      const activityData = {
        subject: sanitizedSubject,
        type: this.mapActivityType(activity.type),
        due_date: activity.dueDate ? this.formatDate(activity.dueDate) : undefined,
        due_time: activity.dueDate ? this.formatTime(activity.dueDate) : undefined,
        note: sanitizedNote,
        person_id: activity.contact?.pipedrivePersonId ? parseInt(activity.contact.pipedrivePersonId) : undefined,
        org_id: activity.contact?.pipedriveOrgId ? parseInt(activity.contact.pipedriveOrgId) : undefined,
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
   * Update an activity in Pipedrive
   */
  async updateActivity(activityId: string, activityData: {
    subject?: string;
    type?: string;
    due_date?: string;
    due_time?: string;
    note?: string;
    person_id?: number;
    org_id?: number;
    done?: boolean;
  }): Promise<{ success: boolean; activityId?: number; error?: string }> {
    try {
      const result = await this.makeApiRequest(`/activities/${activityId}`, {
        method: 'PUT',
        body: JSON.stringify(activityData),
      }, {
        activityId,
        endpoint: `/activities/${activityId}`,
        method: 'PUT',
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to update activity in Pipedrive',
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
        error: 'Failed to update activity in Pipedrive',
      }
    }
  }

  /**
   * Get all persons from Pipedrive using the "Persons Still Active - Pipedriver" filter
   */
  async getPersons(): Promise<{ success: boolean; persons?: PipedrivePerson[]; error?: string }> {
    try {
      const allPersons: PipedrivePerson[] = []
      const limit = 100
      let start = 0
      let fetched = 0
      let keepFetching = true

      // Get the "Persons Still Active - Pipedriver" filter ID
      const filterResult = await this.getStillActiveFilter()
      
      if (!filterResult.success) {
        return {
          success: false,
          error: filterResult.error
        }
      }

      // Use the filter to get only active contacts
      const endpoint = `/persons?start=${start}&limit=${limit}&filter_id=${filterResult.filterId}&include_custom_fields=1&include_activities=1&include_deals=1`
      console.log('Using "Persons Still Active - Pipedriver" filter for sync')

      // Use the filter to get only active contacts
      while (keepFetching) {
        // Try to include more data by adding additional parameters
        const currentEndpoint = endpoint.replace(`start=${start - fetched}`, `start=${start}`)
        
        const result = await this.makeApiRequest(currentEndpoint, {}, {
          endpoint: '/persons',
          method: 'GET',
        })

        if (!result.success) {
          return {
            success: false,
            error: result.error || 'Failed to fetch persons from Pipedrive',
          }
        }

        // Log the first person to see what fields are available
        if (start === 0 && result.data?.data && Array.isArray(result.data.data) && result.data.data.length > 0) {
          console.log('Sample Pipedrive person data:', JSON.stringify(result.data.data[0], null, 2))
        }

        const persons = result.data?.data as PipedrivePerson[] | undefined || []
        allPersons.push(...persons)
        fetched = persons.length
        start += fetched
        keepFetching = fetched === limit
      }

      return {
        success: true,
        persons: allPersons
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
   * Get the "Persons Still Active - Pipedriver" filter ID
   */
  async getStillActiveFilter(): Promise<{ success: boolean; filterId?: number; error?: string }> {
    try {
      const result = await this.makeApiRequest('/filters?type=people', {}, {
        endpoint: '/filters',
        method: 'GET',
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch filters from Pipedrive',
        }
      }

      const filters = result.data?.data as Array<{ id: number; name: string }> | undefined || []
      
      // Find the "Persons Still Active - Pipedriver" filter
      const stillActiveFilter = filters.find(filter => 
        filter.name === 'Persons Still Active - Pipedriver'
      )

      if (stillActiveFilter) {
        return {
          success: true,
          filterId: stillActiveFilter.id
        }
      }
      return {
        success: false,
        error: 'Required Pipedrive filter "Persons Still Active - Pipedriver" not found. Please ensure this filter exists in your Pipedrive account.'
      }
    } catch (error) {
      console.error('Pipedrive API error:', error)
      return {
        success: false,
        error: 'Failed to fetch filters from Pipedrive',
      }
    }
  }

  /**
   * Create an organization in Pipedrive
   */
  async createOrganization(orgData: {
    name: string;
    industry?: string;
    country?: string;
    address?: string;
  }): Promise<{ success: boolean; orgId?: number; error?: string }> {
    try {
      const result = await this.makeApiRequest('/organizations', {
        method: 'POST',
        body: JSON.stringify(orgData),
      }, {
        endpoint: '/organizations',
        method: 'POST',
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to create organization in Pipedrive',
        }
      }

      const orgId = (result.data?.data as { id: number } | undefined)?.id
      if (!orgId) {
        console.error('Pipedrive API returned no organization ID')
        return {
          success: false,
          error: 'Invalid response from Pipedrive API',
        }
      }

      return {
        success: true,
        orgId,
      }
    } catch (error) {
      console.error('Pipedrive API error:', error)
      return {
        success: false,
        error: 'Failed to create organization in Pipedrive',
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
   * Get detailed information for a specific organization
   */
  async getOrganizationDetails(orgId: number): Promise<{ success: boolean; organization?: PipedriveOrganization; error?: string }> {
    try {
      const result = await this.makeApiRequest(`/organizations/${orgId}`, {}, {
        endpoint: `/organizations/${orgId}`,
        method: 'GET',
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch organization details from Pipedrive',
        }
      }

      // Debug: Log the raw API response
      console.log(`[getOrganizationDetails] Raw API response for org ${orgId}:`, JSON.stringify(result.data?.data, null, 2))

      return {
        success: true,
        organization: result.data?.data as PipedriveOrganization | undefined,
      }
    } catch (error) {
      console.error('Pipedrive API error:', error)
      return {
        success: false,
        error: 'Failed to fetch organization details from Pipedrive',
      }
    }
  }

  /**
   * Get custom fields for persons
   */
  async getPersonCustomFields(): Promise<{ success: boolean; fields?: PipedriveCustomField[]; error?: string }> {
    try {
      const result = await this.makeApiRequest('/personFields', {}, {
        endpoint: '/personFields',
        method: 'GET',
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch person custom fields from Pipedrive',
        }
      }

      return {
        success: true,
        fields: result.data?.data as PipedriveCustomField[] | undefined,
      }
    } catch (error) {
      console.error('Pipedrive API error:', error)
      return {
        success: false,
        error: 'Failed to fetch person custom fields from Pipedrive',
      }
    }
  }

  /**
   * Get custom fields for organizations
   */
  async getOrganizationCustomFields(): Promise<{ success: boolean; fields?: PipedriveCustomField[]; error?: string }> {
    try {
      const result = await this.makeApiRequest('/organizationFields', {}, {
        endpoint: '/organizationFields',
        method: 'GET',
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch organization custom fields from Pipedrive',
        }
      }

      return {
        success: true,
        fields: result.data?.data as PipedriveCustomField[] | undefined,
      }
    } catch (error) {
      console.error('Pipedrive API error:', error)
      return {
        success: false,
        error: 'Failed to fetch organization custom fields from Pipedrive',
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
    console.log('[PipedriveService] searchPersons called with query:', query);
    
    try {
      // Search by name
      const searchUrl = `/persons/search?term=${encodeURIComponent(query)}`;
      console.log('[PipedriveService] Making API request to:', searchUrl);
      
      const nameResult = await this.makeApiRequest(searchUrl, {}, {
        endpoint: '/persons/search',
        method: 'GET',
        searchQuery: query,
      })

      console.log('[PipedriveService] API response success:', nameResult.success);
      if (!nameResult.success) {
        console.error('[PipedriveService] Pipedrive search failed:', nameResult.error);
        return [];
      }

      console.log('[PipedriveService] Raw API response data:', JSON.stringify(nameResult.data, null, 2));
      
      const persons = (nameResult.data?.data as { items?: unknown[] } | undefined)?.items || [];
      console.log('[PipedriveService] Found persons in response:', persons.length);
      
      // Transform the search results to match our PipedrivePerson interface
      const transformedPersons = persons.map((item: unknown) => {
        const typedItem = item as { 
          item?: { 
            id?: number; 
            name?: string; 
            emails?: string[]; 
            phones?: string[]; 
            organization?: { name?: string; id?: number }; 
            org_name?: string; 
            org_id?: number; 
            created?: string; 
            updated?: string;
            custom_fields?: Record<string, unknown>;
          }; 
          id?: number; 
          name?: string; 
          email?: string[]; 
          phone?: string[]; 
          org_name?: string; 
          org_id?: number; 
          created?: string; 
          updated?: string;
        }
        
        // Extract the actual person data from the search result structure
        const personData = typedItem.item || typedItem;
        
        // Transform email and phone to the correct format
        const transformContactInfo = (info: string[] | undefined): Array<{ label: string; value: string; primary: boolean }> => {
          if (!info || !Array.isArray(info)) return []
          return info.map((value, index) => ({
            label: index === 0 ? 'primary' : `secondary_${index}`,
            value,
            primary: index === 0
          }))
        }
        
        const getProp = (obj: Record<string, unknown>, ...props: string[]) => {
          for (const prop of props) {
            if (obj && obj[prop] !== undefined) return obj[prop]
          }
          return undefined
        }
        
                  const personItem = ((personData as Record<string, unknown>).item || personData) as Record<string, unknown>
        const transformed = {
          id: (getProp(personItem, 'id') as number) || 0,
                      name: (getProp(personItem, 'name') as string) || '',
                      email: transformContactInfo(getProp(personItem, 'emails', 'email') as string[] | undefined),
                      phone: transformContactInfo(getProp(personItem, 'phones', 'phone') as string[] | undefined),
                      org_name: (getProp(personItem, 'organization') as Record<string, unknown>)?.name as string || (getProp(personItem, 'org_name') as string),
                      org_id: (getProp(personItem, 'organization') as Record<string, unknown>)?.id as number || (getProp(personItem, 'org_id') as number),
                      created: (getProp(personItem, 'created') as string) || '',
                      updated: (getProp(personItem, 'updated') as string) || '',
                      custom_fields: getProp(personItem, 'custom_fields') as Record<string, unknown>
        };
        
        console.log('[PipedriveService] Transformed person:', transformed.name, 'ID:', transformed.id, 'Email:', transformed.email[0]?.value);
        return transformed;
      });
      
      console.log('[PipedriveService] Returning', transformedPersons.length, 'transformed persons');
      return transformedPersons;
    } catch (error) {
      console.error('[PipedriveService] Pipedrive search error:', error);
      return [];
    }
  }

  /**
   * Discover and map custom fields for persons
   */
  async discoverCustomFieldMappings(): Promise<{ success: boolean; mappings?: PipedriveCustomFieldMapping; error?: string }> {
    try {
      const customFieldsResult = await this.getPersonCustomFields()
      
      if (!customFieldsResult.success || !customFieldsResult.fields) {
        return {
          success: false,
          error: 'Failed to fetch custom fields'
        }
      }

      const fields = customFieldsResult.fields as PipedriveCustomField[]
      const mappings: PipedriveCustomFieldMapping = {}

      // Find "Still Active?" field
      const stillActiveField = fields.find(field => 
        field.name && (
          field.name === 'Still Active?' ||
          field.name.toLowerCase().includes('still active') ||
          field.name.toLowerCase().includes('active') ||
          field.name.toLowerCase().includes('status')
        )
      )

      if (stillActiveField) {
        mappings.stillActiveFieldKey = stillActiveField.key
        
        // Find the "Active" option
        if (stillActiveField.options && Array.isArray(stillActiveField.options)) {
          const activeOption = stillActiveField.options.find(option => 
            option.label && option.label.toLowerCase().includes('active')
          )
          if (activeOption) {
            mappings.activeValue = activeOption.value || activeOption.label
          }
        }
      }

      // Find campaign field
      const campaignField = fields.find(field => 
        field.name && field.name.toLowerCase().includes('campaign')
      )
      if (campaignField) {
        mappings.campaignFieldKey = campaignField.key
      }

      // Find warmness score field
      const warmnessField = fields.find(field => 
        field.name && (
          field.name.toLowerCase().includes('warmness') ||
          field.name.toLowerCase().includes('score') ||
          field.name.toLowerCase().includes('priority')
        )
      )
      if (warmnessField) {
        mappings.warmnessScoreFieldKey = warmnessField.key
      }

      // Find last contacted field
      const lastContactedField = fields.find(field => 
        field.name && (
          field.name.toLowerCase().includes('last contacted') ||
          field.name.toLowerCase().includes('last contact') ||
          field.name.toLowerCase().includes('contacted')
        )
      )
      if (lastContactedField) {
        mappings.lastContactedFieldKey = lastContactedField.key
      }

      return {
        success: true,
        mappings
      }
    } catch (error) {
      console.error('Error discovering custom field mappings:', error)
      return {
        success: false,
        error: 'Failed to discover custom field mappings'
      }
    }
  }

  /**
   * Discover and cache custom field mappings for Size, Country, and Sector
   */
  async discoverFieldMappings(): Promise<{ success: boolean; mappings?: PipedriveCustomFieldMapping; error?: string }> {
    try {
      // Check if we have cached mappings that are still valid
      const now = Date.now()
      if (this.fieldMappings && (now - this.fieldMappingsTimestamp) < this.FIELD_MAPPINGS_CACHE_DURATION) {
        console.log('[discoverFieldMappings] Using cached field mappings')
        return { success: true, mappings: this.fieldMappings }
      }

      console.log('[discoverFieldMappings] Discovering field mappings...')
      
      const customFieldsResult = await this.getOrganizationCustomFields()
      if (!customFieldsResult.success || !customFieldsResult.fields) {
        return {
          success: false,
          error: 'Failed to fetch organization custom fields'
        }
      }

      const mappings: PipedriveCustomFieldMapping = {}
      
      for (const field of customFieldsResult.fields) {
        const fieldNameLower = field.name.toLowerCase()
        
        if (fieldNameLower.includes('size')) {
          mappings.sizeFieldKey = field.key
          console.log(`[discoverFieldMappings] Found Size field: ${field.name} (${field.key})`)
        } else if (fieldNameLower.includes('country')) {
          mappings.countryFieldKey = field.key
          console.log(`[discoverFieldMappings] Found Country field: ${field.name} (${field.key})`)
        } else if (fieldNameLower.includes('sector') || fieldNameLower.includes('industry')) {
          mappings.sectorFieldKey = field.key
          console.log(`[discoverFieldMappings] Found Sector field: ${field.name} (${field.key})`)
        }
      }

      // Cache the mappings
      this.fieldMappings = mappings
      this.fieldMappingsTimestamp = now

      console.log('[discoverFieldMappings] Field mappings discovered:', mappings)
      return { success: true, mappings }
    } catch (error) {
      console.error('Error discovering field mappings:', error)
      return {
        success: false,
        error: 'Failed to discover field mappings'
      }
    }
  }

  /**
   * Get the current field mappings (with caching)
   */
  async getFieldMappings(): Promise<PipedriveCustomFieldMapping> {
    const result = await this.discoverFieldMappings()
    return result.success ? result.mappings || {} : {}
  }

  /**
   * Get activities for a specific person from Pipedrive
   */
  async getPersonActivities(personId: number): Promise<{ success: boolean; activities?: PipedriveActivity[]; error?: string }> {
    try {
      const allActivities: PipedriveActivity[] = []
      const limit = 100
      let start = 0
      let fetched = 0
      let keepFetching = true

      while (keepFetching) {
        const endpoint = `/activities?start=${start}&limit=${limit}&person_id=${personId}`
        
        const result = await this.makeApiRequest(endpoint, {}, {
          personId,
          endpoint: '/activities',
          method: 'GET',
        })

        if (!result.success) {
          return {
            success: false,
            error: result.error || 'Failed to fetch activities from Pipedrive',
          }
        }

        const activities = result.data?.data as PipedriveActivity[] | undefined || []
        allActivities.push(...activities)
        fetched = activities.length
        start += fetched
        keepFetching = fetched === limit
      }

      return {
        success: true,
        activities: allActivities
      }
    } catch (error) {
      console.error('Pipedrive API error:', error)
      return {
        success: false,
        error: 'Failed to fetch activities from Pipedrive',
      }
    }
  }

  /**
   * Get the last contacted date for a person based on their activities
   */
  async getLastContactedDate(personId: number): Promise<{ success: boolean; lastContacted?: Date; error?: string }> {
    try {
      const result = await this.getPersonActivities(personId)
      
      if (!result.success || !result.activities) {
        return {
          success: false,
          error: result.error || 'Failed to fetch activities',
        }
      }

      // Filter for completed activities and sort by completion time
      const completedActivities = result.activities
        .filter(activity => activity.done && activity.done_time)
        .sort((a, b) => {
          const timeA = new Date(a.done_time!).getTime()
          const timeB = new Date(b.done_time!).getTime()
          return timeB - timeA // Most recent first
        })

      if (completedActivities.length === 0) {
        return {
          success: true,
          lastContacted: undefined,
        }
      }

      // Get the most recent completed activity
      const lastActivity = completedActivities[0]
      const lastContacted = new Date(lastActivity.done_time!)

      return {
        success: true,
        lastContacted,
      }
    } catch (error) {
      console.error('Error getting last contacted date:', error)
      return {
        success: false,
        error: 'Failed to determine last contacted date',
      }
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
      MEETING_REQUEST: 'lunch',
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
        // Remove org_name as it's not a valid Pipedrive API field
        // Organization should be created separately and linked via org_id
      }
    }
    
    return {
      name: this.sanitizeString(contact.name, pipedriveConfig.maxNameLength) || 'Unknown Contact',
      email: contact.email ? [this.sanitizeString(contact.email, pipedriveConfig.maxEmailLength)] : [],
      phone: contact.phone ? [this.sanitizeString(contact.phone, pipedriveConfig.maxPhoneLength)] : [],
      // Remove org_name as it's not a valid Pipedrive API field
      // Organization should be created separately and linked via org_id
    }
  }

  /**
   * Translate sector ID to sector name using custom field options
   */
  async translateSectorId(sectorId: number): Promise<string | null> {
    try {
      console.log(`[translateSectorId] Attempting to translate sector ID: ${sectorId}`);
      
      // Get organization custom fields to find sector field options
      const customFieldsResult = await this.getOrganizationCustomFields()
      
      if (!customFieldsResult.success || !customFieldsResult.fields) {
        console.warn('Failed to fetch organization custom fields for sector translation')
        return null
      }

      const fields = customFieldsResult.fields
      console.log(`[translateSectorId] Found ${fields.length} organization custom fields`);
      
      // Log all field names to help debug
      fields.forEach(field => {
        console.log(`[translateSectorId] Field: ${field.name} (${field.key}) - Type: ${field.field_type}`);
      });
      
      // Find the sector field using discovered field mappings
      const fieldMappings = await this.getFieldMappings()
      const sectorField = fields.find(field => 
        field.name && (
          // Look for exact "Sector" field name
          field.name === 'Sector' ||
          // Or use the discovered field key
          (fieldMappings.sectorFieldKey && field.key === fieldMappings.sectorFieldKey)
        )
      )

      // If not found by name, try to find by key
      if (!sectorField) {
        console.log('[translateSectorId] Sector field not found by name, trying to find by key...');
        // Log all field keys to help debug
        fields.forEach(field => {
          console.log(`[translateSectorId] Field key: ${field.key} - Name: ${field.name}`);
        });
      }

      if (!sectorField || !sectorField.options) {
        console.warn('Sector field not found or has no options')
        return null
      }

      console.log(`[translateSectorId] Selected sector field: "${sectorField.name}" (key: ${sectorField.key}) with ${sectorField.options.length} options`);

      // Find the option that matches the sector ID
      const sectorOption = sectorField.options.find(option => 
        option.id === sectorId || 
        parseInt(option.value) === sectorId
      )

      if (sectorOption) {
        console.log(`[translateSectorId] Found matching option: ${sectorOption.label} (${sectorOption.value})`);
        return sectorOption.label || sectorOption.value
      }

      console.warn(`Sector ID ${sectorId} not found in custom field options`)
      return null
    } catch (error) {
      console.error('Error translating sector ID:', error)
      return null
    }
  }

  /**
   * Translate country ID to country name using custom field options
   */
  async translateCountryId(countryId: number): Promise<string | null> {
    try {
      console.log(`[translateCountryId] Attempting to translate country ID: ${countryId}`);
      
      const customFieldsResult = await this.getOrganizationCustomFields();
      if (!customFieldsResult.success || !customFieldsResult.fields) {
        console.warn('Failed to fetch organization custom fields for country translation');
        return null;
      }
      const fields = customFieldsResult.fields;
      console.log(`[translateCountryId] Found ${fields.length} organization custom fields`);
      
      // Log all field names to help debug
      fields.forEach(field => {
        console.log(`[translateCountryId] Field: ${field.name} (${field.key}) - Type: ${field.field_type}`);
      });
      
      // Find the country field using discovered field mappings
      const fieldMappings = await this.getFieldMappings()
      const countryField = fields.find(field =>
        field.name && (
          // Look for exact "Country" field name (not "Country of Address")
          field.name === 'Country' ||
          // Or use the discovered field key
          (fieldMappings.countryFieldKey && field.key === fieldMappings.countryFieldKey)
        )
      );

      // If not found by name, try to find by key
      if (!countryField) {
        console.log('[translateCountryId] Country field not found by name, trying to find by key...');
        // Log all field keys to help debug
        fields.forEach(field => {
          console.log(`[translateCountryId] Field key: ${field.key} - Name: ${field.name}`);
        });
      }
      if (!countryField) {
        console.warn('Country field not found');
        return null;
      }
      
      console.log(`[translateCountryId] Selected country field: "${countryField.name}" (key: ${countryField.key})`);
      console.log(`[translateCountryId] Country field options:`, countryField.options);
      
      if (!countryField.options || countryField.options.length === 0) {
        console.warn('Country field has no options');
        return null;
      }
      
      console.log(`[translateCountryId] Found country field: ${countryField.name} with ${countryField.options.length} options`);
      
      // Log all options to help debug
      console.log(`[translateCountryId] Looking for country ID: ${countryId}`);
      console.log(`[translateCountryId] Available options:`, countryField.options.map(opt => ({ id: opt.id, value: opt.value, label: opt.label })));
      
      const countryOption = countryField.options.find(option =>
        option.id === countryId || parseInt(option.value) === countryId
      );
      if (countryOption) {
        console.log(`[translateCountryId] Found matching option: ${countryOption.label} (${countryOption.value})`);
        return countryOption.label || countryOption.value;
      }
      console.warn(`Country ID ${countryId} not found in custom field options`);
      return null;
    } catch (error) {
      console.error('Error translating country ID:', error);
      return null;
    }
  }

  /**
   * Translate size ID to size label using custom field options
   */
  async translateSizeId(sizeId: number): Promise<string | null> {
    try {
      console.log(`[translateSizeId] Attempting to translate size ID: ${sizeId}`);
      
      const customFieldsResult = await this.getOrganizationCustomFields();
      if (!customFieldsResult.success || !customFieldsResult.fields) {
        console.warn('Failed to fetch organization custom fields for size translation');
        return null;
      }
      const fields = customFieldsResult.fields;
      console.log(`[translateSizeId] Found ${fields.length} organization custom fields`);
      
      // Log all field names to help debug
      fields.forEach(field => {
        console.log(`[translateSizeId] Field: ${field.name} (${field.key}) - Type: ${field.field_type}`);
      });
      
      // Find the size field using discovered field mappings
      const fieldMappings = await this.getFieldMappings()
      const sizeField = fields.find(field =>
        field.name && (
          // Look for exact "Size" field name
          field.name === 'Size' ||
          // Or use the discovered field key
          (fieldMappings.sizeFieldKey && field.key === fieldMappings.sizeFieldKey)
        )
      );

      // If not found by name, try to find by key
      if (!sizeField) {
        console.log('[translateSizeId] Size field not found by name, trying to find by key...');
        // Log all field keys to help debug
        fields.forEach(field => {
          console.log(`[translateSizeId] Field key: ${field.key} - Name: ${field.name}`);
        });
      }
      if (!sizeField || !sizeField.options) {
        console.warn('Size field not found or has no options');
        return null;
      }
      
      console.log(`[translateSizeId] Selected size field: "${sizeField.name}" (key: ${sizeField.key}) with ${sizeField.options.length} options`);
      
      const sizeOption = sizeField.options.find(option =>
        option.id === sizeId || parseInt(option.value) === sizeId
      );
      if (sizeOption) {
        console.log(`[translateSizeId] Found matching option: ${sizeOption.label} (${sizeOption.value})`);
        return sizeOption.label || sizeOption.value;
      }
      console.warn(`Size ID ${sizeId} not found in custom field options`);
      return null;
    } catch (error) {
      console.error('Error translating size ID:', error);
      return null;
    }
  }

  /**
   * Deactivate a contact in Pipedrive by updating the "Still Active?" custom field
   */
  async deactivateContact(personId: number): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Get custom field mappings
      const mappingsResult = await this.discoverCustomFieldMappings()
      
      if (!mappingsResult.success || !mappingsResult.mappings?.stillActiveFieldKey) {
        return {
          success: false,
          error: 'Still Active custom field not found in Pipedrive'
        }
      }

      const mappings = mappingsResult.mappings

      // 2. Find the "Not Active" option value
      const customFieldsResult = await this.getPersonCustomFields()
      if (!customFieldsResult.success || !customFieldsResult.fields) {
        return {
          success: false,
          error: 'Failed to fetch custom fields from Pipedrive'
        }
      }

      const stillActiveField = customFieldsResult.fields.find(
        field => field.key === mappings.stillActiveFieldKey
      )

      if (!stillActiveField?.options) {
        return {
          success: false,
          error: 'Still Active field has no options defined'
        }
      }

      const notActiveOption = stillActiveField.options.find(
        option => option.label.toLowerCase().includes('inactive')
      )

      if (!notActiveOption) {
        return {
          success: false,
          error: 'Inactive option not found in Still Active field'
        }
      }

      // Use the option value if available, otherwise use the label
      const optionValue = notActiveOption.value || notActiveOption.label

      // 3. Update the person's custom field
      const updateData: Record<string, string> = {
        [mappings.stillActiveFieldKey!]: optionValue
      }

      const result = await this.makeApiRequest(`/persons/${personId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      }, {
        endpoint: `/persons/${personId}`,
        method: 'PUT'
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to update contact in Pipedrive'
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error deactivating contact in Pipedrive:', error)
      return {
        success: false,
        error: 'Failed to deactivate contact in Pipedrive'
      }
    }
  }

  /**
   * Reactivate a contact in Pipedrive by updating the "Still Active?" custom field
   */
  async reactivateContact(personId: number): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Get custom field mappings
      const mappingsResult = await this.discoverCustomFieldMappings()
      
      if (!mappingsResult.success || !mappingsResult.mappings?.stillActiveFieldKey) {
        return {
          success: false,
          error: 'Still Active custom field not found in Pipedrive'
        }
      }

      const mappings = mappingsResult.mappings

      // 2. Find the "Active" option value
      const customFieldsResult = await this.getPersonCustomFields()
      if (!customFieldsResult.success || !customFieldsResult.fields) {
        return {
          success: false,
          error: 'Failed to fetch custom fields from Pipedrive'
        }
      }

      const stillActiveField = customFieldsResult.fields.find(
        field => field.key === mappings.stillActiveFieldKey
      )

      if (!stillActiveField?.options) {
        return {
          success: false,
          error: 'Still Active field has no options defined'
        }
      }

      const activeOption = stillActiveField.options.find(
        option => option.label.toLowerCase().includes('active') &&
                  !option.label.toLowerCase().includes('inactive')
      )

      if (!activeOption) {
        return {
          success: false,
          error: 'Active option not found in Still Active field'
        }
      }

      // Use the option value if available, otherwise use the label
      const optionValue = activeOption.value || activeOption.label

      // 3. Update the person's custom field
      if (!mappings.stillActiveFieldKey) {
        return {
          success: false,
          error: 'Still active field key not configured'
        }
      }
      
      const updateData = {
        [mappings.stillActiveFieldKey]: optionValue
      }

      const result = await this.makeApiRequest(`/persons/${personId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      }, {
        endpoint: `/persons/${personId}`,
        method: 'PUT'
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to update contact in Pipedrive'
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error reactivating contact in Pipedrive:', error)
      return {
        success: false,
        error: 'Failed to reactivate contact in Pipedrive'
      }
    }
  }

  /**
   * Make a safe API request with retry logic and error handling
   */
  public async makeApiRequest(
    endpoint: string,
    options: RequestInit = {},
    context: Record<string, unknown> = {}
  ): Promise<{ success: boolean; data?: PipedriveApiResponse<unknown>; error?: string; diagnostics?: PipedriveDiagnostics }> {
    const startTime = Date.now()
    
    // Check rate limiting before making request
    await this.checkRateLimit()
    
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

    // Debug logging for POST requests
    if (options.method === 'POST' && options.body) {
      console.log('Making POST request to:', url);
      console.log('Request body:', options.body);
    }

    const maxRetries = pipedriveConfig.enableRetries ? pipedriveConfig.maxRetries : 0
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const response = await fetch(url, requestOptions)
        
        if (!response.ok) {
          let errorData = {}
          try {
            const responseText = await response.text()
            if (responseText.trim()) {
              errorData = JSON.parse(responseText)
            }
          } catch (parseError) {
            console.warn('Failed to parse error response:', parseError)
          }
          
          // Handle specific error cases
          if (response.status === 429 && pipedriveConfig.enableRateLimiting) {
            const retryAfter = response.headers.get('retry-after')
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : 2000 // Default 2 seconds
            
            console.log(`Pipedrive rate limit exceeded. Retry after ${delay}ms`)
            
            if (attempt <= maxRetries) {
              await new Promise(resolve => setTimeout(resolve, delay))
              continue // Retry the request
            } else {
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

          // Log detailed error information for debugging
          const errorText = (errorData as Record<string, unknown>).error as string || `HTTP ${response.status}: ${response.statusText}`;

          // Log detailed error information for debugging
          const errorInfo = {
            status: response.status,
            statusText: response.statusText,
            endpoint,
            method: options.method || 'GET',
            ...context,
            success: false,
            error: errorText,
            error_info: 'Please check developers.pipedrive.com for more information about Pipedrive API.',
            data: null,
            additional_data: null
          };

          console.error('Pipedrive API error:', errorInfo);

          return {
            success: false,
            error: errorText,
            diagnostics: {
              responseTime: `${Date.now() - startTime}ms`,
              timestamp: new Date().toISOString(),
              endpoint,
              errorType: 'api_error'
            }
          };
        }

        // Handle successful response with proper JSON parsing
        let data: PipedriveApiResponse<unknown>
        try {
          const responseText = await response.text()
          if (!responseText.trim()) {
            console.warn('Empty response from Pipedrive API')
            return {
              success: false,
              error: 'Empty response from API',
              diagnostics: {
                attempt,
                ...context,
              }
            }
          }
          data = JSON.parse(responseText)
          
          // Debug logging for successful responses
          if (options.method === 'POST') {
            console.log('Pipedrive API response:', JSON.stringify(data, null, 2));
          }
        } catch (parseError) {
          console.error('Failed to parse Pipedrive API response:', parseError)
          return {
            success: false,
            error: 'Invalid JSON response from API',
            diagnostics: {
              attempt,
              parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error',
              ...context,
            }
          }
        }

        return { success: true, data, diagnostics: { attempt, ...context } }

      } catch (error) {
        console.error(`Pipedrive API request failed (attempt ${attempt}):`, error)
        
        if (attempt <= maxRetries) {
          const delay = pipedriveConfig.retryDelay * Math.pow(2, attempt - 1)
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

    // Decrypt the API key before creating the service
    let decryptedApiKey: string
    try {
      decryptedApiKey = await decryptApiKey(user.pipedriveApiKey)
    } catch (error) {
      console.error(`Failed to decrypt API key for user ${userId}:`, error)
      return null
    }

    return new PipedriveService(decryptedApiKey)
  } catch (error) {
    console.error('Failed to create Pipedrive service:', error)
    return null
  }
} 
import type { Contact, User, Activity, Campaign } from '@prisma/client'

/**
 * Test Data Factories
 * Following the testing strategy: "Complete Data Structures" and "Mock Reality"
 */

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  password: null,
  role: 'CONSULTANT',
  pipedriveApiKey: 'test-api-key-123',
  emailVerified: new Date(),
  image: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
})

export const createMockContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: 'contact-123',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  organisation: 'Test Corp',
  warmnessScore: 5,
  lastContacted: new Date('2024-01-01T00:00:00.000Z'),
  addedToCampaign: false,
  pipedrivePersonId: null,
  pipedriveOrgId: null,
  userId: 'user-123',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
})

export const createMockActivity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'activity-123',
  type: 'CALL',
  subject: 'Follow up call',
  note: 'Call to discuss partnership opportunities',
  dueDate: new Date('2025-12-25T19:00:00.000Z'), // Future date
  contactId: 'contact-123',
  campaignId: null,
  userId: 'user-123',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
})

export const createMockCampaign = (overrides: Partial<Campaign> = {}): Campaign => ({
  id: 'campaign-123',
  name: 'Q1 Lead Generation',
  description: 'Target high-value prospects for Q1',
  status: 'ACTIVE',
  startDate: new Date('2024-01-01T00:00:00.000Z'),
  endDate: new Date('2024-03-31T23:59:59.000Z'),
  targetLeads: 100,
  budget: 5000,
  sector: 'Technology',
  theme: 'Digital Transformation',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
})

/**
 * Pipedrive API Response Factories
 * Mock exactly what the Pipedrive API returns
 */

export const createPipedrivePersonResponse = (overrides: any = {}) => ({
  data: {
    id: 123,
    name: 'John Doe',
    email: ['john@example.com'],
    phone: ['+1234567890'],
    org_name: 'Test Corp',
    org_id: 456,
    created: '2024-01-01T00:00:00.000Z',
    updated: '2024-01-01T00:00:00.000Z',
    ...overrides,
  },
})

export const createPipedriveActivityResponse = (overrides: any = {}) => ({
  data: {
    id: 789,
    subject: 'Follow up call',
    type: 'call',
    due_date: '2025-12-25',
    due_time: '19:00',
    note: 'Call to discuss partnership opportunities',
    person_id: 123,
    created: '2024-01-01T00:00:00.000Z',
    updated: '2024-01-01T00:00:00.000Z',
    ...overrides,
  },
})

export const createPipedriveOrganizationResponse = (overrides: any = {}) => ({
  data: {
    id: 456,
    name: 'Test Corp',
    address: '123 Test St, Test City, TC 12345',
    created: '2024-01-01T00:00:00.000Z',
    updated: '2024-01-01T00:00:00.000Z',
    ...overrides,
  },
})

/**
 * Error Response Factories
 * Mock various error scenarios
 */

export const createPipedriveErrorResponse = (status: number, message: string) => ({
  error: message,
  error_info: `Error ${status}: ${message}`,
  status: status,
})

export const createNetworkError = () => new Error('Network error: Failed to fetch')

export const createTimeoutError = () => new Error('Request timeout')

/**
 * Test Scenario Factories
 * Common test scenarios that can be reused
 */

export const createRateLimitScenario = () => ({
  status: 429,
  headers: { 'Retry-After': '60' },
  body: createPipedriveErrorResponse(429, 'Rate limit exceeded'),
})

export const createUnauthorizedScenario = () => ({
  status: 401,
  body: createPipedriveErrorResponse(401, 'Unauthorized'),
})

export const createValidationErrorScenario = () => ({
  status: 422,
  body: createPipedriveErrorResponse(422, 'Validation failed'),
})

export const createServerErrorScenario = () => ({
  status: 500,
  body: createPipedriveErrorResponse(500, 'Internal server error'),
}) 
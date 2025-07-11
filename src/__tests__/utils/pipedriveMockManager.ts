import { vi } from 'vitest'
import {
  createPipedrivePersonResponse,
  createPipedriveActivityResponse,
  createPipedriveOrganizationResponse,
  createPipedriveErrorResponse,
  createNetworkError,
  createTimeoutError,
  createRateLimitScenario,
  createUnauthorizedScenario,
  createValidationErrorScenario,
  createServerErrorScenario,
} from './testDataFactories'

/**
 * Pipedrive Mock Manager
 * Following the testing strategy: "Mock Factory Pattern" and "Mock Reality"
 * 
 * This manager provides a centralized way to control Pipedrive API responses
 * in tests, making them more maintainable and realistic.
 */

export class PipedriveMockManager {
  private mockFetch: any

  constructor() {
    this.mockFetch = global.fetch
  }

  /**
   * Set up a successful API response
   */
  setSuccess(data: any = createPipedrivePersonResponse()) {
    vi.mocked(this.mockFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(data),
    } as any)
  }

  /**
   * Set up an error API response
   */
  setError(status: number, message: string) {
    vi.mocked(this.mockFetch).mockResolvedValue({
      ok: false,
      status,
      json: vi.fn().mockResolvedValue(createPipedriveErrorResponse(status, message)),
    } as any)
  }

  /**
   * Set up a network error
   */
  setNetworkError() {
    vi.mocked(this.mockFetch).mockRejectedValue(createNetworkError())
  }

  /**
   * Set up a timeout error
   */
  setTimeoutError() {
    vi.mocked(this.mockFetch).mockRejectedValue(createTimeoutError())
  }

  /**
   * Set up a rate limit scenario
   */
  setRateLimit() {
    const scenario = createRateLimitScenario()
    vi.mocked(this.mockFetch).mockResolvedValue({
      ok: false,
      status: scenario.status,
      headers: scenario.headers,
      json: vi.fn().mockResolvedValue(scenario.body),
    } as any)
  }

  /**
   * Set up an unauthorized scenario
   */
  setUnauthorized() {
    const scenario = createUnauthorizedScenario()
    vi.mocked(this.mockFetch).mockResolvedValue({
      ok: false,
      status: scenario.status,
      json: vi.fn().mockResolvedValue(scenario.body),
    } as any)
  }

  /**
   * Set up a validation error scenario
   */
  setValidationError() {
    const scenario = createValidationErrorScenario()
    vi.mocked(this.mockFetch).mockResolvedValue({
      ok: false,
      status: scenario.status,
      json: vi.fn().mockResolvedValue(scenario.body),
    } as any)
  }

  /**
   * Set up a server error scenario
   */
  setServerError() {
    const scenario = createServerErrorScenario()
    vi.mocked(this.mockFetch).mockResolvedValue({
      ok: false,
      status: scenario.status,
      json: vi.fn().mockResolvedValue(scenario.body),
    } as any)
  }

  /**
   * Set up a malformed response
   */
  setMalformedResponse() {
    vi.mocked(this.mockFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ invalid: 'response' }),
    } as any)
  }

  /**
   * Set up a response with missing data
   */
  setMissingDataResponse() {
    vi.mocked(this.mockFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: null }),
    } as any)
  }

  /**
   * Set up a delayed response (for testing timeouts)
   */
  setDelayedResponse(delayMs: number = 5000, data: any = createPipedrivePersonResponse()) {
    vi.mocked(this.mockFetch).mockImplementation(() => 
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue(data),
          } as any)
        }, delayMs)
      })
    )
  }

  /**
   * Set up a sequence of responses (for testing retry logic)
   */
  setResponseSequence(responses: Array<{ success: boolean; data?: any; error?: { status: number; message: string } }>) {
    let callIndex = 0
    
    vi.mocked(this.mockFetch).mockImplementation(() => {
      const response = responses[callIndex] || responses[responses.length - 1]
      callIndex++
      
      if (response.success) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue(response.data || createPipedrivePersonResponse()),
        } as any)
      } else {
        return Promise.resolve({
          ok: false,
          status: response.error?.status || 500,
          json: vi.fn().mockResolvedValue(createPipedriveErrorResponse(
            response.error?.status || 500,
            response.error?.message || 'Unknown error'
          )),
        } as any)
      }
    })
  }

  /**
   * Reset all mocks
   */
  reset() {
    vi.clearAllMocks()
  }

  /**
   * Get mock call information for debugging
   */
  getMockCalls() {
    return {
      count: vi.mocked(this.mockFetch).mock.calls.length,
      calls: vi.mocked(this.mockFetch).mock.calls.map((call: any, index: number) => ({
        callNumber: index + 1,
        url: call[0],
        options: call[1],
        result: vi.mocked(this.mockFetch).mock.results[index]?.value,
      })),
    }
  }

  /**
   * Verify that fetch was called with specific parameters
   */
  verifyCall(expectedUrl: string, expectedMethod?: string) {
    const calls = this.getMockCalls()
    const matchingCall = calls.calls.find(call => {
      const urlMatch = call.url === expectedUrl
      const methodMatch = !expectedMethod || call.options?.method === expectedMethod
      return urlMatch && methodMatch
    })
    
    return {
      wasCalled: !!matchingCall,
      call: matchingCall,
      allCalls: calls.calls,
    }
  }
}

/**
 * Create a new Pipedrive mock manager instance
 */
export const createPipedriveMockManager = () => new PipedriveMockManager()

/**
 * Pre-configured mock managers for common scenarios
 */
export const createSuccessMockManager = () => {
  const manager = createPipedriveMockManager()
  manager.setSuccess()
  return manager
}

export const createErrorMockManager = () => {
  const manager = createPipedriveMockManager()
  manager.setError(500, 'Internal server error')
  return manager
}

export const createRateLimitMockManager = () => {
  const manager = createPipedriveMockManager()
  manager.setRateLimit()
  return manager
}

export const createNetworkErrorMockManager = () => {
  const manager = createPipedriveMockManager()
  manager.setNetworkError()
  return manager
} 
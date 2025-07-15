// API Error Types
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, public field?: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
    this.field = field
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR')
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR')
    this.name = 'NotFoundError'
  }
}

export class DatabaseError extends ApiError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR')
    this.name = 'DatabaseError'
  }
}

// Error response formatter
export function formatErrorResponse(error: unknown): { 
  success: false; 
  error: string; 
  code?: string;
  details?: Record<string, unknown>;
} {
  if (error instanceof ApiError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error instanceof ValidationError ? { field: error.field } : undefined
    }
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      code: 'UNKNOWN_ERROR'
    }
  }

  return {
    success: false,
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR'
  }
}

// Error logging utility
export function logError(error: unknown, context?: Record<string, unknown>) {
  const timestamp = new Date().toISOString()
  const errorInfo = {
    timestamp,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    context
  }

  console.error('API Error:', JSON.stringify(errorInfo, null, 2))
}

// Error handler for async functions
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      logError(error, { function: fn.name, args })
      throw error
    }
  }
} 

// Utility for Next.js API error response
import { NextResponse } from 'next/server'

export function createApiError(message: string, statusCode: number = 500, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: message, code: 'UNKNOWN_ERROR', details }, { status: statusCode })
}

export function createApiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status })
} 

// Error response type
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

export function handleApiError(error: unknown, defaultMessage: string = 'Internal server error'): ApiErrorResponse {
  if (error instanceof ApiError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error instanceof ValidationError ? { field: error.field } : undefined
    }
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      code: 'UNKNOWN_ERROR'
    }
  }

  return {
    success: false,
    error: defaultMessage,
    code: 'UNKNOWN_ERROR'
  }
}

// Zod validation utility
import { ZodSchema } from 'zod'

export function validateApiRequest<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ValidationError('Invalid request data', result.error.message)
  }
  return result.data
} 
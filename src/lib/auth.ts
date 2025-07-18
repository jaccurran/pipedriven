import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth-utils'
import { createPipedriveService } from '@/server/services/pipedriveService'
import type { UserRole } from '@prisma/client'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as unknown as NextAuthOptions['adapter'],
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
              pipedriveApiKey: true,
            },
          })

          if (!user || !user.password) {
            return null
          }

          const isValidPassword = await verifyPassword(credentials.password, user.password)

          if (!isValidPassword) {
            return null
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            pipedriveApiKey: user.pipedriveApiKey,
          } as {
            id: string;
            email: string;
            name: string | null;
            role: UserRole;
            pipedriveApiKey: string | null;
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    }),
  ],
  callbacks: {
    async signIn() {
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.pipedriveApiKey = user.pipedriveApiKey
      }
      return token
    },
    async session({ session, token }) {
      // Validate that the user still exists in the database
      if (token?.id) {
        try {
          const userExists = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true }
          })

          if (!userExists) {
            console.log('User no longer exists in database, invalidating session:', token.id)
            // Instead of returning null, return an empty session to trigger signout
            return {
              ...session,
              user: undefined,
              expires: new Date(0).toISOString()
            }
          }
        } catch {
          console.error('Error validating user existence');
          // On database error, return empty session for safety
          return {
            ...session,
            user: undefined,
            expires: new Date(0).toISOString()
          }
        }
      }

      // Send properties to the client
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.pipedriveApiKey = token.pipedriveApiKey as string
      }
      
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}

// Helper function to get current user from session
export async function getCurrentUser() {
  const { getServerSession } = await import('next-auth')
  const session = await getServerSession(authOptions)
  return session?.user
}

// Export getServerSession for use in API routes
export async function getServerSession() {
  const { getServerSession: nextAuthGetServerSession } = await import('next-auth')
  return nextAuthGetServerSession(authOptions)
}

// Helper function to check if user has required role
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    CONSULTANT: 1,
    GOLDEN_TICKET: 2,
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

// Helper function to require authentication
export function requireAuth() {
  return async () => {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Authentication required')
    }
    return user
  }
}

// Helper function to require specific role
export function requireRole(role: UserRole) {
  return async () => {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Authentication required')
    }
    if (!hasRole(user.role as UserRole, role)) {
      throw new Error('Insufficient permissions')
    }
    return user
  }
}

// Helper function to check API key validity
export async function checkApiKeyValidity(userId: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const pipedriveService = await createPipedriveService(userId)
    
    if (!pipedriveService) {
      return { valid: false, error: 'No API key configured' }
    }

    const testResult = await pipedriveService.testConnection()
    
    return {
      valid: testResult.success,
      error: testResult.success ? undefined : testResult.error
    }
  } catch (error) {
    console.error('API key validation error:', error)
    return { valid: false, error: 'Failed to validate API key' }
  }
} 

// Helper function to validate session and user existence
export async function validateSessionAndUser() {
  const session = await getServerSession()
  
  if (!session?.user?.id) {
    throw new Error('Authentication required')
  }

  // Validate that the user still exists in the database
  const userExists = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true }
  })

  if (!userExists) {
    console.log('User no longer exists in database, invalidating session:', session.user.id)
    throw new Error('User session invalid - please sign in again')
  }

  return session
}

// Helper function to safely get session with validation
export async function getValidatedSession() {
  try {
    return await validateSessionAndUser()
  } catch {
    // Return null for invalid sessions instead of throwing
    return null
  }
}

// Helper function to require authentication with user validation
export function requireAuthWithValidation() {
  return async () => {
    return await validateSessionAndUser()
  }
}

// Helper function to require specific role with user validation
export function requireRoleWithValidation(role: UserRole) {
  return async () => {
    const session = await validateSessionAndUser()
    
    if (!hasRole(session.user.role as UserRole, role)) {
      throw new Error('Insufficient permissions')
    }
    
    return session
  }
} 
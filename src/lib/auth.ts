import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth-utils'
import type { UserRole } from '@prisma/client'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as unknown as NextAuthOptions['adapter'],
  providers: [
    CredentialsProvider({
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
          if (process.env.NODE_ENV === 'development') {
            console.error('❌ Auth error:', error)
          }
          return null
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 signIn callback called:', { userId: user?.id, accountType: account?.type })
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 session callback called:', { 
          tokenId: token?.id, 
          sessionUser: session?.user?.email,
          hasToken: !!token
        })
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
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development', // Only enable debug in development
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
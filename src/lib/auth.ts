import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth-utils'
import type { UserRole } from '@prisma/client'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('🔐 NextAuth authorize called with:', {
          email: credentials?.email,
          hasPassword: !!credentials?.password
        })

        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing email or password')
          return null
        }

        try {
          console.log('🔍 Looking up user in database...')
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

          console.log('👤 User lookup result:', {
            found: !!user,
            hasPassword: !!user?.password,
            email: user?.email,
            role: user?.role
          })

          if (!user || !user.password) {
            console.log('❌ User not found or no password set')
            return null
          }

          console.log('🔐 Verifying password...')
          const isValidPassword = await verifyPassword(credentials.password, user.password)
          console.log('✅ Password verification result:', isValidPassword)

          if (!isValidPassword) {
            console.log('❌ Password verification failed')
            return null
          }

          console.log('✅ Authentication successful, returning user')
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            pipedriveApiKey: user.pipedriveApiKey,
          } as any // Type assertion to handle adapter compatibility
        } catch (error) {
          console.error('❌ Auth error:', error)
          return null
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 signIn callback called:', { userId: user?.id, accountType: account?.type })
      return true
    },
    async jwt({ token, user, account }) {
      console.log('🔐 jwt callback called:', { 
        tokenId: token?.id, 
        userId: user?.id,
        hasUser: !!user,
        hasAccount: !!account
      })
      
      // Initial sign in
      if (account && user) {
        console.log('🔐 Initial sign in - setting token data')
        return {
          ...token,
          id: user.id,
          role: user.role,
          email: user.email,
          name: user.name,
          pipedriveApiKey: user.pipedriveApiKey,
        }
      }
      
      // If we have a token but no user, fetch the latest user data from database
      if (token?.id && !user) {
        console.log('🔐 Fetching latest user data from database')
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              pipedriveApiKey: true,
            },
          })
          
          if (dbUser) {
            console.log('🔐 Updated token with latest user data')
            return {
              ...token,
              id: dbUser.id,
              role: dbUser.role,
              email: dbUser.email,
              name: dbUser.name,
              pipedriveApiKey: dbUser.pipedriveApiKey,
            }
          }
        } catch (error) {
          console.error('❌ Error fetching user data in JWT callback:', error)
        }
      }
      
      // Return previous token if the access token has not expired yet
      return token
    },
    async session({ session, token }) {
      console.log('🔐 session callback called:', { 
        tokenId: token?.id, 
        sessionUser: session?.user?.email,
        hasToken: !!token
      })
      
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
  debug: true, // Enable NextAuth debug mode
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
  return async (req: Request) => {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Authentication required')
    }
    return user
  }
}

// Helper function to require specific role
export function requireRole(role: UserRole) {
  return async (req: Request) => {
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
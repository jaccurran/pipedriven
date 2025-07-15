import { PrismaClient } from '@prisma/client'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

async function debugSessionData() {
  try {
    // Get the user directly from database
    const user = await prisma.user.findUnique({
      where: { email: 'john@the4oc.com' },
      select: { 
        id: true, 
        email: true, 
        name: true,
        pipedriveApiKey: true,
        role: true
      }
    })
    
    console.log('🔍 Database User Data:')
    console.log('ID:', user?.id)
    console.log('Email:', user?.email)
    console.log('Name:', user?.name)
    console.log('Role:', user?.role)
    console.log('Has Pipedrive API Key:', !!user?.pipedriveApiKey)
    console.log('API Key (first 8 chars):', user?.pipedriveApiKey ? user.pipedriveApiKey.substring(0, 8) + '...' : 'None')
    
    // Check if there are any sessions for this user
    const sessions = await prisma.session.findMany({
      where: { userId: user?.id },
      select: { id: true, sessionToken: true, expires: true }
    })
    
    console.log('\n🔐 Active Sessions:')
    console.log('Session count:', sessions.length)
    
    if (sessions.length > 0) {
      sessions.forEach((session, index) => {
        console.log(`Session ${index + 1}:`, {
          id: session.id,
          token: session.sessionToken.substring(0, 20) + '...',
          expires: session.expires,
          isExpired: new Date() > session.expires
        })
      })
    } else {
      console.log('No active sessions found')
    }
    
    // Check if there are any JWT tokens in the database
    console.log('\n🔑 JWT Token Analysis:')
    console.log('The issue appears to be that the JWT callback is not receiving user data during session refresh')
    console.log('This suggests the session token exists but the JWT is not being properly decoded')
    
    // Test the auth configuration
    console.log('\n🧪 Testing Auth Configuration:')
    console.log('Auth Options:', {
      hasProviders: !!authOptions.providers,
      providerCount: authOptions.providers?.length,
      hasCallbacks: !!authOptions.callbacks,
      sessionStrategy: authOptions.session?.strategy
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugSessionData() 
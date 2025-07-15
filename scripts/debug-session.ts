import { PrismaClient } from '@prisma/client'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

async function debugSession() {
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
    sessions.forEach((session, index) => {
      console.log(`Session ${index + 1}:`, {
        id: session.id,
        token: session.sessionToken.substring(0, 20) + '...',
        expires: session.expires,
        isExpired: new Date() > session.expires
      })
    })
    
    // Check JWT tokens
    console.log('\n🔑 JWT Token Analysis:')
    console.log('The issue appears to be that the JWT callback is not receiving user data')
    console.log('This suggests the user needs to log out and log back in to refresh their session')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugSession() 
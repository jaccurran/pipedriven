import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setPipedriveApiKey() {
  try {
    // Find the user (assuming it's john@the4oc.com based on the logs)
    const user = await prisma.user.findUnique({
      where: { email: 'john@the4oc.com' },
      select: { id: true, email: true, pipedriveApiKey: true }
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log('👤 Found user:', { id: user.id, email: user.email, hasApiKey: !!user.pipedriveApiKey })

    // Set a test API key (you should replace this with a real one)
    const testApiKey = 'test_api_key_12345678901234567890123456789012'
    
    await prisma.user.update({
      where: { id: user.id },
      data: { pipedriveApiKey: testApiKey }
    })

    console.log('✅ Pipedrive API key set successfully')
    
    // Verify the update
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, pipedriveApiKey: true }
    })

    console.log('🔍 Updated user:', { 
      id: updatedUser?.id, 
      email: updatedUser?.email, 
      hasApiKey: !!updatedUser?.pipedriveApiKey,
      apiKeyLength: updatedUser?.pipedriveApiKey?.length
    })

  } catch (error) {
    console.error('❌ Error setting Pipedrive API key:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setPipedriveApiKey() 
import { PrismaClient } from '@prisma/client'
import { createPipedriveService } from '../src/server/services/pipedriveService'

const prisma = new PrismaClient()

async function testSync() {
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'john@the4oc.com' },
      select: { id: true, email: true, pipedriveApiKey: true }
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log('👤 Found user:', { 
      id: user.id, 
      email: user.email, 
      hasApiKey: !!user.pipedriveApiKey,
      apiKeyLength: user.pipedriveApiKey?.length
    })

    if (!user.pipedriveApiKey) {
      console.log('❌ No Pipedrive API key set')
      return
    }

    // Create Pipedrive service
    const pipedriveService = await createPipedriveService(user.id)
    if (!pipedriveService) {
      console.log('❌ Failed to create Pipedrive service')
      return
    }

    console.log('✅ Pipedrive service created successfully')

    // Test connection
    console.log('🔍 Testing Pipedrive connection...')
    const connectionTest = await pipedriveService.testConnection()
    
    if (connectionTest.success) {
      console.log('✅ Pipedrive connection successful:', connectionTest.diagnostics)
    } else {
      console.log('❌ Pipedrive connection failed:', connectionTest.error)
      console.log('🔍 Diagnostics:', connectionTest.diagnostics)
      return
    }

    // Test getting persons
    console.log('🔍 Testing getPersons...')
    const personsResult = await pipedriveService.getPersons()
    
    if (personsResult.success) {
      console.log('✅ GetPersons successful:', {
        count: personsResult.persons?.length || 0,
        persons: personsResult.persons?.slice(0, 3).map(p => ({ id: p.id, name: p.name })) || []
      })
    } else {
      console.log('❌ GetPersons failed:', personsResult.error)
    }

  } catch (error) {
    console.error('❌ Error testing sync:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSync() 
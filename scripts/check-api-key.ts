import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'john@the4oc.com' },
      select: { 
        id: true, 
        email: true, 
        pipedriveApiKey: true, 
        lastSyncTimestamp: true,
        syncStatus: true
      }
    })
    
    console.log('Current user data:')
    console.log('ID:', user?.id)
    console.log('Email:', user?.email)
    console.log('Has Pipedrive API Key:', !!user?.pipedriveApiKey)
    console.log('API Key (first 8 chars):', user?.pipedriveApiKey ? user.pipedriveApiKey.substring(0, 8) + '...' : 'None')
    console.log('Last Sync Timestamp:', user?.lastSyncTimestamp)
    console.log('Sync Status:', user?.syncStatus)
    
    if (!user?.pipedriveApiKey) {
      console.log('\n❌ No Pipedrive API key found!')
      console.log('Please set your API key using the PipedriveApiKeyForm component.')
    } else {
      console.log('\n✅ Pipedrive API key found!')
      console.log('You may need to log out and log back in to refresh your session.')
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUser() 
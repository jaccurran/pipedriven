import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setRealApiKey() {
  try {
    // This is a placeholder - you'll need to replace with your real Pipedrive API key
    const realApiKey = process.env.REAL_PIPEDRIVE_API_KEY || 'your_real_pipedrive_api_key_here'
    
    if (realApiKey === 'your_real_pipedrive_api_key_here') {
      console.log('❌ Please set the REAL_PIPEDRIVE_API_KEY environment variable with your actual Pipedrive API key')
      console.log('Example: REAL_PIPEDRIVE_API_KEY=abc123def456... npx tsx scripts/set-real-api-key.ts')
      return
    }
    
    const user = await prisma.user.update({
      where: { email: 'john@the4oc.com' },
      data: { 
        pipedriveApiKey: realApiKey,
        syncStatus: 'NOT_SYNCED'
      },
      select: { 
        id: true, 
        email: true, 
        pipedriveApiKey: true 
      }
    })
    
    console.log('✅ Updated user with real Pipedrive API key:')
    console.log('ID:', user.id)
    console.log('Email:', user.email)
    console.log('API Key (first 8 chars):', user.pipedriveApiKey.substring(0, 8) + '...')
    
    console.log('\n🔄 Next steps:')
    console.log('1. Log out of the application')
    console.log('2. Log back in to refresh your session')
    console.log('3. Try syncing again on the My-500 page')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setRealApiKey() 
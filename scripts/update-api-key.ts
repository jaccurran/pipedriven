import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateApiKey() {
  try {
    // Replace this with your real Pipedrive API key
    const realApiKey = process.env.REAL_PIPEDRIVE_API_KEY || 'your_real_pipedrive_api_key_here'
    
    if (realApiKey === 'your_real_pipedrive_api_key_here') {
      console.log('❌ Please set the REAL_PIPEDRIVE_API_KEY environment variable')
      console.log('Example: REAL_PIPEDRIVE_API_KEY=abc123def456... npx tsx scripts/update-api-key.ts')
      console.log('\n📋 To get your Pipedrive API key:')
      console.log('1. Go to Pipedrive → Settings → Personal Preferences → API')
      console.log('2. Copy your API key (should be 32 characters)')
      console.log('3. Run: REAL_PIPEDRIVE_API_KEY=your_key npx tsx scripts/update-api-key.ts')
      return
    }
    
    // Validate the API key format
    if (realApiKey.length !== 32) {
      console.log('⚠️  Warning: Pipedrive API keys are typically 32 characters long')
      console.log('Your key length:', realApiKey.length)
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
    
    console.log('✅ Updated API key for user:', user.email)
    console.log('New API Key (first 8 chars):', user.pipedriveApiKey.substring(0, 8) + '...')
    
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

updateApiKey() 
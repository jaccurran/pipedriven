import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCurrentApiKey() {
  try {
    // Get the user's API key
    const user = await prisma.user.findUnique({
      where: { email: 'john@the4oc.com' },
      select: { id: true, email: true, pipedriveApiKey: true }
    })
    
    if (!user) {
      console.log('❌ User not found')
      return
    }
    
    if (!user.pipedriveApiKey) {
      console.log('❌ No Pipedrive API key found')
      return
    }
    
    console.log('🔍 Testing current Pipedrive API key for user:', user.email)
    console.log('API Key (first 8 chars):', user.pipedriveApiKey.substring(0, 8) + '...')
    
    // Test the API key directly
    const testUrl = `https://api.pipedrive.com/v1/users/me?api_token=${user.pipedriveApiKey}`
    
    console.log('\n🌐 Testing Pipedrive API connection...')
    console.log('URL:', testUrl.replace(user.pipedriveApiKey, user.pipedriveApiKey.substring(0, 8) + '...'))
    
    const response = await fetch(testUrl)
    const data = await response.json()
    
    console.log('\n📊 Response Status:', response.status)
    console.log('📊 Response OK:', response.ok)
    
    if (response.ok) {
      console.log('✅ API key is valid!')
      console.log('👤 User:', data.data?.name || 'Unknown')
      console.log('📧 Email:', data.data?.email || 'Unknown')
    } else {
      console.log('❌ API key is invalid or expired')
      console.log('🔍 Error details:', data)
    }
    
  } catch (error) {
    console.error('❌ Error testing API key:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCurrentApiKey() 
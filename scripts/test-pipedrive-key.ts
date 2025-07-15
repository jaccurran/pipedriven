import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testPipedriveKey() {
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
    
    console.log('🔍 Testing Pipedrive API key for user:', user.email)
    console.log('API Key (first 8 chars):', user.pipedriveApiKey.substring(0, 8) + '...')
    
    // Test the API key directly
    const testUrl = `https://api.pipedrive.com/v1/users/me?api_token=${user.pipedriveApiKey}`
    
    console.log('\n🌐 Testing Pipedrive API connection...')
    console.log('URL:', testUrl.replace(user.pipedriveApiKey, '***' + user.pipedriveApiKey.substring(user.pipedriveApiKey.length - 4)))
    
    const response = await fetch(testUrl)
    const data = await response.json()
    
    console.log('\n📊 Response:')
    console.log('Status:', response.status)
    console.log('Status Text:', response.statusText)
    
    if (response.ok) {
      console.log('✅ API key is valid!')
      console.log('User:', data.data?.name || 'Unknown')
      console.log('Email:', data.data?.email || 'Unknown')
      console.log('Company:', data.data?.company_name || 'Unknown')
    } else {
      console.log('❌ API key is invalid or expired')
      console.log('Error:', data.error || 'Unknown error')
      console.log('Error Info:', data.error_info || 'No additional info')
      
      if (response.status === 401) {
        console.log('\n🔧 Possible solutions:')
        console.log('1. Check if the API key is correct')
        console.log('2. The API key may have expired')
        console.log('3. The API key may not have the required permissions')
        console.log('4. Try generating a new API key in Pipedrive')
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing API key:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPipedriveKey() 
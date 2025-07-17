#!/usr/bin/env tsx

async function testPipedriveApi() {
  console.log('🧪 Testing Pipedrive API key...\n')
  
  // You'll need to replace this with your actual API key
  const apiKey = process.env.TEST_PIPEDRIVE_API_KEY || 'your-api-key-here'
  
  if (apiKey === 'your-api-key-here') {
    console.log('❌ Please set the TEST_PIPEDRIVE_API_KEY environment variable with your API key')
    console.log('   Example: TEST_PIPEDRIVE_API_KEY=your_actual_api_key npx tsx scripts/test-pipedrive-api.ts')
    return
  }

  console.log(`🔑 Testing API key: ${apiKey.substring(0, 10)}...`)
  console.log('')

  try {
    // Test 1: Using Bearer token (our current method)
    console.log('📡 Test 1: Using Bearer token authentication...')
    const bearerResponse = await fetch("https://api.pipedrive.com/v1/users/me", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    console.log(`   Status: ${bearerResponse.status}`)
    console.log(`   Status Text: ${bearerResponse.statusText}`)
    
    const bearerData = await bearerResponse.json()
    console.log(`   Response:`, bearerData)
    console.log('')

    // Test 2: Using api_token parameter (alternative method)
    console.log('📡 Test 2: Using api_token parameter...')
    const paramResponse = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${apiKey}`, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    console.log(`   Status: ${paramResponse.status}`)
    console.log(`   Status Text: ${paramResponse.statusText}`)
    
    const paramData = await paramResponse.json()
    console.log(`   Response:`, paramData)
    console.log('')

    // Test 3: Check rate limits
    console.log('📡 Test 3: Checking rate limits...')
    const rateLimitHeaders = {
      'X-RateLimit-Limit': bearerResponse.headers.get('X-RateLimit-Limit'),
      'X-RateLimit-Remaining': bearerResponse.headers.get('X-RateLimit-Remaining'),
      'X-RateLimit-Reset': bearerResponse.headers.get('X-RateLimit-Reset'),
    }
    console.log(`   Rate Limit Info:`, rateLimitHeaders)
    console.log('')

    if (bearerResponse.ok) {
      console.log('✅ API key is valid!')
      console.log('   The issue might be in our application code, not the API key itself.')
    } else {
      console.log('❌ API key appears to be invalid')
      console.log('   Please check:')
      console.log('   1. The API key is correct and not expired')
      console.log('   2. The API key has the right permissions')
      console.log('   3. Your Pipedrive account is active')
    }

  } catch (error) {
    console.error('❌ Error testing API key:', error)
  }
}

testPipedriveApi() 
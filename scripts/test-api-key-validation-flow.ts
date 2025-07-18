#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma'
import { decryptApiKey } from '../src/lib/apiKeyEncryption'

async function testApiKeyValidationFlow() {
  console.log('🧪 Testing API key validation flow...\n')

  try {
    // Get a user with an API key
    const user = await prisma.user.findFirst({
      where: {
        pipedriveApiKey: {
          not: null
        }
      },
      select: {
        id: true,
        email: true,
        pipedriveApiKey: true,
      },
    })

    if (!user) {
      console.log('❌ No user with API key found')
      return
    }

    console.log(`👤 Testing with user: ${user.email}`)

    // Decrypt the API key
    let apiKey: string
    try {
      apiKey = await decryptApiKey(user.pipedriveApiKey!)
      console.log('✅ Successfully decrypted API key')
    } catch (error) {
      console.log('❌ Failed to decrypt API key:', error)
      return
    }

    // Test 1: GET validation (what ApiKeyChecker uses)
    console.log('\n📡 Test 1: GET /api/auth/validate-api-key (ApiKeyChecker flow)...')
    
    const getResponse = await fetch('http://localhost:3002/api/auth/validate-api-key', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log(`📊 GET Response status: ${getResponse.status}`)
    
    if (getResponse.ok) {
      const getResult = await getResponse.json()
      console.log(`📊 GET Response body:`, getResult)
      
      if (getResult.valid) {
        console.log('✅ GET validation successful')
      } else {
        console.log('❌ GET validation failed:', getResult.error)
      }
    } else {
      console.log('❌ GET request failed')
    }

    // Test 2: POST validation (what ApiKeySetupDialog uses)
    console.log('\n📡 Test 2: POST /api/auth/validate-api-key (ApiKeySetupDialog flow)...')
    
    const postResponse = await fetch('http://localhost:3002/api/auth/validate-api-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey }),
    })

    console.log(`📊 POST Response status: ${postResponse.status}`)
    
    if (postResponse.ok) {
      const postResult = await postResponse.json()
      console.log(`📊 POST Response body:`, postResult)
      
      if (postResult.success) {
        console.log('✅ POST validation successful')
      } else {
        console.log('❌ POST validation failed:', postResult.error)
      }
    } else {
      console.log('❌ POST request failed')
    }

    // Test 3: Check for potential race conditions
    console.log('\n📡 Test 3: Concurrent validation requests...')
    
    const promises = []
    for (let i = 0; i < 3; i++) {
      promises.push(
        fetch('http://localhost:3002/api/auth/validate-api-key', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }).then(r => r.json())
      )
    }
    
    const results = await Promise.all(promises)
    console.log(`📊 Concurrent results:`, results.map((r, i) => `Request ${i + 1}: ${r.valid ? 'valid' : 'invalid'}`))

  } catch (error) {
    console.error('❌ Error testing API key validation flow:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testApiKeyValidationFlow() 
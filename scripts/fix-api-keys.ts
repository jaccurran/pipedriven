#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma'
import { decryptApiKey, encryptApiKey } from '../src/lib/apiKeyEncryption'

async function fixApiKeys() {
  console.log('🔧 Fixing API keys in database...\n')

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        pipedriveApiKey: true,
      },
    })

    console.log(`Found ${users.length} users in database\n`)

    for (const user of users) {
      console.log(`👤 Processing user: ${user.email} (ID: ${user.id})`)
      
      if (!user.pipedriveApiKey) {
        console.log('   ℹ️  No API key stored - skipping')
        continue
      }

      const apiKey = user.pipedriveApiKey
      console.log(`   📏 API key length: ${apiKey.length}`)

      // Check if it's a plain text API key (40 hex characters)
      if (apiKey.length === 40 && /^[a-f0-9]{40}$/i.test(apiKey)) {
        console.log('   🔄 Plain text API key found - encrypting...')
        
        try {
          // Test the API key first
          const testResponse = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${apiKey}`, {
            headers: {
              "Content-Type": "application/json",
            },
          })
          
          if (testResponse.ok) {
            // API key is valid, encrypt it
            const encryptedApiKey = await encryptApiKey(apiKey)
            await prisma.user.update({
              where: { id: user.id },
              data: { pipedriveApiKey: encryptedApiKey },
            })
            console.log('   ✅ Plain text API key encrypted and saved')
          } else {
            console.log(`   ❌ Plain text API key is invalid (status: ${testResponse.status}) - removing`)
            await prisma.user.update({
              where: { id: user.id },
              data: { pipedriveApiKey: null },
            })
          }
        } catch (error) {
          console.log(`   ❌ Failed to test plain text API key: ${error} - removing`)
          await prisma.user.update({
            where: { id: user.id },
            data: { pipedriveApiKey: null },
          })
        }
      } else {
        // Try to decrypt it
        try {
          const decrypted = await decryptApiKey(apiKey)
          console.log('   ✅ Encrypted API key can be decrypted')
          
          // Test the decrypted API key
          try {
            const testResponse = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${decrypted}`, {
              headers: {
                "Content-Type": "application/json",
              },
            })
            
            if (testResponse.ok) {
              console.log('   ✅ Decrypted API key is valid')
            } else {
              console.log(`   ❌ Decrypted API key is invalid (status: ${testResponse.status}) - removing`)
              await prisma.user.update({
                where: { id: user.id },
                data: { pipedriveApiKey: null },
              })
            }
          } catch (error) {
            console.log(`   ❌ Decrypted API key test failed: ${error} - removing`)
            await prisma.user.update({
              where: { id: user.id },
              data: { pipedriveApiKey: null },
            })
          }
        } catch (decryptError) {
          console.log(`   ❌ Failed to decrypt API key: ${decryptError}`)
          console.log('   🗑️  Removing invalid API key format')
          await prisma.user.update({
            where: { id: user.id },
            data: { pipedriveApiKey: null },
          })
        }
      }
      
      console.log('')
    }

    console.log('✅ API key fix process completed')

  } catch (error) {
    console.error('❌ Error fixing API keys:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixApiKeys() 
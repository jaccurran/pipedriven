import { PrismaClient } from '@prisma/client'
import { encryptApiKey, decryptApiKey } from '../src/lib/apiKeyEncryption'

const prisma = new PrismaClient()

async function debugApiKey() {
  console.log('🔍 Debugging API key...')
  
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: 'john@the4oc.com'
      },
      select: {
        id: true,
        email: true,
        pipedriveApiKey: true
      }
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log(`User: ${user.email}`)
    console.log(`API Key length: ${user.pipedriveApiKey?.length || 0}`)
    console.log(`API Key contains colons: ${user.pipedriveApiKey?.includes(':') || false}`)
    console.log(`API Key format: ${user.pipedriveApiKey?.substring(0, 20)}...`)

    if (user.pipedriveApiKey) {
      try {
        const decrypted = await decryptApiKey(user.pipedriveApiKey)
        console.log(`✅ Decryption successful: ${decrypted.substring(0, 10)}...`)
        
        // Test re-encryption
        const reEncrypted = await encryptApiKey(decrypted)
        console.log(`✅ Re-encryption successful: ${reEncrypted.substring(0, 20)}...`)
        
        // Test decryption of re-encrypted
        const reDecrypted = await decryptApiKey(reEncrypted)
        console.log(`✅ Re-decryption successful: ${reDecrypted.substring(0, 10)}...`)
        
        console.log(`Original and re-decrypted match: ${decrypted === reDecrypted}`)
      } catch (error) {
        console.error(`❌ Decryption failed:`, error)
        
        // Try to encrypt a fresh API key
        const testApiKey = 'e3197ecfe9ed673a4f86b8865b0052f7f4367965'
        console.log(`Testing fresh encryption with: ${testApiKey}`)
        
        try {
          const freshEncrypted = await encryptApiKey(testApiKey)
          console.log(`✅ Fresh encryption: ${freshEncrypted.substring(0, 20)}...`)
          
          const freshDecrypted = await decryptApiKey(freshEncrypted)
          console.log(`✅ Fresh decryption: ${freshDecrypted}`)
          
          // Update the database with the fresh encrypted key
          await prisma.user.update({
            where: { id: user.id },
            data: { pipedriveApiKey: freshEncrypted }
          })
          
          console.log(`✅ Updated database with fresh encrypted key`)
        } catch (freshError) {
          console.error(`❌ Fresh encryption failed:`, freshError)
        }
      }
    }
  } catch (error) {
    console.error('❌ Error debugging API key:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugApiKey() 
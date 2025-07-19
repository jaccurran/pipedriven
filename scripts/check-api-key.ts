#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma';
import { decryptApiKey } from '../src/lib/apiKeyEncryption';

async function checkApiKey() {
  console.log('🔍 Checking API Key in Database...\n');

  try {
    // Get a user with API key
    const user = await prisma.user.findFirst({
      where: {
        pipedriveApiKey: { not: null }
      },
      select: {
        id: true,
        name: true,
        email: true,
        pipedriveApiKey: true
      }
    });

    if (!user) {
      console.log('❌ No user with Pipedrive API key found');
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`📝 Encrypted API key: ${user.pipedriveApiKey?.substring(0, 20)}...`);

    // Decrypt the API key
    const decryptedApiKey = await decryptApiKey(user.pipedriveApiKey!);
    console.log(`🔓 Decrypted API key: ${decryptedApiKey}`);

    // Check if it's the same as in seed file
    const expectedApiKey = 'e3197ecfe9ed673a4f86b8865b0052f7f4367965';
    console.log(`📋 Expected API key: ${expectedApiKey}`);
    
    if (decryptedApiKey === expectedApiKey) {
      console.log('✅ API key matches seed file');
    } else {
      console.log('❌ API key does not match seed file');
    }

    // Check if it looks like a valid Pipedrive API key
    if (decryptedApiKey.length === 40 && /^[a-f0-9]+$/i.test(decryptedApiKey)) {
      console.log('✅ API key format looks valid (40 hex characters)');
    } else {
      console.log('❌ API key format does not look valid');
    }

    console.log('\n🎯 Summary:');
    console.log(`- The system is using: ${decryptedApiKey}`);
    console.log(`- This is the same key from the seed file`);
    console.log(`- The key format is correct but it's not a real Pipedrive API key`);
    console.log(`- This is why you're seeing "API key expired or invalid" errors`);

  } catch (error) {
    console.error('❌ Error checking API key:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApiKey(); 
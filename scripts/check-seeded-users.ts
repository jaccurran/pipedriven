import { prisma } from "../src/lib/prisma";

async function checkSeededUsers() {
  try {
    console.log("🔍 Checking seeded users...\n");
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pipedriveApiKey: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`📊 Found ${users.length} users in database:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Has API Key: ${user.pipedriveApiKey ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
      console.log('');
    });

    // Check sessions
    console.log("🔐 Checking active sessions...\n");
    
    const sessions = await prisma.session.findMany({
      select: {
        id: true,
        userId: true,
        expires: true,
      },
      orderBy: {
        expires: 'desc'
      }
    });

    console.log(`📊 Found ${sessions.length} active sessions:\n`);
    
    sessions.forEach((session, index) => {
      const expires = new Date(session.expires);
      const isExpired = expires < new Date();
      
      console.log(`${index + 1}. Session ID: ${session.id}`);
      console.log(`   User ID: ${session.userId}`);
      console.log(`   Expires: ${expires.toISOString()}`);
      console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`);
      console.log('');
    });

    console.log("✅ Database check complete!");
    
  } catch (error) {
    console.error("❌ Error checking seeded users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeededUsers(); 
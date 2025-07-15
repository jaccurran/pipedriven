import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearSessions() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'john@the4oc.com' },
      select: { id: true, email: true }
    })
    
    if (!user) {
      console.log('❌ User not found')
      return
    }
    
    console.log('🔍 Clearing sessions for user:', user.email)
    
    // Delete all sessions for this user
    const deletedSessions = await prisma.session.deleteMany({
      where: { userId: user.id }
    })
    
    console.log('✅ Deleted sessions:', deletedSessions.count)
    
    // Also clear any JWT tokens by updating the user (this will invalidate any cached tokens)
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    })
    
    console.log('✅ Updated user timestamp to invalidate cached tokens')
    
    console.log('\n🔄 Next steps:')
    console.log('1. Go to your application')
    console.log('2. Log out (if you can)')
    console.log('3. Log back in with your credentials')
    console.log('4. Try syncing again on the My-500 page')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearSessions() 
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function forceSessionRefresh() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'john@the4oc.com' },
      select: { id: true, email: true }
    })
    
    if (!user) {
      console.log('❌ User not found')
      return
    }
    
    console.log('🔍 Force refreshing session for user:', user.email)
    
    // Delete all sessions for this user
    const deletedSessions = await prisma.session.deleteMany({
      where: { userId: user.id }
    })
    
    console.log('✅ Deleted sessions:', deletedSessions.count)
    
    // Update the user's updatedAt timestamp to invalidate any cached JWT tokens
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    })
    
    console.log('✅ Updated user timestamp to invalidate cached tokens')
    
    // Also clear any verification tokens that might be interfering
    const deletedVerificationTokens = await prisma.verificationToken.deleteMany({
      where: { identifier: user.email }
    })
    
    console.log('✅ Deleted verification tokens:', deletedVerificationTokens.count)
    
    console.log('\n🔄 Next steps:')
    console.log('1. Close your browser completely')
    console.log('2. Clear browser cookies for localhost')
    console.log('3. Open your application in a fresh browser window')
    console.log('4. Log in with your credentials')
    console.log('5. Try syncing again on the My-500 page')
    
    console.log('\n💡 If the issue persists, the problem might be:')
    console.log('- NextAuth JWT token caching')
    console.log('- Browser cookie issues')
    console.log('- Session storage conflicts')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

forceSessionRefresh() 
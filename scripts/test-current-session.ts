#!/usr/bin/env tsx

async function testCurrentSession() {
  console.log('🔍 Testing current session...\n')

  try {
    // This won't work in a script context, but let me create a simple test
    console.log('To check your current session, please:')
    console.log('1. Open your browser to http://localhost:3000')
    console.log('2. Check the browser console for any session information')
    console.log('3. Or check the Network tab in DevTools to see what user ID is being sent')
    console.log('')
    console.log('Alternatively, you can:')
    console.log('1. Go to http://localhost:3000/dashboard')
    console.log('2. You should see an API key setup dialog')
    console.log('3. Enter your valid Pipedrive API key there')
    console.log('')
    console.log('The issue is that you\'re logged in with a user that doesn\'t have an API key stored.')
    console.log('Once you set up the API key through the UI, it should work correctly.')

  } catch (error) {
    console.error('❌ Error testing session:', error)
  }
}

testCurrentSession() 
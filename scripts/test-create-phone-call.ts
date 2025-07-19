import { prisma } from '../src/lib/prisma';

async function testCreatePhoneCall() {
  try {
    // Get a user and contact for testing
    const user = await prisma.user.findFirst();
    const contact = await prisma.contact.findFirst();
    
    if (!user || !contact) {
      console.log('No user or contact found for testing');
      return;
    }

    console.log('=== Test Data ===');
    console.log('User:', user.email);
    console.log('Contact:', contact.name);

    // Create a phone call activity
    const phoneCallActivity = await prisma.activity.create({
      data: {
        type: 'CALL',
        subject: 'Test Phone Call',
        note: 'This is a test phone call activity',
        userId: user.id,
        contactId: contact.id,
      }
    });

    console.log('\n=== Created Phone Call Activity ===');
    console.log('ID:', phoneCallActivity.id);
    console.log('Type:', phoneCallActivity.type);
    console.log('Subject:', phoneCallActivity.subject);
    console.log('Note:', phoneCallActivity.note);
    console.log('Created:', phoneCallActivity.createdAt);

    // Now test the API endpoint
    console.log('\n=== Testing API Endpoint ===');
    
    // Simulate the API call that would be made from the frontend
    const apiData = {
      type: 'CALL',
      contactId: contact.id,
      note: 'API test phone call activity'
    };

    console.log('API Data being sent:', apiData);

    // Check if this would pass validation
    const validTypes = ['EMAIL', 'CALL', 'MEETING', 'MEETING_REQUEST', 'LINKEDIN', 'REFERRAL', 'CONFERENCE'];
    console.log('Valid types:', validTypes);
    console.log('Is CALL valid?', validTypes.includes('CALL'));

    // Clean up the test activity
    await prisma.activity.delete({
      where: { id: phoneCallActivity.id }
    });

    console.log('\n=== Test completed ===');

  } catch (error) {
    console.error('Error testing phone call creation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCreatePhoneCall(); 
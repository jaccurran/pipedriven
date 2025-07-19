import { prisma } from '../src/lib/prisma';

async function testPhoneCallMapping() {
  try {
    // Find a recent phone call activity
    const phoneCallActivity = await prisma.activity.findFirst({
      where: {
        type: 'CALL'
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        contact: true,
        user: true,
        campaign: true
      }
    });

    if (phoneCallActivity) {
      console.log('=== Phone Call Activity Details ===');
      console.log('ID:', phoneCallActivity.id);
      console.log('Type:', phoneCallActivity.type);
      console.log('Subject:', phoneCallActivity.subject);
      console.log('Note:', phoneCallActivity.note);
      console.log('Created:', phoneCallActivity.createdAt);
      console.log('Contact:', phoneCallActivity.contact?.name);
      console.log('User:', phoneCallActivity.user?.name);
      console.log('Campaign:', phoneCallActivity.campaign?.name);
    } else {
      console.log('No CALL activities found');
    }

    // Check if there are any activities with different types that might be phone calls
    const recentActivities = await prisma.activity.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    console.log('\n=== Recent Activities (Last 7 days) ===');
    recentActivities.forEach((activity, index) => {
      console.log(`${index + 1}. Type: ${activity.type}, Subject: ${activity.subject}, Note: ${activity.note}, Created: ${activity.createdAt}`);
    });

    // Check for any EMAIL activities that might actually be phone calls
    const emailActivities = await prisma.activity.findMany({
      where: {
        type: 'EMAIL',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log('\n=== Recent EMAIL Activities ===');
    emailActivities.forEach((activity, index) => {
      console.log(`${index + 1}. Type: ${activity.type}, Subject: ${activity.subject}, Note: ${activity.note}, Created: ${activity.createdAt}`);
    });

  } catch (error) {
    console.error('Error testing phone call mapping:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPhoneCallMapping(); 
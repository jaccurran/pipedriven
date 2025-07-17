import { prisma } from "../src/lib/prisma";

async function testSession() {
  try {
    console.log("🔍 Testing session API...\n");
    
    // Test the session endpoint directly
    const response = await fetch("http://localhost:3000/api/auth/session", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(`📊 Session API Response Status: ${response.status}`);
    
    if (response.ok) {
      const sessionData = await response.json();
      console.log("📊 Session Data:", JSON.stringify(sessionData, null, 2));
    } else {
      console.log("❌ Session API failed:", response.statusText);
    }

    // Test with a specific user
    console.log("\n🔍 Testing with seeded user...");
    const user = await prisma.user.findFirst({
      where: { email: "john@the4oc.com" },
      select: { id: true, email: true, name: true }
    });

    if (user) {
      console.log("✅ Found seeded user:", user);
    } else {
      console.log("❌ No seeded user found");
    }

    console.log("\n✅ Session test complete!");
    
  } catch (error) {
    console.error("❌ Error testing session:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testSession(); 
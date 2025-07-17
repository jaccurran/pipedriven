import { prisma } from "../src/lib/prisma";

async function testLogin() {
  try {
    console.log("🔍 Testing login flow...\n");
    
    // Test the credentials login endpoint
    const loginResponse = await fetch("http://localhost:3000/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        email: "john@the4oc.com",
        password: "password123",
        callbackUrl: "/dashboard",
        json: "true",
      }),
    });

    console.log(`📊 Login Response Status: ${loginResponse.status}`);
    console.log(`📊 Login Response Headers:`, Object.fromEntries(loginResponse.headers.entries()));
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log("📊 Login Data:", JSON.stringify(loginData, null, 2));
    } else {
      console.log("❌ Login failed:", loginResponse.statusText);
      const errorText = await loginResponse.text();
      console.log("❌ Error details:", errorText);
    }

    // Test session after login attempt
    console.log("\n🔍 Testing session after login...");
    const sessionResponse = await fetch("http://localhost:3000/api/auth/session", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(`📊 Session Response Status: ${sessionResponse.status}`);
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      console.log("📊 Session Data:", JSON.stringify(sessionData, null, 2));
    }

    console.log("\n✅ Login test complete!");
    
  } catch (error) {
    console.error("❌ Error testing login:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin(); 
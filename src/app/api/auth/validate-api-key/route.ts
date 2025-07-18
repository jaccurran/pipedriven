import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptApiKey, encryptApiKey } from "@/lib/apiKeyEncryption";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate that the user still exists in the database
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    });

    if (!userExists) {
      console.log('User no longer exists in database, invalidating session:', session.user.id);
      return NextResponse.json(
        { error: "User session invalid - please sign in again" },
        { status: 401 }
      );
    }

    let apiKey: string;
    try {
      const body = await request.json();
      apiKey = body?.apiKey;
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        { success: false, error: "Invalid request body - JSON parsing failed" },
        { status: 400 }
      );
    }
    
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return NextResponse.json(
        { success: false, error: "API key is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Clean the API key
    apiKey = apiKey.trim();

    // Test the API key by making a simple Pipedrive API call (use api_token param)
    const testResponse = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${apiKey}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!testResponse.ok) {
      const errorData = await testResponse.json().catch(() => ({}));
      console.error("Pipedrive API test failed:", {
        status: testResponse.status,
        statusText: testResponse.statusText,
        error: errorData
      });
      
      return NextResponse.json(
        { success: false, error: "Invalid API key - Pipedrive API test failed" },
        { status: 400 }
      );
    }

    // Encrypt and save the API key
    try {
      const encryptedApiKey = await encryptApiKey(apiKey);
      
      await prisma.user.update({
        where: { id: session.user.id },
        data: { pipedriveApiKey: encryptedApiKey },
      });

      return NextResponse.json({ success: true });
    } catch (saveError) {
      console.error("Failed to save API key:", saveError);
      return NextResponse.json(
        { success: false, error: "Failed to save API key" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API key validation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate API key" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate that the user still exists in the database
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    });

    if (!userExists) {
      console.log('User no longer exists in database, invalidating session:', session.user.id);
      return NextResponse.json(
        { error: "User session invalid - please sign in again" },
        { status: 401 }
      );
    }

    // Get user's API key from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { pipedriveApiKey: true },
    });

    if (!user?.pipedriveApiKey) {
      return NextResponse.json(
        { valid: false, hasApiKey: false },
        { status: 200 }
      );
    }

    let decryptedApiKey: string;

    try {
      // Try to decrypt the API key (new encrypted format)
      decryptedApiKey = await decryptApiKey(user.pipedriveApiKey);
    } catch (decryptError) {
      console.error("API key decryption error:", decryptError);
      
      // If decryption fails, check if it's in the old plain text format
      if (user.pipedriveApiKey.length === 40 && /^[a-f0-9]{40}$/i.test(user.pipedriveApiKey)) {
        // It's a plain text API key, encrypt it and save it
        try {
          const encryptedApiKey = await encryptApiKey(user.pipedriveApiKey);
          await prisma.user.update({
            where: { id: session.user.id },
            data: { pipedriveApiKey: encryptedApiKey },
          });
          decryptedApiKey = user.pipedriveApiKey;
        } catch (encryptError) {
          console.error("Failed to encrypt plain text API key:", encryptError);
          return NextResponse.json(
            { valid: false, hasApiKey: true, error: "Failed to encrypt API key" },
            { status: 200 }
          );
        }
      } else {
        console.error("Invalid API key format for user", session.user.id, "length:", user.pipedriveApiKey.length);
        return NextResponse.json(
          { valid: false, hasApiKey: true, error: "Invalid API key format" },
          { status: 200 }
        );
      }
    }

    // Test the API key by making a simple Pipedrive API call (use api_token param)
    const testResponse = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${decryptedApiKey}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const pipedriveResponse = await testResponse.json().catch(() => ({}));

    if (!testResponse.ok) {
      console.error("Pipedrive API validation failed for user", session.user.id, "status:", testResponse.status, "response:", pipedriveResponse);
      return NextResponse.json(
        { valid: false, hasApiKey: true, error: "API key validation failed", pipedriveResponse },
        { status: 200 }
      );
    }

    return NextResponse.json({ valid: true, hasApiKey: true, pipedriveResponse });
  } catch (error) {
    console.error("API key validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate API key" },
      { status: 500 }
    );
  }
} 
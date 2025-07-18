import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (session?.user?.id) {
      // Delete the session from the database
      await prisma.session.deleteMany({
        where: { userId: session.user.id }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signout error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sign out" },
      { status: 500 }
    );
  }
} 
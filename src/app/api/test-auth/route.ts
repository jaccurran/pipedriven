import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    console.log('🧪 Test auth API called with:', { email, hasPassword: !!password })

    // Test user lookup
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
      },
    })

    console.log('👤 User lookup result:', {
      found: !!user,
      hasPassword: !!user?.password,
      email: user?.email,
      role: user?.role
    })

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'User not found or no password' },
        { status: 401 }
      )
    }

    // Test password verification
    const isValidPassword = await verifyPassword(password, user.password)
    console.log('🔐 Password verification result:', isValidPassword)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    })
  } catch (error) {
    console.error('❌ Test auth error:', error)
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 
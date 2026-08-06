import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { saveUser, findUser } from '@/lib/db';
import { generateToken } from '@/lib/jwt';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, businessName, location } = body;

    if (!email || !password || !fullName || !businessName || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await findUser(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Create user
    const userId = randomUUID();
    const now = new Date().toISOString();

    const user = {
      id: userId,
      email,
      passwordHash,
      fullName,
      businessName,
      location,
      currentWeek: 'Week 1',
      photoUrl: 'https://picsum.photos/seed/agent/200/200',
      createdAt: now,
      updatedAt: now
    };

    await saveUser(user);

    // Generate token
    const token = generateToken(userId);

    return NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: userId,
          email,
          fullName,
          businessName,
          location
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to register' },
      { status: 500 }
    );
  }
}

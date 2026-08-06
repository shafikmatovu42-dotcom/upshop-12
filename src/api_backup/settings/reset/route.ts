import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUser, resetDatabaseKeepingProducts, wipeAllData } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  return decoded?.userId || null;
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, email, password } = body;

    if (!type || !email || !password) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Authenticate user
    const user = await findUser(email);
    if (!user || user.id !== userId) {
      return NextResponse.json({ error: 'Invalid user credentials or mismatch' }, { status: 401 });
    }

    const isValidPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Execute reset action
    if (type === 'reset_keep_products') {
      await resetDatabaseKeepingProducts(userId);
    } else if (type === 'wipe_all') {
      await wipeAllData();
    } else {
      return NextResponse.json({ error: 'Invalid reset type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reset database error:', error);
    return NextResponse.json({ error: error.message || 'Failed to reset database' }, { status: 500 });
  }
}

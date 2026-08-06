import { NextRequest, NextResponse } from 'next/server';
import { dismissDebtorNotification } from '@/lib/db';
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
    const { saleId } = body;

    if (!saleId) {
      return NextResponse.json({ error: 'Missing saleId' }, { status: 400 });
    }

    await dismissDebtorNotification(saleId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Debtor dismiss error:', error);
    return NextResponse.json({ error: error.message || 'Failed to dismiss debtor' }, { status: 500 });
  }
}

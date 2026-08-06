import { NextRequest, NextResponse } from 'next/server';
import { getUserMovements, saveMovement } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { randomUUID } from 'crypto';

function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  return decoded?.userId || null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const movements = await getUserMovements(userId);

    return NextResponse.json(
      movements.map(m => ({
        id: m.id,
        productName: m.productName,
        quantity: m.quantity,
        type: m.type,
        destination: m.destination,
        week: m.week,
        timestamp: m.timestamp
      }))
    );
  } catch (error) {
    console.error('Get movements error:', error);
    return NextResponse.json({ error: 'Failed to fetch movements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productName, quantity, type, destination, week } = body;

    if (!productName || !quantity || !type || !destination || !week) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const movementId = randomUUID();
    const now = new Date().toISOString();

    const movement = {
      id: movementId,
      userId,
      productName,
      quantity,
      type,
      destination,
      week,
      timestamp: now,
      createdAt: now
    };

    await saveMovement(movement);

    return NextResponse.json({
      id: movement.id,
      productName: movement.productName,
      quantity: movement.quantity,
      type: movement.type,
      destination: movement.destination,
      week: movement.week,
      timestamp: movement.timestamp
    }, { status: 201 });
  } catch (error) {
    console.error('Create movement error:', error);
    return NextResponse.json({ error: 'Failed to create movement' }, { status: 500 });
  }
}

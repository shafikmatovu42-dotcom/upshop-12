import { NextRequest, NextResponse } from 'next/server';
import { getUserReturns, saveReturn, findProduct, saveProduct, getDb } from '@/lib/db';
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

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const returns = await getUserReturns(userId);
    return NextResponse.json(returns);
  } catch (error) {
    console.error('Get returns error:', error);
    return NextResponse.json({ error: 'Failed to fetch returns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { saleId, productName, quantity, amount, reason, status, productId } = body;

    if (!saleId || !productName || !quantity || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Re-instate product stock
    const db = await getDb();
    let product: any = null;
    if (productId) {
      product = await findProduct(productId);
    } else {
      product = await db.get('SELECT * FROM products WHERE name = ? AND userId = ?', [productName, userId]);
    }

    if (product) {
      product.shopStock = (product.shopStock || 0) + Number(quantity);
      await saveProduct(product);
    }

    // 2. Save Return Entry
    const returnId = `RET-${Math.floor(1000 + Math.random() * 9000)}`;
    const returnEntry = {
      id: returnId,
      userId,
      saleId,
      productName,
      quantity: Number(quantity),
      amount: Number(amount),
      reason,
      status: status || 'reinstated',
      timestamp: new Date().toISOString()
    };

    await saveReturn(returnEntry);

    return NextResponse.json(returnEntry, { status: 201 });
  } catch (error) {
    console.error('Create return error:', error);
    return NextResponse.json({ error: 'Failed to record return' }, { status: 500 });
  }
}

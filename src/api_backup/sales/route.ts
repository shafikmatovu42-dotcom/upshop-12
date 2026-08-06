import { NextRequest, NextResponse } from 'next/server';
import { getUserSales, saveSale } from '@/lib/db';
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

    const sales = await getUserSales(userId);

    return NextResponse.json(
      sales.map(s => ({
        id: s.id,
        week: s.week,
        total: s.total,
        paymentMethod: s.paymentMethod,
        customerName: s.customerName,
        status: s.status,
        dueDate: s.dueDate,
        amountPaid: s.amountPaid,
        dismissed: s.dismissed,
        timestamp: s.timestamp,
        items: s.items || []
      }))
    );
  } catch (error) {
    console.error('Get sales error:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { week, total, paymentMethod, customerName, status, dueDate, amountPaid, items } = body;

    if (!week || total === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const saleId = randomUUID();
    const now = new Date().toISOString();

    const sale = {
      id: saleId,
      userId,
      week,
      total,
      paymentMethod: paymentMethod || 'cash',
      customerName: customerName || 'Normal Customer',
      status: status || 'paid',
      dueDate: dueDate || null,
      amountPaid: amountPaid !== undefined ? amountPaid : (paymentMethod === 'credit' ? 0 : total),
      dismissed: 0,
      timestamp: now,
      createdAt: now
    };

    await saveSale(sale, items);

    return NextResponse.json({
      id: sale.id,
      week: sale.week,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      customerName: sale.customerName,
      status: sale.status,
      dueDate: sale.dueDate,
      amountPaid: sale.amountPaid,
      dismissed: sale.dismissed,
      timestamp: sale.timestamp,
      items: items || []
    }, { status: 201 });
  } catch (error) {
    console.error('Create sale error:', error);
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}

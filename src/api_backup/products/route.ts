import { NextRequest, NextResponse } from 'next/server';
import { getUserProducts, saveProduct } from '@/lib/db';
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

    const products = await getUserProducts(userId);

    return NextResponse.json(
      products.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        warehouseStock: p.warehouseStock,
        shopStock: p.shopStock,
        minStockLevel: p.minStockLevel,
        imageUrl: p.imageUrl
      }))
    );
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, category, price, warehouseStock, shopStock, imageUrl } = body;

    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const productId = randomUUID();
    const now = new Date().toISOString();

    const product = {
      id: productId,
      userId,
      name,
      category: category || 'General',
      price: price || 0,
      warehouseStock: warehouseStock || 0,
      shopStock: shopStock || 0,
      minStockLevel: 5,
      imageUrl: imageUrl || 'https://picsum.photos/seed/placeholder/400/400',
      createdAt: now,
      updatedAt: now
    };

    await saveProduct(product);

    return NextResponse.json({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      warehouseStock: product.warehouseStock,
      shopStock: product.shopStock,
      minStockLevel: product.minStockLevel,
      imageUrl: product.imageUrl
    }, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

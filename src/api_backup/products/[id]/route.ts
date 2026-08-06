import { NextRequest, NextResponse } from 'next/server';
import { findProduct, saveProduct, getUserProducts } from '@/lib/db';
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, category, price, warehouseStock, shopStock, minStockLevel, imageUrl } = body;

    const product = await findProduct(id);
    if (!product || product.userId !== userId) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update product
    if (name !== undefined) product.name = name;
    if (category !== undefined) product.category = category;
    if (price !== undefined) product.price = Number(price);
    if (warehouseStock !== undefined) product.warehouseStock = Number(warehouseStock);
    if (shopStock !== undefined) product.shopStock = Number(shopStock);
    if (minStockLevel !== undefined) product.minStockLevel = Number(minStockLevel);
    if (imageUrl !== undefined) product.imageUrl = imageUrl;
    product.updatedAt = new Date().toISOString();

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
    });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

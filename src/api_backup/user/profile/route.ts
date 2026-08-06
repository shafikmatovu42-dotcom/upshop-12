import { NextRequest, NextResponse } from 'next/server';
import { findUserById, saveUser } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

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

    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      businessName: user.businessName,
      location: user.location,
      currentWeek: user.currentWeek,
      photoUrl: user.photoUrl,
      revenueTarget: user.revenueTarget,
      motto: user.motto || "",
      operationPeriodMode: user.operationPeriodMode || "weeks",
      receiptPrintingEnabled: user.receiptPrintingEnabled !== undefined ? !!user.receiptPrintingEnabled : true,
      printerName: user.printerName || "UPshop Thermal Receipt-58",
      printerStatus: user.printerStatus || "Online",
      printerIp: user.printerIp || "192.168.8.100"
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentWeek, photoUrl, revenueTarget, fullName, email, password, motto, operationPeriodMode, receiptPrintingEnabled, printerName, printerStatus, printerIp } = body;

    let user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user
    if (currentWeek !== undefined) user.currentWeek = currentWeek;
    if (photoUrl !== undefined) user.photoUrl = photoUrl;
    if (revenueTarget !== undefined) user.revenueTarget = revenueTarget;
    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (motto !== undefined) user.motto = motto;
    if (operationPeriodMode !== undefined) user.operationPeriodMode = operationPeriodMode;
    if (receiptPrintingEnabled !== undefined) user.receiptPrintingEnabled = receiptPrintingEnabled ? 1 : 0;
    if (printerName !== undefined) user.printerName = printerName;
    if (printerStatus !== undefined) user.printerStatus = printerStatus;
    if (printerIp !== undefined) user.printerIp = printerIp;

    if (password !== undefined && password.trim() !== "") {
      const salt = bcrypt.genSaltSync(10);
      user.passwordHash = bcrypt.hashSync(password, salt);
    }

    user.updatedAt = new Date().toISOString();

    await saveUser(user);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      businessName: user.businessName,
      location: user.location,
      currentWeek: user.currentWeek,
      photoUrl: user.photoUrl,
      revenueTarget: user.revenueTarget,
      motto: user.motto || "",
      operationPeriodMode: user.operationPeriodMode || "weeks",
      receiptPrintingEnabled: user.receiptPrintingEnabled !== undefined ? !!user.receiptPrintingEnabled : true,
      printerName: user.printerName || "UPshop Thermal Receipt-58",
      printerStatus: user.printerStatus || "Online",
      printerIp: user.printerIp || "192.168.8.100"
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

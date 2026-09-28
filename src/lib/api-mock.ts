import { invoke } from '@tauri-apps/api/core';
import bcrypt from 'bcryptjs';
import * as db from './db-client';

function safeRandomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Simple browser-safe JWT tokens
export function generateToken(userId: string, extra?: Record<string, any>): string {
  const payload = { userId, ...extra, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 };
  return btoa(JSON.stringify(payload));
}

export function verifyToken(token: string): { userId: string; agentId?: string; role?: string } | null {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return { userId: payload.userId, agentId: payload.agentId, role: payload.role };
  } catch (e) {
    return null;
  }
}

function getAuthInfoFromHeaders(headers?: HeadersInit): { userId: string; agentId?: string; role?: string } | null {
  if (!headers) return null;
  let authHeader: string | null = null;
  
  if (headers instanceof Headers) {
    authHeader = headers.get('authorization');
  } else if (Array.isArray(headers)) {
    const found = headers.find(([key]) => key.toLowerCase() === 'authorization');
    authHeader = found ? found[1] : null;
  } else {
    authHeader = (headers as Record<string, string>)['Authorization'] || (headers as Record<string, string>)['authorization'] || null;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) return null;
  return decoded;
}

function getUserIdFromHeaders(headers?: HeadersInit): string | null {
  const authInfo = getAuthInfoFromHeaders(headers);
  return authInfo?.userId || null;
}


function createJsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function createErrorResponse(error: string, status = 500): Response {
  return createJsonResponse({ error }, status);
}

export async function handleMockRequest(url: string, init?: RequestInit): Promise<Response> {
  // Extract path name from URL (it could be relative or absolute)
  const path = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
  const method = init?.method || 'GET';
  const bodyText = init?.body ? String(init.body) : '';
  const getBody = () => (bodyText ? JSON.parse(bodyText) : {});

  try {
    // 1. Auth Login
    if (path === '/api/auth/login' && method === 'POST') {
      const { email, password, role = 'admin' } = getBody();
      if (!email || !password) {
        return createErrorResponse('Username and password are required', 400);
      }
      
      // Special Developer Dashboard Access Bypass
      if (email === 'fikmen' && password === '1234') {
        const token = generateToken('dev-admin');
        return createJsonResponse({
          success: true,
          token,
          user: {
            id: 'dev-admin',
            email: 'fikmen',
            fullName: 'Lead System Developer',
            businessName: 'FIKMEN DEV CONSOLE',
            location: 'System Core',
            currentWeek: 'Dev Mode',
            photoUrl: 'https://picsum.photos/seed/developer/200/200',
            isDeveloper: true,
            role: 'admin'
          }
        });
      }

      if (role === 'agent') {
        const agent = await db.findAgentByUsername(email);
        if (!agent) {
          return createErrorResponse('Agent account not found', 401);
        }
        const isValidPassword = password === agent.passwordHash || (agent.passwordHash && agent.passwordHash.startsWith('$2a$') && bcrypt.compareSync(password, agent.passwordHash));
        if (!isValidPassword) {
          return createErrorResponse('Invalid agent username or password', 401);
        }
        const parentAdmin = await db.findUserById(agent.adminId);
        const token = generateToken(agent.adminId, { agentId: agent.id, role: 'agent' });
        return createJsonResponse({
          success: true,
          token,
          user: {
            id: agent.id,
            email: agent.username,
            fullName: agent.fullName,
            businessName: parentAdmin ? parentAdmin.businessName : 'Enterprise',
            location: parentAdmin ? parentAdmin.location : 'Main Branch',
            currentWeek: parentAdmin ? parentAdmin.currentWeek : 'Week 1',
            photoUrl: 'https://picsum.photos/seed/agent/200/200',
            role: 'agent',
            adminId: agent.adminId
          }
        });
      }

      const user = await db.findUser(email);
      if (!user) {
        return createErrorResponse('Invalid username or password', 401);
      }
      const isValidPassword = password === user.passwordHash || (user.passwordHash && user.passwordHash.startsWith('$2a$') && bcrypt.compareSync(password, user.passwordHash));
      if (!isValidPassword) {
        return createErrorResponse('Invalid username or password', 401);
      }
      const token = generateToken(user.id);
      return createJsonResponse({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          businessName: user.businessName,
          location: user.location,
          currentWeek: user.currentWeek,
          photoUrl: user.photoUrl,
          role: 'admin'
        }
      });
    }

    // 2. Auth Register
    if (path === '/api/auth/register' && method === 'POST') {
      const body = getBody();
      const { 
        email, 
        password, 
        fullName, 
        businessName, 
        location,
        motto,
        operationPeriodMode,
        revenueTarget,
        openingCash,
        initialProducts,
        initialDebtors,
        initialCreditors
      } = body;

      if (!email || !password || !fullName || !businessName || !location) {
        return createErrorResponse('Missing required fields', 400);
      }
      const existingUser = await db.findUser(email);
      if (existingUser) {
        return createErrorResponse('User with this email already exists', 400);
      }
      const passwordHash = password;
      const userId = safeRandomUUID();
      const now = new Date().toISOString();

      // Compute starting period based on mode
      const isMonthMode = (operationPeriodMode || "weeks") === 'months';
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const currentPeriodLabel = isMonthMode ? months[new Date().getMonth()] : "Week 1";

      const user = {
        id: userId,
        email,
        passwordHash,
        fullName,
        businessName,
        location,
        motto: motto || "",
        operationPeriodMode: operationPeriodMode || "weeks",
        revenueTarget: Number(revenueTarget || 0),
        currentWeek: currentPeriodLabel,
        photoUrl: 'https://picsum.photos/seed/agent/200/200',
        createdAt: now,
        updatedAt: now
      };
      await db.saveUser(user);

      // 1. Log Opening Cash at Hand if provided
      if (openingCash && Number(openingCash) > 0) {
        const openingCashEntry = {
          id: `INF-OPENING-${Date.now()}`,
          title: 'Opening Cash at Hand (Starting Liquidity)',
          category: 'Opening Capital',
          amount: Number(openingCash),
          notes: 'Initial cash balance registered at onboarding',
          timestamp: now,
          source: 'System Onboarding'
        };
        if (typeof window !== 'undefined') {
          const savedInflowsStr = localStorage.getItem('upshop_custom_inflows');
          const currentInflows = savedInflowsStr ? JSON.parse(savedInflowsStr) : [];
          currentInflows.unshift(openingCashEntry);
          localStorage.setItem('upshop_custom_inflows', JSON.stringify(currentInflows));
        }
      }

      // 2. Save Initial Products if provided
      if (initialProducts && Array.isArray(initialProducts)) {
        for (const p of initialProducts) {
          if (p.name && p.name.trim() !== '') {
            const prodObj = {
              id: safeRandomUUID(),
              userId,
              name: p.name.trim(),
              category: p.category || 'General',
              price: Number(p.price || 0),
              buyingPrice: Number(p.buyingPrice || 0),
              shopStock: Number(p.shopStock || 0),
              warehouseStock: Number(p.warehouseStock || 0),
              minStockLevel: 5,
              imageUrl: 'https://picsum.photos/seed/placeholder/400/400',
              createdAt: now,
              updatedAt: now
            };
            await db.saveProduct(prodObj);
          }
        }
      }

      // 3. Save Initial Customer Debtors if provided
      if (initialDebtors && Array.isArray(initialDebtors)) {
        for (const d of initialDebtors) {
          if (d.customerName && Number(d.total || 0) > 0) {
            const saleObj = {
              id: safeRandomUUID(),
              userId,
              week: currentPeriodLabel,
              total: Number(d.total),
              paymentMethod: 'credit',
              cashSubtype: 'hard_cash',
              cashAmount: 0,
              creditAmount: Number(d.total),
              customerName: d.customerName.trim(),
              status: 'unpaid',
              dueDate: d.dueDate || null,
              amountPaid: 0,
              dismissed: 0,
              timestamp: now,
              createdAt: now
            };
            await db.saveSale(saleObj, []);
          }
        }
      }

      // 4. Save Initial Supplier Creditors if provided
      if (initialCreditors && Array.isArray(initialCreditors)) {
        for (const c of initialCreditors) {
          if (c.supplierName && Number(c.totalAmount || 0) > 0) {
            const creditorObj = {
              id: `CRD-${Math.floor(10000 + Math.random() * 90000)}`,
              userId,
              supplierName: c.supplierName.trim(),
              supplierContact: c.supplierContact || '',
              productName: c.productName || 'Stock Purchase',
              quantity: Number(c.quantity || 1),
              unitType: 'pieces',
              buyingPrice: Number(c.totalAmount) / Number(c.quantity || 1),
              totalAmount: Number(c.totalAmount),
              amountPaid: 0,
              paymentMode: 'credit',
              paymentDays: 14,
              dueDate: c.dueDate || null,
              status: 'unpaid',
              dismissed: 0,
              timestamp: now
            };
            await db.saveCreditor(creditorObj);
          }
        }
      }

      const token = generateToken(userId);
      return createJsonResponse({
        success: true,
        token,
        user: {
          id: userId,
          email,
          fullName,
          businessName,
          location,
          currentWeek: user.currentWeek,
          operationPeriodMode: user.operationPeriodMode,
          motto: user.motto
        }
      }, 201);
    }

    // Authenticated Routes Check
    const userId = getUserIdFromHeaders(init?.headers);
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    if (path === '/api/auth/verify' && method === 'POST') {
      const { email, password } = getBody();
      if (!email || !password) {
        return createErrorResponse('Missing required credentials', 400);
      }
      const user = await db.findUser(email);
      if (!user || user.id !== userId) {
        return createErrorResponse('Invalid credentials or user mismatch', 401);
      }
      const isValidPassword = password === user.passwordHash || (user.passwordHash && user.passwordHash.startsWith('$2a$') && bcrypt.compareSync(password, user.passwordHash));
      if (!isValidPassword) {
        return createErrorResponse('Invalid credentials', 401);
      }
      return createJsonResponse({ success: true });
    }

    // 3. User Profile
    if (path === '/api/user/profile') {
      const authInfo = getAuthInfoFromHeaders(init?.headers);
      const user = await db.findUserById(userId);
      if (!user) return createErrorResponse('User not found', 404);

      let agent: any = null;
      if (authInfo?.agentId) {
        agent = await db.findAgentById(authInfo.agentId);
      }

      if (method === 'GET') {
        // Auto-sync currentWeek to the system current date and time
        const now = new Date();
        const isMonths = (user.operationPeriodMode || "weeks") === 'months';
        let actualPeriod = "";
        if (isMonths) {
          const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
          ];
          actualPeriod = months[now.getMonth()];
        } else {
          const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
          const pastDays = (now.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000);
          const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7);
          actualPeriod = `Week ${Math.min(52, Math.max(1, weekNum))}`;
        }

        if (user.currentWeek !== actualPeriod) {
          user.currentWeek = actualPeriod;
          user.updatedAt = now.toISOString();
          await db.saveUser(user);
        }

        return createJsonResponse({
          id: agent ? agent.id : user.id,
          email: agent ? agent.username : user.email,
          fullName: agent ? agent.fullName : user.fullName,
          businessName: user.businessName,
          location: user.location,
          currentWeek: user.currentWeek,
          photoUrl: agent ? (agent.photoUrl || user.photoUrl) : user.photoUrl,
          revenueTarget: user.revenueTarget,
          motto: user.motto || "",
          operationPeriodMode: user.operationPeriodMode || "weeks",
          receiptPrintingEnabled: user.receiptPrintingEnabled !== undefined ? !!user.receiptPrintingEnabled : true,
          printerName: user.printerName || "UPshop Thermal Receipt-58",
          printerStatus: user.printerStatus || "Online",
          printerIp: user.printerIp || "192.168.8.100",
          receiptPaperWidth: user.receiptPaperWidth || "58mm",
          role: agent ? 'agent' : 'admin',
          adminId: agent ? user.id : undefined
        });
      }
      
      if (method === 'PUT') {
        const body = getBody();
        const { currentWeek, photoUrl, revenueTarget, fullName, email, password, motto, operationPeriodMode, receiptPrintingEnabled, printerName, printerStatus, printerIp, receiptPaperWidth } = body;

        if (agent) {
          if (photoUrl !== undefined) agent.photoUrl = photoUrl;
          if (fullName !== undefined) agent.fullName = fullName;
          await db.saveAgent(agent);
        }

        if (currentWeek !== undefined) user.currentWeek = currentWeek;
        if (photoUrl !== undefined && !agent) user.photoUrl = photoUrl;
        if (revenueTarget !== undefined) user.revenueTarget = revenueTarget;
        if (fullName !== undefined && !agent) user.fullName = fullName;
        if (email !== undefined && !agent) user.email = email;
        if (motto !== undefined) user.motto = motto;
        if (operationPeriodMode !== undefined) user.operationPeriodMode = operationPeriodMode;
        if (receiptPrintingEnabled !== undefined) user.receiptPrintingEnabled = receiptPrintingEnabled ? 1 : 0;
        if (printerName !== undefined) user.printerName = printerName;
        if (printerStatus !== undefined) user.printerStatus = printerStatus;
        if (printerIp !== undefined) user.printerIp = printerIp;
        if (receiptPaperWidth !== undefined) user.receiptPaperWidth = receiptPaperWidth;

        if (password !== undefined && password.trim() !== "") {
          user.passwordHash = password;
        }
        user.updatedAt = new Date().toISOString();
        await db.saveUser(user);

        return createJsonResponse({
          id: agent ? agent.id : user.id,
          email: agent ? agent.username : user.email,
          fullName: agent ? agent.fullName : user.fullName,
          businessName: user.businessName,
          location: user.location,
          currentWeek: user.currentWeek,
          photoUrl: agent ? (agent.photoUrl || user.photoUrl) : user.photoUrl,
          revenueTarget: user.revenueTarget,
          motto: user.motto || "",
          operationPeriodMode: user.operationPeriodMode || "weeks",
          receiptPrintingEnabled: user.receiptPrintingEnabled !== undefined ? !!user.receiptPrintingEnabled : true,
          printerName: user.printerName || "UPshop Thermal Receipt-58",
          printerStatus: user.printerStatus || "Online",
          printerIp: user.printerIp || "192.168.8.100",
          receiptPaperWidth: user.receiptPaperWidth || "58mm",
          role: agent ? 'agent' : 'admin',
          adminId: agent ? user.id : undefined
        });
      }
    }


    // 4. Products GET / POST
    if (path === '/api/products' && method === 'GET') {
      const products = await db.getUserProducts(userId);
      return createJsonResponse(
        products.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          type: p.type || 'Standard',
          price: p.price,
          buyingPrice: p.buyingPrice || 0,
          boxBuyingPrice: p.boxBuyingPrice || 0,
          boxSellingPrice: p.boxSellingPrice || 0,
          piecesPerBox: p.piecesPerBox || 1,
          warehouseStock: p.warehouseStock,
          shopStock: p.shopStock,
          minStockLevel: p.minStockLevel,
          imageUrl: p.imageUrl,
          expiryDate: p.expiryDate || null
        }))
      );
    }

    // Product Types API
    if (path === '/api/product-types' && method === 'GET') {
      const urlObj = new URL(url, 'http://localhost')
      const productName = urlObj.searchParams.get('productName') || undefined
      const types = await db.getUserProductTypes(userId, productName)
      return createJsonResponse(types.map(t => ({
        id: t.id,
        productName: t.productName,
        typeName: t.typeName,
        buyingPrice: t.buyingPrice,
        price: t.price,
        warehouseStock: t.warehouseStock,
        shopStock: t.shopStock,
        piecesPerBox: t.piecesPerBox,
        imageUrl: t.imageUrl
      })))
    }

    if (path === '/api/product-types' && method === 'POST') {
      const body = getBody()
      const { name, category, type, buyingPrice, price, warehouseStock, shopStock, piecesPerBox, imageUrl } = body
      if (!name || !type) return createErrorResponse('Missing required fields', 400)
      const id = safeRandomUUID()
      const now = new Date().toISOString()
      const pt = {
        id,
        userId,
        productName: name,
        typeName: type,
        buyingPrice: Number(buyingPrice || 0),
        price: Number(price || 0),
        warehouseStock: Number(warehouseStock || 0),
        shopStock: Number(shopStock || 0),
        piecesPerBox: Number(piecesPerBox || 1),
        imageUrl: imageUrl || null,
        createdAt: now,
        updatedAt: now
      }
      await db.saveProductType(pt)
      return createJsonResponse(pt, 201)
    }

    if (path.startsWith('/api/product-types/') && method === 'PUT') {
      const parts = path.split('/')
      const id = parts[parts.length - 1]
      const body = getBody()
      const existing = await db.findProductTypeById(id)
      if (!existing || existing.userId !== userId) return createErrorResponse('Product type not found', 404)
      const updated = { ...existing, ...body, updatedAt: new Date().toISOString() }
      await db.saveProductType(updated)
      return createJsonResponse(updated)
    }

    if (path.startsWith('/api/product-types/') && method === 'DELETE') {
      const parts = path.split('/')
      const id = parts[parts.length - 1]
      const existing = await db.findProductTypeById(id)
      if (!existing || existing.userId !== userId) return createErrorResponse('Product type not found', 404)
      await db.deleteProductType(id)
      return createJsonResponse({ success: true })
    }

    if (path === '/api/products' && method === 'POST') {
      const { name, category, type, price, buyingPrice, boxBuyingPrice, boxSellingPrice, piecesPerBox, warehouseStock, shopStock, imageUrl, expiryDate } = getBody();
      if (!name) return createErrorResponse('Product name is required', 400);
      const productId = safeRandomUUID();
      const now = new Date().toISOString();
      const product = {
        id: productId,
        userId,
        name,
        category: category || 'General',
        type: type || 'Standard',
        price: price || 0,
        buyingPrice: buyingPrice || 0,
        boxBuyingPrice: boxBuyingPrice || 0,
        boxSellingPrice: boxSellingPrice || 0,
        piecesPerBox: piecesPerBox || 1,
        warehouseStock: warehouseStock || 0,
        shopStock: shopStock || 0,
        minStockLevel: 5,
        imageUrl: imageUrl || 'https://picsum.photos/seed/placeholder/400/400',
        expiryDate: expiryDate || null,
        createdAt: now,
        updatedAt: now
      };
      await db.saveProduct(product);
      return createJsonResponse({
        id: product.id,
        name: product.name,
        category: product.category,
        type: product.type,
        price: product.price,
        buyingPrice: product.buyingPrice,
        boxBuyingPrice: product.boxBuyingPrice,
        boxSellingPrice: product.boxSellingPrice,
        piecesPerBox: product.piecesPerBox,
        warehouseStock: product.warehouseStock,
        shopStock: product.shopStock,
        minStockLevel: product.minStockLevel,
        imageUrl: product.imageUrl,
        expiryDate: product.expiryDate
      }, 201);
    }

    // 5. Product Update /api/products/[id]
    if (path.startsWith('/api/products/') && method === 'PUT') {
      const parts = path.split('/');
      const id = parts[parts.length - 1];
      const body = getBody();
      const { name, category, type, price, buyingPrice, boxBuyingPrice, boxSellingPrice, piecesPerBox, warehouseStock, shopStock, minStockLevel, imageUrl, expiryDate } = body;
      const product = await db.findProduct(id);
      if (!product || product.userId !== userId) {
        return createErrorResponse('Product not found', 404);
      }

      if (name !== undefined) product.name = name;
      if (category !== undefined) product.category = category;
      if (type !== undefined) product.type = type;
      if (price !== undefined) product.price = Number(price);
      if (buyingPrice !== undefined) product.buyingPrice = Number(buyingPrice);
      if (boxBuyingPrice !== undefined) product.boxBuyingPrice = Number(boxBuyingPrice);
      if (boxSellingPrice !== undefined) product.boxSellingPrice = Number(boxSellingPrice);
      if (piecesPerBox !== undefined) product.piecesPerBox = Number(piecesPerBox);
      if (warehouseStock !== undefined) product.warehouseStock = Number(warehouseStock);
      if (shopStock !== undefined) product.shopStock = Number(shopStock);
      if (minStockLevel !== undefined) product.minStockLevel = Number(minStockLevel);
      if (imageUrl !== undefined) product.imageUrl = imageUrl;
      if (expiryDate !== undefined) product.expiryDate = expiryDate;
      product.updatedAt = new Date().toISOString();

      await db.saveProduct(product);
      return createJsonResponse({
        id: product.id,
        name: product.name,
        category: product.category,
        type: product.type,
        price: product.price,
        buyingPrice: product.buyingPrice,
        boxBuyingPrice: product.boxBuyingPrice,
        boxSellingPrice: product.boxSellingPrice,
        piecesPerBox: product.piecesPerBox,
        warehouseStock: product.warehouseStock,
        shopStock: product.shopStock,
        minStockLevel: product.minStockLevel,
        imageUrl: product.imageUrl,
        expiryDate: product.expiryDate
      });
    }

    if (path.startsWith('/api/products/') && method === 'DELETE') {
      const parts = path.split('/');
      const id = parts[parts.length - 1];
      const product = await db.findProduct(id);
      if (!product || product.userId !== userId) {
        return createErrorResponse('Product not found', 404);
      }
      await db.deleteProduct(id);
      return createJsonResponse({ success: true });
    }

    if (path === '/api/products/dismiss-expired' && method === 'POST') {
      const { productId, qtyToDismiss, lossAmount } = getBody();
      if (!productId) return createErrorResponse('Missing productId', 400);
      await db.dismissExpiredStock(productId, Number(qtyToDismiss || 0), Number(lossAmount || 0));
      return createJsonResponse({ success: true });
    }

    if (path === '/api/products/dismiss-batch' && method === 'POST') {
      const { movementId, productId, qtyToDismiss, lossAmount } = getBody();
      if (!movementId) return createErrorResponse('Missing movementId', 400);
      await db.dismissExpiredBatch(movementId, productId || '', Number(qtyToDismiss || 0), Number(lossAmount || 0));
      return createJsonResponse({ success: true });
    }

    if (path === '/api/products/ignore-expiry' && method === 'POST') {
      const { productId } = getBody();
      if (!productId) return createErrorResponse('Missing productId', 400);
      await db.ignoreExpiryAlert(productId);
      return createJsonResponse({ success: true });
    }

    // 6. Movements
    if (path === '/api/movements' && method === 'GET') {
      const movements = await db.getUserMovements(userId);
      return createJsonResponse(
        movements.map(m => ({
          id: m.id,
          productName: m.productName,
          typeName: m.typeName || m.productType || null,
          quantity: m.quantity,
          type: m.type,
          destination: m.destination,
          week: m.week,
          timestamp: m.timestamp,
          buyingPrice: m.buyingPrice,
          sellingPrice: m.sellingPrice,
          unitType: m.unitType,
          paymentMode: m.paymentMode,
          supplierName: m.supplierName,
          supplierContact: m.supplierContact,
          totalAmount: m.totalAmount,
          transferredBy: m.transferredBy,
          receivedBy: m.receivedBy,
          expiryDate: m.expiryDate || null,
          dismissed: !!m.dismissed
        }))
      );
    }

    if (path === '/api/movements' && method === 'POST') {
      const body = getBody();
      const { productName, typeName, productType, quantity, type, destination, week, buyingPrice, sellingPrice, unitType, paymentMode, supplierName, supplierContact, totalAmount, transferredBy, receivedBy, expiryDate, timestamp } = body;
      if (!productName || !quantity || !type || !destination || !week) {
        return createErrorResponse('Missing required fields', 400);
      }
      const movementId = safeRandomUUID();
      const now = timestamp || new Date().toISOString();
      const movement = {
        id: movementId,
        userId,
        productName,
        typeName: typeName || productType || null,
        quantity,
        type,
        destination,
        week,
        timestamp: now,
        createdAt: now,
        buyingPrice,
        sellingPrice,
        unitType,
        paymentMode,
        supplierName,
        supplierContact,
        totalAmount,
        transferredBy,
        receivedBy,
        expiryDate: expiryDate || null,
        dismissed: 0
      };
      await db.saveMovement(movement);
      return createJsonResponse(movement, 201);
    }

    // 6b. Partners API
    if (path === '/api/partners' && method === 'GET') {
      const partners = await db.getUserPartners(userId);
      return createJsonResponse(partners);
    }

    if (path === '/api/partners' && method === 'POST') {
      const { name, category, contactPerson, phone, email, location } = getBody();
      if (!name) return createErrorResponse('Partner company name is required', 400);
      const partnerId = safeRandomUUID();
      const partner = {
        id: partnerId,
        userId,
        name,
        category: category || 'General Supplier',
        contactPerson: contactPerson || name,
        phone: phone || '',
        email: email || '',
        location: location || ''
      };
      await db.savePartner(partner);
      return createJsonResponse(partner, 201);
    }

    if (path === '/api/partners' && method === 'DELETE') {
      const { id } = getBody();
      if (!id) return createErrorResponse('Missing partner id', 400);
      await db.deletePartner(id);
      return createJsonResponse({ success: true });
    }

    // 6c. Creditors API
    if (path === '/api/creditors' && method === 'GET') {
      const creditors = await db.getUserCreditors(userId);
      return createJsonResponse(creditors);
    }

    if (path === '/api/creditors' && method === 'POST') {
      const body = getBody();
      const { supplierName, supplierContact, productName, typeName, quantity, unitType, buyingPrice, totalAmount, paymentMode, paymentDays, dueDate, timestamp } = body;
      if (!supplierName || !productName || !totalAmount) {
        return createErrorResponse('Missing required creditor fields', 400);
      }
      const creditorId = `CRD-${Math.floor(10000 + Math.random() * 90000)}`;
      const now = timestamp || new Date().toISOString();
      const creditor = {
        id: creditorId,
        userId,
        supplierName,
        supplierContact: supplierContact || '',
        productName,
        typeName: typeName || null,
        quantity: Number(quantity || 1),
        unitType: unitType || 'pieces',
        buyingPrice: Number(buyingPrice || 0),
        totalAmount: Number(totalAmount),
        amountPaid: 0,
        paymentMode: paymentMode || 'credit',
        paymentDays: Number(paymentDays || 0),
        dueDate: dueDate || null,
        status: 'unpaid',
        dismissed: 0,
        timestamp: now
      };
      await db.saveCreditor(creditor);
      return createJsonResponse(creditor, 201);
    }

    if (path === '/api/creditors/pay' && method === 'POST') {
      const { creditorId, amount } = getBody();
      if (!creditorId || amount === undefined || amount <= 0) {
        return createErrorResponse('Missing or invalid parameters', 400);
      }
      await db.updateCreditorPayment(creditorId, Number(amount));
      return createJsonResponse({ success: true });
    }

    if (path === '/api/creditors/dismiss' && method === 'POST') {
      const { creditorId } = getBody();
      if (!creditorId) return createErrorResponse('Missing creditorId', 400);
      await db.dismissCreditorNotification(creditorId);
      return createJsonResponse({ success: true });
    }

    if (path === '/api/creditors' && method === 'DELETE') {
      const { creditorId } = getBody();
      if (!creditorId) return createErrorResponse('Missing creditorId', 400);
      await db.deleteCreditor(creditorId);
      return createJsonResponse({ success: true });
    }

    // 6d. Notes & Notebook API
    if (path === '/api/notes' && method === 'GET') {
      const notes = await db.getUserNotes(userId);
      return createJsonResponse(notes);
    }

    if (path === '/api/notes' && method === 'POST') {
      const body = getBody();
      const { title, content, tags, category, isPinned, dueDate } = body;
      if (!title || !content) {
        return createErrorResponse('Title and content are required for a note', 400);
      }
      const noteId = `NOTE-${Math.floor(10000 + Math.random() * 90000)}`;
      const now = new Date().toISOString();
      const note = {
        id: noteId,
        userId,
        title,
        content,
        tags: tags || '',
        category: category || 'general',
        isPinned: isPinned ? 1 : 0,
        status: 'active',
        dueDate: dueDate || null,
        timestamp: now
      };
      await db.saveNote(note);
      return createJsonResponse(note, 201);
    }

    if (path.startsWith('/api/notes/') && method === 'PUT') {
      const parts = path.split('/');
      const id = parts[parts.length - 1];
      const body = getBody();
      const existingNotes = await db.getUserNotes(userId);
      const existing = existingNotes.find(n => n.id === id);
      if (!existing) return createErrorResponse('Note not found', 404);
      const updated = { ...existing, ...body, timestamp: new Date().toISOString() };
      await db.saveNote(updated);
      return createJsonResponse(updated);
    }

    if (path.startsWith('/api/notes/') && method === 'DELETE') {
      const parts = path.split('/');
      const id = parts[parts.length - 1];
      await db.deleteNote(id);
      return createJsonResponse({ success: true });
    }

    // 7. Sales
    if (path === '/api/sales' && method === 'GET') {
      const sales = await db.getUserSales(userId);
      return createJsonResponse(
        sales.map(s => ({
          id: s.id,
          week: s.week,
          total: s.total,
          paymentMethod: s.paymentMethod,
          cashSubtype: s.cashSubtype,
          cashAmount: s.cashAmount,
          creditAmount: s.creditAmount,
          customerName: s.customerName,
          status: s.status,
          dueDate: s.dueDate,
          amountPaid: s.amountPaid,
          dismissed: s.dismissed,
          timestamp: s.timestamp,
          items: s.items || []
        }))
      );
    }

    if (path === '/api/sales' && method === 'POST') {
      const body = getBody();
      const { week, total, paymentMethod, cashSubtype, cashAmount, creditAmount, customerName, status, dueDate, amountPaid, items, timestamp } = body;
      if (!week || total === undefined) {
        return createErrorResponse('Missing required fields', 400);
      }
      const saleId = safeRandomUUID();
      const now = timestamp || new Date().toISOString();
      const sale = {
        id: saleId,
        userId,
        week,
        total,
        paymentMethod: paymentMethod || 'cash',
        cashSubtype: cashSubtype || 'hard_cash',
        cashAmount: cashAmount !== undefined ? cashAmount : (paymentMethod === 'credit' ? 0 : total),
        creditAmount: creditAmount !== undefined ? creditAmount : (paymentMethod === 'credit' ? total : 0),
        customerName: customerName || 'Normal Customer',
        status: status || 'paid',
        dueDate: dueDate || null,
        amountPaid: amountPaid !== undefined ? amountPaid : (paymentMethod === 'credit' ? 0 : total),
        dismissed: 0,
        timestamp: now,
        createdAt: now,
        items: items || []
      };
      await db.saveSale(sale, items);
      return createJsonResponse({
        id: sale.id,
        week: sale.week,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        cashSubtype: sale.cashSubtype,
        cashAmount: sale.cashAmount,
        creditAmount: sale.creditAmount,
        customerName: sale.customerName,
        status: sale.status,
        dueDate: sale.dueDate,
        amountPaid: sale.amountPaid,
        dismissed: sale.dismissed,
        timestamp: sale.timestamp,
        items: items || []
      }, 201);
    }

    // 7b. Orders API
    if (path === '/api/orders' && method === 'GET') {
      const orders = await db.getUserOrders(userId);
      return createJsonResponse(orders);
    }

    if (path === '/api/orders' && method === 'POST') {
      const { week, total, paymentMethod, cashSubtype, cashAmount, creditAmount, customerName, status, dueDate, items } = getBody();
      if (!week || total === undefined) {
        return createErrorResponse('Missing required fields', 400);
      }
      const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      const now = new Date().toISOString();
      const order = {
        id: orderId,
        userId,
        week,
        total,
        paymentMethod: paymentMethod || 'cash',
        cashSubtype: cashSubtype || 'hard_cash',
        cashAmount: cashAmount !== undefined ? cashAmount : (paymentMethod === 'credit' ? 0 : total),
        creditAmount: creditAmount !== undefined ? creditAmount : (paymentMethod === 'credit' ? total : 0),
        customerName: customerName || 'Normal Customer',
        status: status || 'pending',
        dueDate: dueDate || null,
        timestamp: now,
        items: items || []
      };
      await db.saveOrder(order);
      return createJsonResponse(order, 201);
    }

    if (path.startsWith('/api/orders/') && method === 'PUT') {
      const parts = path.split('/');
      const orderId = parts[parts.length - 1];
      const { status } = getBody();
      if (!orderId || !status) {
        return createErrorResponse('Missing orderId or status', 400);
      }

      await db.updateOrderStatus(orderId, status);

      if (status === 'approved') {
        const userOrders = await db.getUserOrders(userId);
        const targetOrder = userOrders.find((o: any) => o.id === orderId);
        if (targetOrder) {
          // 1. Create completed sale record
          const saleId = safeRandomUUID();
          const now = new Date().toISOString();
          const sale = {
            id: saleId,
            userId,
            week: targetOrder.week,
            total: targetOrder.total,
            paymentMethod: targetOrder.paymentMethod || 'cash',
            cashSubtype: targetOrder.cashSubtype || 'hard_cash',
            cashAmount: targetOrder.cashAmount,
            creditAmount: targetOrder.creditAmount,
            customerName: targetOrder.customerName || 'Normal Customer',
            status: targetOrder.paymentMethod === 'credit' ? 'unpaid' : 'paid',
            dueDate: targetOrder.dueDate || null,
            amountPaid: targetOrder.paymentMethod === 'credit' ? 0 : targetOrder.total,
            dismissed: 0,
            timestamp: now,
            createdAt: now,
            items: targetOrder.items || []
          };
          await db.saveSale(sale, targetOrder.items);

          // 2. Update product stocks for each item in the order
          if (targetOrder.items && Array.isArray(targetOrder.items)) {
            for (const item of targetOrder.items) {
              const product = await db.findProduct(item.id);
              if (product) {
                const qty = item.quantity || 1;
                product.shopStock = Math.max(0, (product.shopStock || 0) - qty);
                await db.saveProduct(product);
              }
            }
          }
        }
      }

      return createJsonResponse({ success: true, status });
    }

    // 8. Returns
    if (path === '/api/returns' && method === 'GET') {
      const returns = await db.getUserReturns(userId);
      return createJsonResponse(returns);
    }

    if (path === '/api/returns' && method === 'POST') {
      const body = getBody();
      const { saleId, productName, typeName, quantity, amount, reason, status, productId, returnType } = body;
      if (!saleId || !productName || !quantity || !amount) {
        return createErrorResponse('Missing required fields', 400);
      }
      
      const rType = returnType || 'inwards';

      // Adjust product stock based on inward vs outward return
      let product: any = null;
      if (productId) {
        product = await db.findProduct(productId);
      } else {
        const sqliteDb = await db.getDb();
        const rows = await sqliteDb.select<any[]>('SELECT * FROM products WHERE name = ? AND userId = ?', [productName, userId]);
        product = rows[0] || null;
      }

      if (product) {
        if (rType === 'outwards') {
          // Return outwards (supplier return) reduces shop inventory stock
          product.shopStock = Math.max(0, (product.shopStock || 0) - Number(quantity));
        } else if (status === 'reinstated') {
          // Return inwards (customer return) reinstates stock back to shop floor
          product.shopStock = (product.shopStock || 0) + Number(quantity);
        }
        await db.saveProduct(product);
      }

      // Update parent sale revenues if inward customer return
      if (rType === 'inwards') {
        const sale = await db.findSaleById(saleId);
        if (sale) {
          const returnVal = Number(amount);
          if (sale.paymentMethod === 'credit') {
            sale.total = Math.max(0, (sale.total || 0) - returnVal);
            if (sale.amountPaid >= sale.total) {
              sale.status = 'paid';
            }
            await db.updateSale(sale);
          } else {
            sale.total = Math.max(0, (sale.total || 0) - returnVal);
            sale.amountPaid = Math.max(0, (sale.amountPaid || 0) - returnVal);
            if (sale.amountPaid >= sale.total) {
              sale.status = 'paid';
            }
            await db.updateSale(sale);
          }
          
          await db.updateSaleItemQuantity(saleId, productId || '', productName, Number(quantity));
        }
      }

      const returnId = `RET-${Math.floor(1000 + Math.random() * 9000)}`;
      const returnEntry = {
        id: returnId,
        userId,
        saleId,
        productName,
        typeName: typeName || null,
        quantity: Number(quantity),
        amount: Number(amount),
        reason,
        status: status || 'reinstated',
        returnType: rType,
        timestamp: body.timestamp || new Date().toISOString()
      };
      await db.saveReturn(returnEntry);
      return createJsonResponse(returnEntry, 201);
    }

    // 9. Debtors
    if (path === '/api/debtors/pay' && method === 'POST') {
      const { saleId, amount } = getBody();
      if (!saleId || amount === undefined || amount <= 0) {
        return createErrorResponse('Missing or invalid fields', 400);
      }
      await db.updateDebtorPayment(saleId, Number(amount));
      return createJsonResponse({ success: true });
    }

    if (path === '/api/debtors/dismiss' && method === 'POST') {
      const { saleId } = getBody();
      if (!saleId) return createErrorResponse('Missing saleId', 400);
      await db.dismissDebtorNotification(saleId);
      return createJsonResponse({ success: true });
    }

    if (path === '/api/returns/dismiss' && method === 'POST') {
      const { returnId } = getBody();
      if (!returnId) return createErrorResponse('Missing returnId', 400);
      await db.dismissReturnNotification(returnId);
      return createJsonResponse({ success: true });
    }

    // 10. Settings reset
    if (path === '/api/settings/reset' && method === 'POST') {
      const { type, email, password } = getBody();
      if (!type || !email || !password) {
        return createErrorResponse('Missing required parameters', 400);
      }
      const user = await db.findUser(email);
      if (!user || user.id !== userId) {
        return createErrorResponse('Invalid user credentials or mismatch', 401);
      }
      const isValidPassword = password === user.passwordHash || (user.passwordHash && user.passwordHash.startsWith('$2a$') && bcrypt.compareSync(password, user.passwordHash));
      if (!isValidPassword) {
        return createErrorResponse('Invalid password', 401);
      }

      if (type === 'reset_keep_products') {
        await db.resetDatabaseKeepingProducts(userId);
      } else if (type === 'wipe_all') {
        await db.wipeAllData();
      } else {
        return createErrorResponse('Invalid reset type', 400);
      }
      return createJsonResponse({ success: true });
    }

    // 11. Printer Settings (Discover printers)
    if (path === '/api/settings/printers' && method === 'GET') {
      const defaultPrinters = [
        { name: "UPshop Thermal Receipt-58", status: "Online", port: "USB001" },
        { name: "UPshop Wireless Printer-80", status: "Online", port: "192.168.8.100" },
        { name: "Microsoft Print to PDF", status: "Online", port: "PORTPROMPT:" }
      ];

      try {
        const stdout = await invoke<string>('list_win_printers');
        if (stdout && stdout.trim() !== '') {
          const parsed = JSON.parse(stdout.trim());
          const printers = Array.isArray(parsed) ? parsed : [parsed];
          const formatted = printers.map((p: any) => ({
            name: p.Name,
            status: p.PrinterStatus === 3 || p.PrinterStatus === 0 ? 'Online' : 'Offline',
            port: p.PortName || ''
          }));
          // Combine and deduplicate
          const combined = [...formatted, ...defaultPrinters.filter(d => !formatted.some(f => f.name === d.name))];
          return createJsonResponse(combined);
        }
      } catch (err) {
        console.warn('Tauri invoke list_win_printers failed, using defaults:', err);
      }

      return createJsonResponse(defaultPrinters);
    }

    // 12. Agents API
    if (path === '/api/agents' && method === 'GET') {
      const agents = await db.getAdminAgents(userId);
      return createJsonResponse(agents);
    }

    if (path === '/api/agents' && method === 'POST') {
      const { username, password, fullName } = getBody();
      if (!username || !password || !fullName) {
        return createErrorResponse('Username, password, and agent name are required', 400);
      }
      const existing = await db.findAgentByUsername(username);
      if (existing) {
        return createErrorResponse('An agent with this username already exists', 400);
      }
      const agentId = safeRandomUUID();
      const agent = {
        id: agentId,
        adminId: userId,
        username,
        passwordHash: password,
        fullName,
        status: 'Active',
        createdAt: new Date().toISOString()
      };
      await db.saveAgent(agent);
      return createJsonResponse(agent, 201);
    }

    if (path === '/api/agents' && method === 'DELETE') {
      const { id } = getBody();
      if (!id) return createErrorResponse('Missing agent id', 400);
      await db.deleteAgent(id);
      return createJsonResponse({ success: true });
    }

    // Developer Accounts Lookup API for Backup
    if (path === '/api/dev/users' && method === 'GET') {
      if (userId !== 'dev-admin') {
        return createErrorResponse('Unauthorized dev access', 403);
      }
      const users = await db.getAllUsers();
      return createJsonResponse(users);
    }

    if (path === '/api/dev/reset-password' && method === 'POST') {
      if (userId !== 'dev-admin') {
        return createErrorResponse('Unauthorized dev access', 403);
      }
      const { targetUserId, newPassword } = getBody();
      if (!targetUserId || !newPassword) {
        return createErrorResponse('Missing targetUserId or newPassword', 400);
      }
      const targetUser = await db.findUserById(targetUserId);
      if (!targetUser) {
        return createErrorResponse('User not found', 404);
      }
      targetUser.passwordHash = newPassword;
      await db.saveUser(targetUser);
      return createJsonResponse({ success: true });
    }

    if (path === '/api/dev/delete-user' && method === 'POST') {
      if (userId !== 'dev-admin') {
        return createErrorResponse('Unauthorized dev access', 403);
      }
      const { targetUserId } = getBody();
      if (!targetUserId) {
        return createErrorResponse('Missing targetUserId', 400);
      }
      const targetUser = await db.findUserById(targetUserId);
      if (!targetUser) {
        return createErrorResponse('User not found', 404);
      }
      await db.deleteUserAndData(targetUserId);
      return createJsonResponse({ success: true });
    }

    return createErrorResponse(`Mock handler not found for ${method} ${path}`, 404);
  } catch (error: any) {
    console.error(`Error in mock handler for ${method} ${path}:`, error);
    return createErrorResponse(error.message || 'Server error', 500);
  }
}

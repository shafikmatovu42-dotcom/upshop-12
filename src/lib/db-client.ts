import Database from '@tauri-apps/plugin-sql';

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

const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

let dbPromise: Promise<Database> | null = null;

export async function getDb(): Promise<Database> {
  if (typeof window === 'undefined') {
    throw new Error('Database client should only be accessed in browser context');
  }
  
  if (!dbPromise) {
    dbPromise = Database.load('sqlite:upshop.db').then(async (db) => {
      // Enable foreign keys if possible (some SQLite versions do this automatically)
      try {
        await db.execute('PRAGMA foreign_keys = ON');
      } catch (e) {
        console.warn('Could not set foreign_keys pragma', e);
      }

      // Initialize tables
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          passwordHash TEXT NOT NULL,
          fullName TEXT,
          businessName TEXT,
          location TEXT,
          photoUrl TEXT,
          currentWeek TEXT DEFAULT 'Week 1',
          revenueTarget REAL DEFAULT 0,
          motto TEXT,
          operationPeriodMode TEXT DEFAULT 'weeks',
          receiptPrintingEnabled INTEGER DEFAULT 1,
          printerName TEXT DEFAULT 'UPshop Thermal Receipt-58',
          printerStatus TEXT DEFAULT 'Online',
          printerIp TEXT DEFAULT '192.168.8.100'
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          price REAL NOT NULL,
          warehouseStock INTEGER DEFAULT 0,
          shopStock INTEGER DEFAULT 0,
          minStockLevel INTEGER DEFAULT 5,
          imageUrl TEXT,
          FOREIGN KEY(userId) REFERENCES users(id)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS movements (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          productName TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          type TEXT NOT NULL,
          destination TEXT NOT NULL,
          week TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          FOREIGN KEY(userId) REFERENCES users(id)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS sales (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          week TEXT NOT NULL,
          total REAL NOT NULL,
          paymentMethod TEXT DEFAULT 'cash',
          customerName TEXT DEFAULT 'Normal Customer',
          status TEXT DEFAULT 'paid',
          dueDate TEXT,
          amountPaid REAL DEFAULT 0,
          dismissed INTEGER DEFAULT 0,
          timestamp TEXT NOT NULL,
          FOREIGN KEY(userId) REFERENCES users(id)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS sale_items (
          id TEXT PRIMARY KEY,
          saleId TEXT NOT NULL,
          productId TEXT NOT NULL,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          quantity INTEGER NOT NULL,
          FOREIGN KEY(saleId) REFERENCES sales(id) ON DELETE CASCADE
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS returns (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          saleId TEXT NOT NULL,
          productName TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          amount REAL NOT NULL,
          reason TEXT,
          status TEXT DEFAULT 'reinstated',
          dismissed INTEGER DEFAULT 0,
          timestamp TEXT NOT NULL,
          FOREIGN KEY(userId) REFERENCES users(id)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          adminId TEXT NOT NULL,
          username TEXT NOT NULL,
          passwordHash TEXT NOT NULL,
          fullName TEXT NOT NULL,
          status TEXT DEFAULT 'Active',
          createdAt TEXT NOT NULL,
          FOREIGN KEY(adminId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS creditors (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          supplierName TEXT NOT NULL,
          supplierContact TEXT,
          productName TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unitType TEXT,
          buyingPrice REAL NOT NULL,
          totalAmount REAL NOT NULL,
          amountPaid REAL DEFAULT 0,
          paymentMode TEXT DEFAULT 'credit',
          paymentDays INTEGER DEFAULT 0,
          dueDate TEXT,
          status TEXT DEFAULT 'unpaid',
          dismissed INTEGER DEFAULT 0,
          timestamp TEXT NOT NULL,
          FOREIGN KEY(userId) REFERENCES users(id)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS partners (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          name TEXT NOT NULL,
          category TEXT,
          contactPerson TEXT,
          phone TEXT,
          email TEXT,
          location TEXT,
          FOREIGN KEY(userId) REFERENCES users(id)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          week TEXT NOT NULL,
          total REAL NOT NULL,
          paymentMethod TEXT DEFAULT 'cash',
          cashSubtype TEXT DEFAULT 'hard_cash',
          cashAmount REAL DEFAULT 0,
          creditAmount REAL DEFAULT 0,
          customerName TEXT DEFAULT 'Normal Customer',
          status TEXT DEFAULT 'pending',
          dueDate TEXT,
          timestamp TEXT NOT NULL,
          items TEXT NOT NULL,
          FOREIGN KEY(userId) REFERENCES users(id)
        )
      `);

      // Dynamic check for any missing columns
      try {
        const userColumns = await db.select<any[]>("PRAGMA table_info(users)");
        const userColumnNames = userColumns.map(c => c.name);
        
        if (!userColumnNames.includes('motto')) {
          await db.execute('ALTER TABLE users ADD COLUMN motto TEXT');
        }
        if (!userColumnNames.includes('operationPeriodMode')) {
          await db.execute('ALTER TABLE users ADD COLUMN operationPeriodMode TEXT DEFAULT \'weeks\'');
        }
        if (!userColumnNames.includes('receiptPrintingEnabled')) {
          await db.execute('ALTER TABLE users ADD COLUMN receiptPrintingEnabled INTEGER DEFAULT 1');
        }
        if (!userColumnNames.includes('printerName')) {
          await db.execute('ALTER TABLE users ADD COLUMN printerName TEXT DEFAULT \'UPshop Thermal Receipt-58\'');
        }
        if (!userColumnNames.includes('printerStatus')) {
          await db.execute('ALTER TABLE users ADD COLUMN printerStatus TEXT DEFAULT \'Online\'');
        }
        if (!userColumnNames.includes('printerIp')) {
          await db.execute('ALTER TABLE users ADD COLUMN printerIp TEXT DEFAULT \'192.168.8.100\'');
        }
        if (!userColumnNames.includes('receiptPaperWidth')) {
          await db.execute('ALTER TABLE users ADD COLUMN receiptPaperWidth TEXT DEFAULT \'58mm\'');
        }

        const returnColumns = await db.select<any[]>("PRAGMA table_info(returns)");
        const returnColumnNames = returnColumns.map(c => c.name);
        if (!returnColumnNames.includes('dismissed')) {
          await db.execute('ALTER TABLE returns ADD COLUMN dismissed INTEGER DEFAULT 0');
        }

        const productColumns = await db.select<any[]>("PRAGMA table_info(products)");
        const productColumnNames = productColumns.map(c => c.name);
        if (!productColumnNames.includes('buyingPrice')) {
          await db.execute('ALTER TABLE products ADD COLUMN buyingPrice REAL DEFAULT 0');
        }
        if (!productColumnNames.includes('expiryDate')) {
          await db.execute('ALTER TABLE products ADD COLUMN expiryDate TEXT');
        }
        if (!productColumnNames.includes('boxBuyingPrice')) {
          await db.execute('ALTER TABLE products ADD COLUMN boxBuyingPrice REAL DEFAULT 0');
        }
        if (!productColumnNames.includes('boxSellingPrice')) {
          await db.execute('ALTER TABLE products ADD COLUMN boxSellingPrice REAL DEFAULT 0');
        }
        if (!productColumnNames.includes('piecesPerBox')) {
          await db.execute('ALTER TABLE products ADD COLUMN piecesPerBox INTEGER DEFAULT 1');
        }
        const movementColumns = await db.select<any[]>("PRAGMA table_info(movements)");
        const movementColumnNames = movementColumns.map(c => c.name);
        if (!movementColumnNames.includes('expiryDate')) {
          await db.execute('ALTER TABLE movements ADD COLUMN expiryDate TEXT');
        }
        if (!movementColumnNames.includes('dismissed')) {
          await db.execute('ALTER TABLE movements ADD COLUMN dismissed INTEGER DEFAULT 0');
        }
      } catch (err) {
        console.error('Error running table info pragma / column additions:', err);
      }

      return db;
    });
  }
  return dbPromise;
}

// LocalStorage helpers for browser-mode fallback
function getLocalStorageItem<T>(key: string, defaultValue: T[] = []): T[] {
  if (typeof window === 'undefined') return defaultValue;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
}

function setLocalStorageItem<T>(key: string, value: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export async function findUser(email: string) {
  if (!isTauri) {
    const users = getLocalStorageItem<any>('upshop_users');
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

export async function findUserById(id: string) {
  if (!isTauri) {
    const users = getLocalStorageItem<any>('upshop_users');
    return users.find(u => u.id === id) || null;
  }
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function findProduct(id: string) {
  if (!isTauri) {
    const products = getLocalStorageItem<any>('upshop_products');
    return products.find(p => p.id === id) || null;
  }
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM products WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function saveUser(user: any) {
  if (!isTauri) {
    const users = getLocalStorageItem<any>('upshop_users');
    const existingIndex = users.findIndex(u => u.id === user.id);
    const updatedUser = {
      ...user,
      receiptPrintingEnabled: user.receiptPrintingEnabled !== undefined ? (user.receiptPrintingEnabled ? 1 : 0) : 1,
      printerName: user.printerName || 'UPshop Thermal Receipt-58',
      printerStatus: user.printerStatus || 'Online',
      printerIp: user.printerIp || '192.168.8.100',
      receiptPaperWidth: user.receiptPaperWidth || '58mm'
    };
    if (existingIndex > -1) {
      users[existingIndex] = { ...users[existingIndex], ...updatedUser };
    } else {
      users.push(updatedUser);
    }
    setLocalStorageItem('upshop_users', users);
    return;
  }
  const db = await getDb();
  const existing = await db.select<any[]>('SELECT id FROM users WHERE id = ?', [user.id]);
  if (existing.length > 0) {
    await db.execute(
      `UPDATE users SET 
        email = ?, passwordHash = ?, fullName = ?, businessName = ?, 
        location = ?, photoUrl = ?, currentWeek = ?, revenueTarget = ?,
        motto = ?, operationPeriodMode = ?, receiptPrintingEnabled = ?,
        printerName = ?, printerStatus = ?, printerIp = ?, receiptPaperWidth = ?
       WHERE id = ?`,
      [
        user.email, user.passwordHash, user.fullName, user.businessName, 
        user.location, user.photoUrl, user.currentWeek, user.revenueTarget, 
        user.motto, user.operationPeriodMode, 
        user.receiptPrintingEnabled !== undefined ? (user.receiptPrintingEnabled ? 1 : 0) : 1, 
        user.printerName || 'UPshop Thermal Receipt-58', user.printerStatus || 'Online', 
        user.printerIp || '192.168.8.100', user.receiptPaperWidth || '58mm', user.id
      ]
    );
  } else {
    await db.execute(
      `INSERT INTO users (id, email, passwordHash, fullName, businessName, location, photoUrl, currentWeek, revenueTarget, motto, operationPeriodMode, receiptPrintingEnabled, printerName, printerStatus, printerIp, receiptPaperWidth) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id, user.email, user.passwordHash, user.fullName, user.businessName, 
        user.location, user.photoUrl, user.currentWeek, user.revenueTarget, 
        user.motto, user.operationPeriodMode, 
        user.receiptPrintingEnabled !== undefined ? (user.receiptPrintingEnabled ? 1 : 0) : 1, 
        user.printerName || 'UPshop Thermal Receipt-58', user.printerStatus || 'Online', 
        user.printerIp || '192.168.8.100', user.receiptPaperWidth || '58mm'
      ]
    );
  }
}

export async function saveProduct(product: any) {
  if (!isTauri) {
    const products = getLocalStorageItem<any>('upshop_products');
    const existingIndex = products.findIndex(p => p.id === product.id);
    if (existingIndex > -1) {
      products[existingIndex] = { ...products[existingIndex], ...product };
    } else {
      products.push(product);
    }
    setLocalStorageItem('upshop_products', products);
    return;
  }
  const db = await getDb();
  const existing = await db.select<any[]>('SELECT id FROM products WHERE id = ?', [product.id]);
  if (existing.length > 0) {
    await db.execute(
      `UPDATE products SET 
        name = ?, category = ?, price = ?, buyingPrice = ?, warehouseStock = ?, shopStock = ?, minStockLevel = ?, imageUrl = ?, expiryDate = ? 
       WHERE id = ?`,
      [product.name, product.category, product.price, product.buyingPrice || 0, product.warehouseStock, product.shopStock, product.minStockLevel, product.imageUrl, product.expiryDate || null, product.id]
    );
  } else {
    await db.execute(
      `INSERT INTO products (id, userId, name, category, price, buyingPrice, warehouseStock, shopStock, minStockLevel, imageUrl, expiryDate) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [product.id, product.userId, product.name, product.category, product.price, product.buyingPrice || 0, product.warehouseStock, product.shopStock, product.minStockLevel, product.imageUrl, product.expiryDate || null]
    );
  }
}

export async function saveCreditor(creditor: any) {
  if (!isTauri) {
    const creditors = getLocalStorageItem<any>('upshop_creditors');
    creditors.push({
      ...creditor,
      dismissed: creditor.dismissed ? 1 : 0
    });
    setLocalStorageItem('upshop_creditors', creditors);
    return;
  }
  const db = await getDb();
  await db.execute(
    `INSERT INTO creditors (id, userId, supplierName, supplierContact, productName, quantity, unitType, buyingPrice, totalAmount, amountPaid, paymentMode, paymentDays, dueDate, status, dismissed, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      creditor.id,
      creditor.userId,
      creditor.supplierName,
      creditor.supplierContact || null,
      creditor.productName,
      creditor.quantity,
      creditor.unitType || 'pieces',
      creditor.buyingPrice,
      creditor.totalAmount,
      creditor.amountPaid || 0,
      creditor.paymentMode || 'credit',
      creditor.paymentDays || 0,
      creditor.dueDate || null,
      creditor.status || 'unpaid',
      creditor.dismissed ? 1 : 0,
      creditor.timestamp
    ]
  );
}

export async function getUserCreditors(userId: string) {
  if (!isTauri) {
    const creditors = getLocalStorageItem<any>('upshop_creditors');
    return creditors
      .filter(c => c.userId === userId)
      .map(c => ({ ...c, dismissed: !!c.dismissed }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM creditors WHERE userId = ? ORDER BY timestamp DESC', [userId]);
  return rows.map(c => ({ ...c, dismissed: !!c.dismissed }));
}

export async function updateCreditorPayment(creditorId: string, amount: number) {
  if (!isTauri) {
    const creditors = getLocalStorageItem<any>('upshop_creditors');
    const idx = creditors.findIndex(c => c.id === creditorId);
    if (idx === -1) throw new Error('Creditor record not found');
    const c = creditors[idx];
    const newPaid = (c.amountPaid || 0) + amount;
    const newStatus = newPaid >= c.totalAmount ? 'settled' : (newPaid > 0 ? 'partially_paid' : 'unpaid');
    creditors[idx] = { ...c, amountPaid: newPaid, status: newStatus };
    setLocalStorageItem('upshop_creditors', creditors);
    return;
  }
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT totalAmount, amountPaid FROM creditors WHERE id = ?', [creditorId]);
  const c = rows[0];
  if (!c) throw new Error('Creditor record not found');
  const newPaid = (c.amountPaid || 0) + amount;
  const newStatus = newPaid >= c.totalAmount ? 'settled' : (newPaid > 0 ? 'partially_paid' : 'unpaid');
  await db.execute('UPDATE creditors SET amountPaid = ?, status = ? WHERE id = ?', [newPaid, newStatus, creditorId]);
}

export async function dismissCreditorNotification(creditorId: string) {
  if (!isTauri) {
    const creditors = getLocalStorageItem<any>('upshop_creditors');
    const idx = creditors.findIndex(c => c.id === creditorId);
    if (idx > -1) {
      creditors[idx].dismissed = 1;
      setLocalStorageItem('upshop_creditors', creditors);
    }
    return;
  }
  const db = await getDb();
  await db.execute('UPDATE creditors SET dismissed = 1 WHERE id = ?', [creditorId]);
}

export async function savePartner(partner: any) {
  if (!isTauri) {
    const partners = getLocalStorageItem<any>('upshop_partners');
    const existingIndex = partners.findIndex(p => p.id === partner.id);
    if (existingIndex > -1) {
      partners[existingIndex] = { ...partners[existingIndex], ...partner };
    } else {
      partners.push(partner);
    }
    setLocalStorageItem('upshop_partners', partners);
    return;
  }
  const db = await getDb();
  const existing = await db.select<any[]>('SELECT id FROM partners WHERE id = ?', [partner.id]);
  if (existing.length > 0) {
    await db.execute(
      'UPDATE partners SET name = ?, category = ?, contactPerson = ?, phone = ?, email = ?, location = ? WHERE id = ?',
      [partner.name, partner.category, partner.contactPerson, partner.phone, partner.email, partner.location, partner.id]
    );
  } else {
    await db.execute(
      'INSERT INTO partners (id, userId, name, category, contactPerson, phone, email, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [partner.id, partner.userId, partner.name, partner.category, partner.contactPerson, partner.phone, partner.email, partner.location]
    );
  }
}

export async function getUserPartners(userId: string) {
  if (!isTauri) {
    const partners = getLocalStorageItem<any>('upshop_partners');
    return partners.filter(p => p.userId === userId || !p.userId);
  }
  const db = await getDb();
  return db.select<any[]>('SELECT * FROM partners WHERE userId = ? OR userId IS NULL', [userId]);
}

export async function deletePartner(partnerId: string) {
  if (!isTauri) {
    const partners = getLocalStorageItem<any>('upshop_partners');
    setLocalStorageItem('upshop_partners', partners.filter(p => p.id !== partnerId));
    return;
  }
  const db = await getDb();
  await db.execute('DELETE FROM partners WHERE id = ?', [partnerId]);
}

export async function saveMovement(movement: any) {
  if (!isTauri) {
    const movements = getLocalStorageItem<any>('upshop_movements');
    movements.push({
      ...movement,
      dismissed: movement.dismissed ? 1 : 0
    });
    setLocalStorageItem('upshop_movements', movements);
    return;
  }
  const db = await getDb();
  await db.execute(
    `INSERT INTO movements (id, userId, productName, quantity, type, destination, week, timestamp, expiryDate, dismissed) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [movement.id, movement.userId, movement.productName, movement.quantity, movement.type, movement.destination, movement.week, movement.timestamp, movement.expiryDate || null, movement.dismissed ? 1 : 0]
  );
}

export async function saveSale(sale: any, items?: any[]) {
  if (!isTauri) {
    const sales = getLocalStorageItem<any>('upshop_sales');
    const sale_items = getLocalStorageItem<any>('upshop_sale_items');
    const newSale = {
      ...sale,
      dismissed: sale.dismissed ? 1 : 0
    };
    sales.push(newSale);
    setLocalStorageItem('upshop_sales', sales);

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemId = safeRandomUUID();
        sale_items.push({
          id: itemId,
          saleId: sale.id,
          productId: item.id,
          name: item.name,
          price: item.customPrice || item.price,
          quantity: item.quantity,
          itemPaymentMode: item.itemPaymentMode || 'inherit',
          sellingUnitType: item.sellingUnitType || 'pieces',
          boxQty: item.boxQty || 0,
          pieceQty: item.pieceQty || 0,
          boxSellingPrice: item.boxSellingPrice || 0
        });
      }
      setLocalStorageItem('upshop_sale_items', sale_items);
    }
    return;
  }
  const db = await getDb();
  await db.execute(
    `INSERT INTO sales (id, userId, week, total, paymentMethod, customerName, status, dueDate, amountPaid, dismissed, timestamp) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sale.id, 
      sale.userId, 
      sale.week, 
      sale.total, 
      sale.paymentMethod || 'cash', 
      sale.customerName || 'Normal Customer', 
      sale.status || 'paid', 
      sale.dueDate || null, 
      sale.amountPaid || 0,
      sale.dismissed ? 1 : 0,
      sale.timestamp
    ]
  );

  if (items && Array.isArray(items)) {
    for (const item of items) {
      const itemId = safeRandomUUID();
      await db.execute(
        `INSERT INTO sale_items (id, saleId, productId, name, price, quantity, itemPaymentMode, sellingUnitType, boxQty, pieceQty, boxSellingPrice) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, sale.id, item.id, item.name, item.customPrice || item.price, item.quantity, item.itemPaymentMode || 'inherit', item.sellingUnitType || 'pieces', item.boxQty || 0, item.pieceQty || 0, item.boxSellingPrice || 0]
      );
    }
  }
}

export async function getUserProducts(userId: string) {
  if (!isTauri) {
    const products = getLocalStorageItem<any>('upshop_products');
    return products.filter(p => p.userId === userId);
  }
  const db = await getDb();
  return db.select<any[]>('SELECT * FROM products WHERE userId = ?', [userId]);
}

export async function dismissExpiredStock(productId: string, qtyToDismiss: number, lossAmount: number) {
  if (!isTauri) {
    const products = getLocalStorageItem<any>('upshop_products');
    const idx = products.findIndex(p => p.id === productId);
    if (idx > -1) {
      const p = products[idx];
      const newShopStock = Math.max(0, (p.shopStock || 0) - qtyToDismiss);
      products[idx] = {
        ...p,
        shopStock: newShopStock,
        expiryDismissed: 1
      };
      setLocalStorageItem('upshop_products', products);

      // Record movement loss
      const movements = getLocalStorageItem<any>('upshop_movements');
      movements.push({
        id: safeRandomUUID(),
        userId: p.userId,
        productName: p.name,
        quantity: qtyToDismiss,
        type: 'expiry_loss',
        destination: 'Internal Loss',
        totalAmount: lossAmount,
        week: 'Active',
        timestamp: new Date().toISOString()
      });
      setLocalStorageItem('upshop_movements', movements);
    }
    return;
  }
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM products WHERE id = ?', [productId]);
  const p = rows[0];
  if (p) {
    const newShopStock = Math.max(0, (p.shopStock || 0) - qtyToDismiss);
    await db.execute('UPDATE products SET shopStock = ?, expiryDismissed = 1 WHERE id = ?', [newShopStock, productId]);
    await db.execute(
      `INSERT INTO movements (id, userId, productName, quantity, type, destination, week, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [safeRandomUUID(), p.userId, p.name, qtyToDismiss, 'expiry_loss', 'Internal Loss', 'Active', new Date().toISOString()]
    );
  }
}

export async function dismissExpiredBatch(movementId: string, productId: string, qtyToDismiss: number, lossAmount: number) {
  if (!isTauri) {
    const movements = getLocalStorageItem<any>('upshop_movements');
    const mIdx = movements.findIndex(m => m.id === movementId);
    let prodName = '';
    if (mIdx > -1) {
      movements[mIdx].dismissed = 1;
      prodName = movements[mIdx].productName;
      setLocalStorageItem('upshop_movements', movements);
    }
    const products = getLocalStorageItem<any>('upshop_products');
    const pIdx = products.findIndex(p => p.id === productId || (prodName && p.name?.toLowerCase() === prodName.toLowerCase()));
    if (pIdx > -1) {
      const p = products[pIdx];
      const newShopStock = Math.max(0, (p.shopStock || 0) - qtyToDismiss);
      products[pIdx] = { ...p, shopStock: newShopStock };
      setLocalStorageItem('upshop_products', products);

      // Record movement loss
      movements.push({
        id: safeRandomUUID(),
        userId: p.userId,
        productName: p.name,
        quantity: qtyToDismiss,
        type: 'expiry_loss',
        destination: 'Internal Loss',
        totalAmount: lossAmount,
        week: 'Active',
        timestamp: new Date().toISOString()
      });
      setLocalStorageItem('upshop_movements', movements);
    }
    return;
  }
  const db = await getDb();
  await db.execute('UPDATE movements SET dismissed = 1 WHERE id = ?', [movementId]);
  if (productId) {
    const rows = await db.select<any[]>('SELECT * FROM products WHERE id = ?', [productId]);
    const p = rows[0];
    if (p) {
      const newShopStock = Math.max(0, (p.shopStock || 0) - qtyToDismiss);
      await db.execute('UPDATE products SET shopStock = ? WHERE id = ?', [newShopStock, productId]);
      await db.execute(
        `INSERT INTO movements (id, userId, productName, quantity, type, destination, week, timestamp) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [safeRandomUUID(), p.userId, p.name, qtyToDismiss, 'expiry_loss', 'Internal Loss', 'Active', new Date().toISOString()]
      );
    }
  }
}

export async function ignoreExpiryAlert(productId: string) {
  if (!isTauri) {
    const products = getLocalStorageItem<any>('upshop_products');
    const idx = products.findIndex(p => p.id === productId);
    if (idx > -1) {
      products[idx].expiryIgnored = 1;
      setLocalStorageItem('upshop_products', products);
    }
    return;
  }
  const db = await getDb();
  await db.execute('UPDATE products SET expiryIgnored = 1 WHERE id = ?', [productId]);
}

export async function getUserMovements(userId: string) {
  if (!isTauri) {
    const movements = getLocalStorageItem<any>('upshop_movements');
    return movements
      .filter(m => m.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  const db = await getDb();
  return db.select<any[]>('SELECT * FROM movements WHERE userId = ? ORDER BY timestamp DESC', [userId]);
}

export async function getUserSales(userId: string) {
  if (!isTauri) {
    const sales = getLocalStorageItem<any>('upshop_sales');
    const sale_items = getLocalStorageItem<any>('upshop_sale_items');
    const userSales = sales
      .filter(s => s.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    for (const sale of userSales) {
      if (!sale.items || sale.items.length === 0) {
        sale.items = sale_items.filter(si => si.saleId === sale.id && si.quantity > 0);
      }
      sale.dismissed = !!sale.dismissed;
    }
    return userSales;
  }
  const db = await getDb();
  const sales = await db.select<any[]>('SELECT * FROM sales WHERE userId = ? ORDER BY timestamp DESC', [userId]);
  
  for (const sale of sales) {
    sale.items = await db.select<any[]>('SELECT * FROM sale_items WHERE saleId = ? AND quantity > 0', [sale.id]);
    sale.dismissed = !!sale.dismissed;
  }
  return sales;
}

export async function saveOrder(order: any) {
  const itemsJson = typeof order.items === 'string' ? order.items : JSON.stringify(order.items || []);
  if (!isTauri) {
    const orders = getLocalStorageItem<any>('upshop_orders');
    orders.push({
      ...order,
      items: order.items || []
    });
    setLocalStorageItem('upshop_orders', orders);
    return;
  }
  const db = await getDb();
  await db.execute(
    `INSERT INTO orders (id, userId, week, total, paymentMethod, cashSubtype, cashAmount, creditAmount, customerName, status, dueDate, timestamp, items) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      order.id,
      order.userId,
      order.week,
      order.total,
      order.paymentMethod || 'cash',
      order.cashSubtype || 'hard_cash',
      order.cashAmount || 0,
      order.creditAmount || 0,
      order.customerName || 'Normal Customer',
      order.status || 'pending',
      order.dueDate || null,
      order.timestamp,
      itemsJson
    ]
  );
}

export async function getUserOrders(userId: string) {
  if (!isTauri) {
    const orders = getLocalStorageItem<any>('upshop_orders');
    return orders
      .filter(o => o.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM orders WHERE userId = ? ORDER BY timestamp DESC', [userId]);
  return rows.map(o => {
    let parsedItems = [];
    try {
      parsedItems = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
    } catch (e) {
      parsedItems = [];
    }
    return {
      ...o,
      items: parsedItems
    };
  });
}

export async function updateOrderStatus(orderId: string, status: string) {
  if (!isTauri) {
    const orders = getLocalStorageItem<any>('upshop_orders');
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx > -1) {
      orders[idx].status = status;
      setLocalStorageItem('upshop_orders', orders);
    }
    return;
  }
  const db = await getDb();
  await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
}

export async function updateDebtorPayment(saleId: string, amount: number) {
  const validAmount = Math.abs(amount || 0);
  if (!isTauri) {
    const sales = getLocalStorageItem<any>('upshop_sales');
    const saleIndex = sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) throw new Error('Sale not found');
    
    const sale = sales[saleIndex];
    const newAmountPaid = Math.min(sale.total || 0, (sale.amountPaid || 0) + validAmount);
    const newStatus = newAmountPaid >= (sale.total || 0) ? 'paid' : 'unpaid';
    
    sales[saleIndex] = {
      ...sale,
      amountPaid: newAmountPaid,
      status: newStatus
    };
    setLocalStorageItem('upshop_sales', sales);
    return;
  }
  const db = await getDb();
  const sales = await db.select<any[]>('SELECT total, amountPaid FROM sales WHERE id = ?', [saleId]);
  const sale = sales[0];
  if (!sale) throw new Error('Sale not found');
  
  const newAmountPaid = Math.min(sale.total || 0, (sale.amountPaid || 0) + validAmount);
  const newStatus = newAmountPaid >= (sale.total || 0) ? 'paid' : 'unpaid';
  
  await db.execute(
    'UPDATE sales SET amountPaid = ?, status = ? WHERE id = ?',
    [newAmountPaid, newStatus, saleId]
  );
}

export async function dismissDebtorNotification(saleId: string) {
  if (!isTauri) {
    const sales = getLocalStorageItem<any>('upshop_sales');
    const saleIndex = sales.findIndex(s => s.id === saleId);
    if (saleIndex > -1) {
      sales[saleIndex].dismissed = 1;
      setLocalStorageItem('upshop_sales', sales);
    }
    return;
  }
  const db = await getDb();
  await db.execute('UPDATE sales SET dismissed = 1 WHERE id = ?', [saleId]);
}

export async function saveReturn(returnEntry: any) {
  if (!isTauri) {
    const returns = getLocalStorageItem<any>('upshop_returns');
    const newReturn = {
      ...returnEntry,
      dismissed: returnEntry.dismissed ? 1 : 0
    };
    returns.push(newReturn);
    setLocalStorageItem('upshop_returns', returns);
    return;
  }
  const db = await getDb();
  await db.execute(
    `INSERT INTO returns (id, userId, saleId, productName, quantity, amount, reason, status, dismissed, timestamp) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      returnEntry.id,
      returnEntry.userId,
      returnEntry.saleId,
      returnEntry.productName,
      returnEntry.quantity,
      returnEntry.amount,
      returnEntry.reason || null,
      returnEntry.status || 'reinstated',
      returnEntry.dismissed ? 1 : 0,
      returnEntry.timestamp
    ]
  );
}

export async function getUserReturns(userId: string) {
  if (!isTauri) {
    const returns = getLocalStorageItem<any>('upshop_returns');
    return returns
      .filter(r => r.userId === userId)
      .map(r => ({ ...r, dismissed: !!r.dismissed }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  const db = await getDb();
  const returns = await db.select<any[]>('SELECT * FROM returns WHERE userId = ? ORDER BY timestamp DESC', [userId]);
  return returns.map(r => ({ ...r, dismissed: !!r.dismissed }));
}

export async function dismissReturnNotification(returnId: string) {
  if (!isTauri) {
    const returns = getLocalStorageItem<any>('upshop_returns');
    const idx = returns.findIndex(r => r.id === returnId);
    if (idx > -1) {
      returns[idx].dismissed = 1;
      setLocalStorageItem('upshop_returns', returns);
    }
    return;
  }
  const db = await getDb();
  await db.execute('UPDATE returns SET dismissed = 1 WHERE id = ?', [returnId]);
}

export async function resetDatabaseKeepingProducts(userId: string) {
  if (!isTauri) {
    const returns = getLocalStorageItem<any>('upshop_returns') || [];
    const sales = getLocalStorageItem<any>('upshop_sales') || [];
    const sale_items = getLocalStorageItem<any>('upshop_sale_items') || [];
    const movements = getLocalStorageItem<any>('upshop_movements') || [];
    
    // Find all user sales
    const userSales = sales.filter((s: any) => s.userId === userId);
    
    // Unpaid debtors sales
    const unpaidDebtors = userSales.filter((s: any) => s.paymentMethod === 'credit' && s.status === 'unpaid');
    
    // Sort all user sales by timestamp descending
    const sortedUserSales = [...userSales].sort((a: any, b: any) => {
      return new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime();
    });
    
    // Last 200 transactions
    const last200 = sortedUserSales.slice(0, 200);
    
    // Combine both: keptSalesIds
    const keptSalesMap = new Map();
    unpaidDebtors.forEach((s: any) => keptSalesMap.set(s.id, s));
    last200.forEach((s: any) => keptSalesMap.set(s.id, s));
    const keptSalesIds = Array.from(keptSalesMap.keys());
    
    // Filter sales to keep only non-user sales OR user sales that are kept
    const remainingSales = sales.filter((s: any) => s.userId !== userId || keptSalesMap.has(s.id));
    
    // Filter sale_items to keep only items for the remainingSales
    const remainingSalesIds = remainingSales.map((s: any) => s.id);
    const remainingSaleItems = sale_items.filter((si: any) => remainingSalesIds.includes(si.saleId));
    
    // Filter returns: keep if it's not the user's OR it's linked to a remaining sales ID
    const remainingReturns = returns.filter((r: any) => r.userId !== userId || remainingSalesIds.includes(r.saleId));
    
    // Delete all user movements
    const remainingMovements = movements.filter((m: any) => m.userId !== userId);

    setLocalStorageItem('upshop_returns', remainingReturns);
    setLocalStorageItem('upshop_sales', remainingSales);
    setLocalStorageItem('upshop_sale_items', remainingSaleItems);
    setLocalStorageItem('upshop_movements', remainingMovements);
    return;
  }
  const db = await getDb();
  const keptSales = await db.select<any[]>(
    `SELECT id FROM sales WHERE userId = ? AND paymentMethod = 'credit' AND status = 'unpaid'
     UNION
     SELECT id FROM (SELECT id FROM sales WHERE userId = ? ORDER BY timestamp DESC LIMIT 200)`,
    [userId, userId]
  );
  const keptIds = keptSales.map(s => s.id);

  if (keptIds.length === 0) {
    await db.execute('DELETE FROM returns WHERE userId = ?', [userId]);
    await db.execute('DELETE FROM sale_items WHERE saleId IN (SELECT id FROM sales WHERE userId = ?)', [userId]);
    await db.execute('DELETE FROM sales WHERE userId = ?', [userId]);
  } else {
    const placeholders = keptIds.map(() => '?').join(',');
    await db.execute(`DELETE FROM returns WHERE userId = ? AND saleId NOT IN (${placeholders})`, [userId, ...keptIds]);
    await db.execute(`DELETE FROM sale_items WHERE saleId IN (SELECT id FROM sales WHERE userId = ?) AND saleId NOT IN (${placeholders})`, [userId, ...keptIds]);
    await db.execute(`DELETE FROM sales WHERE userId = ? AND id NOT IN (${placeholders})`, [userId, ...keptIds]);
  }
  await db.execute('DELETE FROM movements WHERE userId = ?', [userId]);
}

export async function wipeAllData() {
  if (!isTauri) {
    setLocalStorageItem('upshop_returns', []);
    setLocalStorageItem('upshop_sale_items', []);
    setLocalStorageItem('upshop_sales', []);
    setLocalStorageItem('upshop_movements', []);
    setLocalStorageItem('upshop_products', []);
    setLocalStorageItem('upshop_users', []);
    return;
  }
  const db = await getDb();
  await db.execute('DELETE FROM returns');
  await db.execute('DELETE FROM sale_items');
  await db.execute('DELETE FROM sales');
  await db.execute('DELETE FROM movements');
  await db.execute('DELETE FROM products');
  await db.execute('DELETE FROM users');
}

export async function deleteUserAndData(userId: string) {
  if (!isTauri) {
    const users = getLocalStorageItem<any>('upshop_users');
    const mainUser = users.find(u => u.id === userId);
    // Find all linked agent user IDs
    const linkedAgentIds = users
      .filter(u => u.adminId === userId || (mainUser && u.businessName === mainUser.businessName && u.role === 'agent'))
      .map(u => u.id);
    
    const allUserIdsToDelete = [userId, ...linkedAgentIds];

    setLocalStorageItem('upshop_users', users.filter(u => !allUserIdsToDelete.includes(u.id)));

    const products = getLocalStorageItem<any>('upshop_products');
    setLocalStorageItem('upshop_products', products.filter(p => !allUserIdsToDelete.includes(p.userId)));

    const movements = getLocalStorageItem<any>('upshop_movements');
    setLocalStorageItem('upshop_movements', movements.filter(m => !allUserIdsToDelete.includes(m.userId)));

    const sales = getLocalStorageItem<any>('upshop_sales');
    const userSales = sales.filter(s => allUserIdsToDelete.includes(s.userId));
    const userSaleIds = userSales.map(s => s.id);
    setLocalStorageItem('upshop_sales', sales.filter(s => !allUserIdsToDelete.includes(s.userId)));

    const sale_items = getLocalStorageItem<any>('upshop_sale_items');
    setLocalStorageItem('upshop_sale_items', sale_items.filter(si => !userSaleIds.includes(si.saleId)));

    const returns = getLocalStorageItem<any>('upshop_returns');
    setLocalStorageItem('upshop_returns', returns.filter(r => !allUserIdsToDelete.includes(r.userId)));

    const creditors = getLocalStorageItem<any>('upshop_creditors');
    setLocalStorageItem('upshop_creditors', creditors.filter(c => !allUserIdsToDelete.includes(c.userId)));
    return;
  }
  const db = await getDb();
  await db.execute('DELETE FROM creditors WHERE userId = ? OR userId IN (SELECT id FROM users WHERE adminId = ?)', [userId, userId]);
  await db.execute('DELETE FROM returns WHERE userId = ? OR userId IN (SELECT id FROM users WHERE adminId = ?)', [userId, userId]);
  await db.execute('DELETE FROM sale_items WHERE saleId IN (SELECT id FROM sales WHERE userId = ? OR userId IN (SELECT id FROM users WHERE adminId = ?))', [userId, userId]);
  await db.execute('DELETE FROM sales WHERE userId = ? OR userId IN (SELECT id FROM users WHERE adminId = ?)', [userId, userId]);
  await db.execute('DELETE FROM movements WHERE userId = ? OR userId IN (SELECT id FROM users WHERE adminId = ?)', [userId, userId]);
  await db.execute('DELETE FROM products WHERE userId = ? OR userId IN (SELECT id FROM users WHERE adminId = ?)', [userId, userId]);
  await db.execute('DELETE FROM users WHERE id = ? OR adminId = ?', [userId, userId]);
}

export async function getAllUsers() {
  if (!isTauri) {
    return getLocalStorageItem<any>('upshop_users');
  }
  const db = await getDb();
  return db.select<any[]>('SELECT * FROM users');
}

export async function findSaleById(id: string) {
  if (!isTauri) {
    const sales = getLocalStorageItem<any>('upshop_sales');
    const sale = sales.find(s => s.id === id) || null;
    if (sale) {
      const sale_items = getLocalStorageItem<any>('upshop_sale_items');
      sale.items = sale_items.filter(si => si.saleId === sale.id && si.quantity > 0);
    }
    return sale;
  }
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM sales WHERE id = ?', [id]);
  const sale = rows[0] || null;
  if (sale) {
    sale.items = await db.select<any[]>('SELECT * FROM sale_items WHERE saleId = ? AND quantity > 0', [sale.id]);
    sale.dismissed = !!sale.dismissed;
  }
  return sale;
}

export async function updateSale(sale: any) {
  if (!isTauri) {
    const sales = getLocalStorageItem<any>('upshop_sales');
    const idx = sales.findIndex(s => s.id === sale.id);
    if (idx > -1) {
      sales[idx] = { ...sales[idx], ...sale, dismissed: sale.dismissed ? 1 : 0 };
      setLocalStorageItem('upshop_sales', sales);
    }
    return;
  }
  const db = await getDb();
  await db.execute(
    `UPDATE sales SET 
      total = ?, 
      amountPaid = ?, 
      status = ?, 
      dismissed = ? 
     WHERE id = ?`,
    [
      sale.total,
      sale.amountPaid,
      sale.status,
      sale.dismissed ? 1 : 0,
      sale.id
    ]
  );
}

export async function updateSaleItemQuantity(saleId: string, productId: string, productName: string, returnedQty: number) {
  if (!isTauri) {
    const sale_items = getLocalStorageItem<any>('upshop_sale_items');
    const item = sale_items.find(si => si.saleId === saleId && (si.productId === productId || si.name === productName));
    if (item) {
      item.quantity = Math.max(0, item.quantity - returnedQty);
      setLocalStorageItem('upshop_sale_items', sale_items);
    }
    return;
  }
  const db = await getDb();
  let rows = await db.select<any[]>('SELECT id, quantity FROM sale_items WHERE saleId = ? AND productId = ?', [saleId, productId]);
  if (rows.length === 0) {
    rows = await db.select<any[]>('SELECT id, quantity FROM sale_items WHERE saleId = ? AND name = ?', [saleId, productName]);
  }
  const item = rows[0];
  if (item) {
    const newQty = Math.max(0, item.quantity - returnedQty);
    await db.execute('UPDATE sale_items SET quantity = ? WHERE id = ?', [newQty, item.id]);
  }
}

export async function saveAgent(agent: any) {
  if (!isTauri) {
    const agents = getLocalStorageItem<any>('upshop_agents');
    const idx = agents.findIndex(a => a.id === agent.id);
    if (idx > -1) {
      agents[idx] = { ...agents[idx], ...agent };
    } else {
      agents.push(agent);
    }
    setLocalStorageItem('upshop_agents', agents);
    return;
  }
  const db = await getDb();
  const existing = await db.select<any[]>('SELECT id FROM agents WHERE id = ?', [agent.id]);
  if (existing.length > 0) {
    await db.execute(
      'UPDATE agents SET username = ?, passwordHash = ?, fullName = ?, status = ? WHERE id = ?',
      [agent.username, agent.passwordHash, agent.fullName, agent.status || 'Active', agent.id]
    );
  } else {
    await db.execute(
      'INSERT INTO agents (id, adminId, username, passwordHash, fullName, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [agent.id, agent.adminId, agent.username, agent.passwordHash, agent.fullName, agent.status || 'Active', agent.createdAt]
    );
  }
}

export async function getAdminAgents(adminId: string) {
  if (!isTauri) {
    const agents = getLocalStorageItem<any>('upshop_agents');
    return agents.filter(a => a.adminId === adminId);
  }
  const db = await getDb();
  return db.select<any[]>('SELECT * FROM agents WHERE adminId = ? ORDER BY createdAt DESC', [adminId]);
}

export async function findAgentByUsername(username: string) {
  if (!isTauri) {
    const agents = getLocalStorageItem<any>('upshop_agents');
    return agents.find(a => a.username.toLowerCase() === username.toLowerCase()) || null;
  }
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM agents WHERE LOWER(username) = LOWER(?)', [username]);
  return rows[0] || null;
}

export async function findAgentById(id: string) {
  if (!isTauri) {
    const agents = getLocalStorageItem<any>('upshop_agents');
    return agents.find(a => a.id === id) || null;
  }
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM agents WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function deleteAgent(agentId: string) {
  if (!isTauri) {
    const agents = getLocalStorageItem<any>('upshop_agents');
    setLocalStorageItem('upshop_agents', agents.filter(a => a.id !== agentId));
    return;
  }
  const db = await getDb();
  await db.execute('DELETE FROM agents WHERE id = ?', [agentId]);
}

export async function deleteProduct(productId: string) {
  if (!isTauri) {
    const products = getLocalStorageItem<any>('upshop_products');
    setLocalStorageItem('upshop_products', products.filter(p => p.id !== productId));
    return;
  }
  const db = await getDb();
  await db.execute('DELETE FROM products WHERE id = ?', [productId]);
}



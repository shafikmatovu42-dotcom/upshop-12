import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

const dbFilePath = path.join(process.cwd(), 'data', 'upshop.sqlite');
let dbPromise: Promise<Database> | null = null;

export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    const dbDir = path.dirname(dbFilePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    dbPromise = open({
      filename: dbFilePath,
      driver: sqlite3.Database
    }).then(async (db) => {
      // Enable foreign keys
      await db.run('PRAGMA foreign_keys = ON');

      // Initialize tables
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          passwordHash TEXT NOT NULL,
          fullName TEXT,
          businessName TEXT,
          location TEXT,
          photoUrl TEXT,
          currentWeek TEXT DEFAULT 'Week 1',
          revenueTarget REAL DEFAULT 0
        );

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
        );

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
        );

        CREATE TABLE IF NOT EXISTS sales (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          week TEXT NOT NULL,
          total REAL NOT NULL,
          paymentMethod TEXT DEFAULT 'cash', -- 'cash' | 'credit'
          customerName TEXT DEFAULT 'Normal Customer',
          status TEXT DEFAULT 'paid', -- 'paid' | 'unpaid'
          dueDate TEXT, -- ISO timestamp or date
          amountPaid REAL DEFAULT 0,
          dismissed INTEGER DEFAULT 0, -- 0 = false, 1 = true
          timestamp TEXT NOT NULL,
          FOREIGN KEY(userId) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS sale_items (
          id TEXT PRIMARY KEY,
          saleId TEXT NOT NULL,
          productId TEXT NOT NULL,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          quantity INTEGER NOT NULL,
          FOREIGN KEY(saleId) REFERENCES sales(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS returns (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          saleId TEXT NOT NULL,
          productName TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          amount REAL NOT NULL,
          reason TEXT,
          status TEXT DEFAULT 'reinstated',
          timestamp TEXT NOT NULL,
          FOREIGN KEY(userId) REFERENCES users(id)
        );
      `);

      // Upgrade schema dynamically
      const userColumns = await db.all("PRAGMA table_info(users)");
      const userColumnNames = userColumns.map(c => c.name);
      if (!userColumnNames.includes('motto')) {
        await db.run('ALTER TABLE users ADD COLUMN motto TEXT');
      }
      if (!userColumnNames.includes('operationPeriodMode')) {
        await db.run('ALTER TABLE users ADD COLUMN operationPeriodMode TEXT DEFAULT \'weeks\'');
      }
      if (!userColumnNames.includes('receiptPrintingEnabled')) {
        await db.run('ALTER TABLE users ADD COLUMN receiptPrintingEnabled INTEGER DEFAULT 1');
      }
      if (!userColumnNames.includes('printerName')) {
        await db.run('ALTER TABLE users ADD COLUMN printerName TEXT DEFAULT \'UPshop Thermal Receipt-58\'');
      }
      if (!userColumnNames.includes('printerStatus')) {
        await db.run('ALTER TABLE users ADD COLUMN printerStatus TEXT DEFAULT \'Online\'');
      }
      if (!userColumnNames.includes('printerIp')) {
        await db.run('ALTER TABLE users ADD COLUMN printerIp TEXT DEFAULT \'192.168.8.100\'');
      }
      if (!userColumnNames.includes('receiptPaperWidth')) {
        await db.run('ALTER TABLE users ADD COLUMN receiptPaperWidth TEXT DEFAULT \'58mm\'');
      }

      // Auto migration from old db.json
      await migrateFromJson(db);

      return db;
    });
  }
  return dbPromise;
}

async function migrateFromJson(sqliteDb: Database) {
  const jsonDbPath = path.join(process.cwd(), 'data', 'db.json');
  if (fs.existsSync(jsonDbPath)) {
    try {
      const userCount = await sqliteDb.get('SELECT COUNT(*) as count FROM users');
      if (userCount && userCount.count === 0) {
        console.log('Migrating data from db.json to SQLite...');
        const rawData = fs.readFileSync(jsonDbPath, 'utf-8');
        const data = JSON.parse(rawData);

        // Migrate users
        if (data.users && Array.isArray(data.users)) {
          for (const u of data.users) {
            await sqliteDb.run(
              `INSERT OR IGNORE INTO users (id, email, passwordHash, fullName, businessName, location, photoUrl, currentWeek, revenueTarget) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [u.id, u.email, u.passwordHash, u.fullName, u.businessName, u.location, u.photoUrl, u.currentWeek || 'Week 1', u.revenueTarget || 0]
            );
          }
        }

        // Migrate products
        if (data.products && Array.isArray(data.products)) {
          for (const p of data.products) {
            await sqliteDb.run(
              `INSERT OR IGNORE INTO products (id, userId, name, category, price, warehouseStock, shopStock, minStockLevel, imageUrl) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [p.id, p.userId, p.name, p.category, p.price, p.warehouseStock, p.shopStock, p.minStockLevel, p.imageUrl]
            );
          }
        }

        // Migrate movements
        if (data.movements && Array.isArray(data.movements)) {
          for (const m of data.movements) {
            await sqliteDb.run(
              `INSERT OR IGNORE INTO movements (id, userId, productName, quantity, type, destination, week, timestamp) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [m.id, m.userId, m.productName, m.quantity, m.type, m.destination, m.week, m.timestamp]
            );
          }
        }

        // Migrate sales
        if (data.sales && Array.isArray(data.sales)) {
          for (const s of data.sales) {
            await sqliteDb.run(
              `INSERT OR IGNORE INTO sales (id, userId, week, total, paymentMethod, customerName, status, dueDate, amountPaid, dismissed, timestamp) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [s.id, s.userId, s.week, s.total, 'cash', 'Normal Customer', 'paid', s.timestamp, s.total, 0, s.timestamp]
            );
          }
        }
        console.log('Migration to SQLite completed successfully!');
      }
    } catch (e) {
      console.error('Error migrating JSON data to SQLite:', e);
    }
  }
}

export async function findUser(email: string) {
  const db = await getDb();
  return db.get('SELECT * FROM users WHERE email = ?', [email]);
}

export async function findUserById(id: string) {
  const db = await getDb();
  return db.get('SELECT * FROM users WHERE id = ?', [id]);
}

export async function findProduct(id: string) {
  const db = await getDb();
  return db.get('SELECT * FROM products WHERE id = ?', [id]);
}

export async function saveUser(user: any) {
  const db = await getDb();
  const existing = await db.get('SELECT id FROM users WHERE id = ?', [user.id]);
  if (existing) {
    await db.run(
      `UPDATE users SET 
        email = ?, passwordHash = ?, fullName = ?, businessName = ?, 
        location = ?, photoUrl = ?, currentWeek = ?, revenueTarget = ?,
        motto = ?, operationPeriodMode = ?, receiptPrintingEnabled = ?,
        printerName = ?, printerStatus = ?, printerIp = ?, receiptPaperWidth = ?
       WHERE id = ?`,
      [user.email, user.passwordHash, user.fullName, user.businessName, user.location, user.photoUrl, user.currentWeek, user.revenueTarget, user.motto, user.operationPeriodMode, user.receiptPrintingEnabled !== undefined ? user.receiptPrintingEnabled : 1, user.printerName || 'UPshop Thermal Receipt-58', user.printerStatus || 'Online', user.printerIp || '192.168.8.100', user.receiptPaperWidth || '58mm', user.id]
    );
  } else {
    await db.run(
      `INSERT INTO users (id, email, passwordHash, fullName, businessName, location, photoUrl, currentWeek, revenueTarget, motto, operationPeriodMode, receiptPrintingEnabled, printerName, printerStatus, printerIp, receiptPaperWidth) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.email, user.passwordHash, user.fullName, user.businessName, user.location, user.photoUrl, user.currentWeek, user.revenueTarget, user.motto, user.operationPeriodMode, user.receiptPrintingEnabled !== undefined ? user.receiptPrintingEnabled : 1, user.printerName || 'UPshop Thermal Receipt-58', user.printerStatus || 'Online', user.printerIp || '192.168.8.100', user.receiptPaperWidth || '58mm']
    );
  }
}

export async function saveProduct(product: any) {
  const db = await getDb();
  const existing = await db.get('SELECT id FROM products WHERE id = ?', [product.id]);
  if (existing) {
    await db.run(
      `UPDATE products SET 
        name = ?, category = ?, price = ?, warehouseStock = ?, shopStock = ?, minStockLevel = ?, imageUrl = ? 
       WHERE id = ?`,
      [product.name, product.category, product.price, product.warehouseStock, product.shopStock, product.minStockLevel, product.imageUrl, product.id]
    );
  } else {
    await db.run(
      `INSERT INTO products (id, userId, name, category, price, warehouseStock, shopStock, minStockLevel, imageUrl) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [product.id, product.userId, product.name, product.category, product.price, product.warehouseStock, product.shopStock, product.minStockLevel, product.imageUrl]
    );
  }
}

export async function saveMovement(movement: any) {
  const db = await getDb();
  await db.run(
    `INSERT INTO movements (id, userId, productName, quantity, type, destination, week, timestamp) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [movement.id, movement.userId, movement.productName, movement.quantity, movement.type, movement.destination, movement.week, movement.timestamp]
  );
}

export async function saveSale(sale: any, items?: any[]) {
  const db = await getDb();
  await db.run(
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
      sale.dismissed || 0,
      sale.timestamp
    ]
  );

  if (items && Array.isArray(items)) {
    for (const item of items) {
      const itemId = require('crypto').randomUUID();
      await db.run(
        `INSERT INTO sale_items (id, saleId, productId, name, price, quantity) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [itemId, sale.id, item.id, item.name, item.customPrice || item.price, item.quantity]
      );
    }
  }
}

export async function getUserProducts(userId: string) {
  const db = await getDb();
  return db.all('SELECT * FROM products WHERE userId = ?', [userId]);
}

export async function getUserMovements(userId: string) {
  const db = await getDb();
  return db.all('SELECT * FROM movements WHERE userId = ? ORDER BY timestamp DESC', [userId]);
}

export async function getUserSales(userId: string) {
  const db = await getDb();
  const sales = await db.all('SELECT * FROM sales WHERE userId = ? ORDER BY timestamp DESC', [userId]);
  
  for (const sale of sales) {
    sale.items = await db.all('SELECT * FROM sale_items WHERE saleId = ?', [sale.id]);
    sale.dismissed = !!sale.dismissed;
  }
  return sales;
}

export async function updateDebtorPayment(saleId: string, amount: number) {
  const validAmount = Math.abs(amount || 0);
  const db = await getDb();
  const sale = await db.get('SELECT total, amountPaid FROM sales WHERE id = ?', [saleId]);
  if (!sale) throw new Error('Sale not found');
  
  const newAmountPaid = Math.min(sale.total || 0, (sale.amountPaid || 0) + validAmount);
  const newStatus = newAmountPaid >= (sale.total || 0) ? 'paid' : 'unpaid';
  
  await db.run(
    'UPDATE sales SET amountPaid = ?, status = ? WHERE id = ?',
    [newAmountPaid, newStatus, saleId]
  );
}

export async function dismissDebtorNotification(saleId: string) {
  const db = await getDb();
  await db.run('UPDATE sales SET dismissed = 1 WHERE id = ?', [saleId]);
}

export async function saveReturn(returnEntry: any) {
  const db = await getDb();
  await db.run(
    `INSERT INTO returns (id, userId, saleId, productName, quantity, amount, reason, status, timestamp) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      returnEntry.id,
      returnEntry.userId,
      returnEntry.saleId,
      returnEntry.productName,
      returnEntry.quantity,
      returnEntry.amount,
      returnEntry.reason || null,
      returnEntry.status || 'reinstated',
      returnEntry.timestamp
    ]
  );
}

export async function getUserReturns(userId: string) {
  const db = await getDb();
  return db.all('SELECT * FROM returns WHERE userId = ? ORDER BY timestamp DESC', [userId]);
}

export async function resetDatabaseKeepingProducts(userId: string) {
  const db = await getDb();
  const keptSales = await db.all(
    `SELECT id FROM sales WHERE userId = ? AND paymentMethod = 'credit' AND status = 'unpaid'
     UNION
     SELECT id FROM (SELECT id FROM sales WHERE userId = ? ORDER BY timestamp DESC LIMIT 200)`,
    [userId, userId]
  );
  const keptIds = keptSales.map((s: any) => s.id);

  if (keptIds.length === 0) {
    await db.run('DELETE FROM returns WHERE userId = ?', [userId]);
    await db.run('DELETE FROM sale_items WHERE saleId IN (SELECT id FROM sales WHERE userId = ?)', [userId]);
    await db.run('DELETE FROM sales WHERE userId = ?', [userId]);
  } else {
    const placeholders = keptIds.map(() => '?').join(',');
    await db.run(`DELETE FROM returns WHERE userId = ? AND saleId NOT IN (${placeholders})`, [userId, ...keptIds]);
    await db.run(`DELETE FROM sale_items WHERE saleId IN (SELECT id FROM sales WHERE userId = ?) AND saleId NOT IN (${placeholders})`, [userId, ...keptIds]);
    await db.run(`DELETE FROM sales WHERE userId = ? AND id NOT IN (${placeholders})`, [userId, ...keptIds]);
  }
  await db.run('DELETE FROM movements WHERE userId = ?', [userId]);
}

export async function wipeAllData() {
  const db = await getDb();
  await db.run('DELETE FROM returns');
  await db.run('DELETE FROM sale_items');
  await db.run('DELETE FROM sales');
  await db.run('DELETE FROM movements');
  await db.run('DELETE FROM products');
  await db.run('DELETE FROM users');
}

export async function deleteProduct(productId: string) {
  const db = await getDb();
  await db.run('DELETE FROM products WHERE id = ?', [productId]);
}


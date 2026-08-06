
import { StockItem, CreditSale, SaleRecord, ReturnRecord } from './types';

export const mockInventory: StockItem[] = [
  { id: '1', name: 'Ultra Wireless Mouse', category: 'Electronics', warehouseStock: 150, shopStock: 45, minStockLevel: 50, price: 29.99, lastUpdated: '2023-10-20' },
  { id: '2', name: 'Ergo Mechanical Keyboard', category: 'Electronics', warehouseStock: 80, shopStock: 12, minStockLevel: 15, price: 89.99, lastUpdated: '2023-10-21' },
  { id: '3', name: 'Premium USB-C Hub', category: 'Accessories', warehouseStock: 200, shopStock: 60, minStockLevel: 40, price: 49.99, lastUpdated: '2023-10-18' },
  { id: '4', name: 'Noise-Canceling Headphones', category: 'Electronics', warehouseStock: 40, shopStock: 5, minStockLevel: 10, price: 199.99, lastUpdated: '2023-10-22' },
  { id: '5', name: 'Standing Desk Converter', category: 'Furniture', warehouseStock: 15, shopStock: 3, minStockLevel: 5, price: 149.99, lastUpdated: '2023-10-15' },
];

export const mockCreditSales: CreditSale[] = [
  { id: 'CS-001', customerName: 'Apex Solutions', totalAmount: 1250.00, paidAmount: 500.00, status: 'partially_paid', dueDate: '2023-11-15' },
  { id: 'CS-002', customerName: 'Zenith Tech', totalAmount: 3200.00, paidAmount: 0, status: 'pending', dueDate: '2023-11-20' },
  { id: 'CS-003', customerName: 'Local High School', totalAmount: 850.00, paidAmount: 850.00, status: 'paid', dueDate: '2023-10-25' },
];

export const weeklySalesData = [
  { day: 'Mon', cash: 1200, credit: 400 },
  { day: 'Tue', cash: 1500, credit: 300 },
  { day: 'Wed', cash: 900, credit: 800 },
  { day: 'Thu', cash: 1800, credit: 200 },
  { day: 'Fri', cash: 2200, credit: 500 },
  { day: 'Sat', cash: 2800, credit: 100 },
  { day: 'Sun', cash: 1600, credit: 0 },
];

export const frequentProductsData = [
  { name: 'Wireless Mouse', sales: 124 },
  { name: 'USB-C Cable', sales: 98 },
  { name: 'HDMI Adapter', sales: 86 },
  { name: 'AA Batteries', sales: 74 },
  { name: 'Webcam Pro', sales: 52 },
];

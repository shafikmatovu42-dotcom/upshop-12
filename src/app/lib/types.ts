
export type StockItem = {
  id: string;
  name: string;
  category: string;
  warehouseStock: number;
  shopStock: number;
  minStockLevel: number;
  price: number;
  lastUpdated: string;
};

export type CreditSale = {
  id: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  status: 'pending' | 'partially_paid' | 'paid';
  dueDate: string;
};

export type SaleRecord = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  total: number;
  paymentMethod: 'cash' | 'credit';
  timestamp: string;
};

export type ReturnRecord = {
  id: string;
  saleId: string;
  productName: string;
  reason: string;
  status: 'pending' | 'reinstated' | 'damaged';
  timestamp: string;
};

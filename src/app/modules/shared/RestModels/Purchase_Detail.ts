export interface Purchase_Detail {
  id: number;
  item_id: number;
  description: string | null;
  qty: number;
  serial_number: string | null;
  unitary_price: number;
  status: 'ACTIVE' | 'DELETED';
  stock_status: 'PENDING' | 'ADDED_TO_STOCK';
  total: number;
  created: Date;
  updated: Date;
  purchase_id: number;
}



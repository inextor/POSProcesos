export interface Item_Exception {
  id: number;
  created: Date;
  description: string;
  item_id: number;
  list_as_exception: 'YES' | 'NO';
  order_type: 'ALL' | 'TOGO' | 'IN_PLACE' | 'PICK_UP' | 'QUICK_SALE';
  stock_item_id: number | null;
  stock_qty: number;
  updated: Date;
}



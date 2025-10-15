export interface Ingredient {
  created_by_user_id: number;
  created: Date;
  id: number;
  item_id: number;
  name: any;
  order_type: 'ALL' | 'TOGO' | 'IN_PLACE' | 'PICK_UP' | 'QUICK_SALE';
  qty: number;
  stock_item_id: number;
  updated_by_user_id: number;
  updated: Date;
}



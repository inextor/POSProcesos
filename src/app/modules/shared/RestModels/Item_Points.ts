export interface Item_Points {
  id: number;
  created_by_user_id: number;
  created: Date;
  item_id: number;
  qty: number;
  type: 'AMOUNT' | 'PERCENT';
  updated_by_user_id: number;
  updated: Date;
}



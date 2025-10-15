export interface Cart_Item {
  id: number;
  created: Date;
  item_id: number;
  qty: number;
  session_id: string | null;
  type: 'IN_CART' | 'BUY_LATER';
  updated: Date;
  user_id: number | null;
}



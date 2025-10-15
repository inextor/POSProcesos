export interface Merma {
  id: number;
  batch: string | null;
  store_id: number;
  item_id: number;
  qty: number;
  created: Date;
  created_by_user_id: number;
  updated: Date;
  box_id: number | null;
  shipping_id: number | null;
  note: string | null;
  price: number;
}



export interface Stocktake_Item_Batch {
  id: number;
  stocktake_item_id: number;
  batch: string | null;
  expiration_date: string | null;
  db_qty: number;
  real_qty: number;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  created: Date;
  updated: Date;
}

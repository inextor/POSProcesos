export interface Stocktake_Item {
  id: number;
  stocktake_id: number;
  box_id: number | null;
  box_content_id: number | null;
  pallet_id: number | null;
  item_id: number;
  db_qty: number;
  real_qty: number;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  created: Date;
  updated: Date;
}



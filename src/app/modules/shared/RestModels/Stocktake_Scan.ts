export interface Stocktake_Scan {
  id: number;
  stocktake_id: number;
  pallet_id: number | null;
  box_id: number | null;
  box_content_id: number | null;
  item_id: number | null;
  qty: number;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  created: Date;
  updated: Date;
}



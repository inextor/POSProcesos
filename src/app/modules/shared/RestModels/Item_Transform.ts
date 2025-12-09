export interface Item_Transform {
  id: number;
  from_item_id: number | null;
  to_item_id: number;
  multiplier: number;
  created: Date | null;
  updated: Date;
}

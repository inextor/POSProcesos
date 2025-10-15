export interface Stock_Record {
  id: number;
  created_by_user_id: number;
  created: Date;
  description: string | null;
  is_current: any | null;
  item_id: number;
  movement_qty: number;
  movement_type: 'POSITIVE' | 'NEGATIVE' | 'ADJUSTMENT';
  order_item_id: number | null;
  previous_qty: number;
  production_item_id: number | null;
  purchase_detail_id: number | null;
  qty: number;
  serial_number_record_id: number | null;
  shipping_item_id: number | null;
  store_id: number;
  updated_by_user_id: number;
  updated: Date;
}



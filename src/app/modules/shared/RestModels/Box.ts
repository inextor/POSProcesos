export interface Box {
  id: number;
  status: 'ACTIVE' | 'DELETED';
  production_item_id: number | null;
  type_item_id: number;
  serial_number_range_start: number | null;
  serial_number_range_end: number | null;
  store_id: number | null;
  created: Date;
  updated: Date;
}



export interface Table {
  attended_by_user_id: number | null;
  capacity: number;
  clean_status: 'CLEAN' | 'NEED_CLEANING';
  created_by_user_id: number | null;
  created: Date | null;
  id: number;
  is_dirty: 'NO' | 'YES';
  name: string;
  order_id: number | null;
  ordered_status: 'PENDING' | 'ORDERED';
  status: 'ACTIVE' | 'DELETED';
  store_id: number;
  updated_by_user_id: number | null;
  updated: Date;
}



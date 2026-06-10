export interface Consignment_Delivered {
  id: number;
  seller_user_id: number | null;
  store_id: number;
  total: number;
  status: 'ACTIVE' | 'SETTLED' | 'DELETED';
  closed_timestamp: Date | null;
  created: Date;
  updated: Date;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
}

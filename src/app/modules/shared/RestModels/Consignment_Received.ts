export interface Consignment_Received {
  id: number;
  provider_user_id: number | null;
  store_id: number;
  reference: string | null;
  total: number;
  stock_status: 'PENDING' | 'ADDED_TO_STOCK' | 'DELETED';
  status: 'ACTIVE' | 'SETTLED' | 'DELETED';
  closed_timestamp: Date | null;
  created: Date;
  updated: Date;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
}

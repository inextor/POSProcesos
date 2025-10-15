export interface Purchase {
  id: number;
  created_by_user_id: number | null;
  created: Date;
  order_id: number | null;
  provider_name: string | null;
  provider_user_id: number | null;
  status: 'ACTIVE' | 'DELETED';
  stock_status: 'PENDING' | 'ADDED_TO_STOCK' | 'SHIPPING_CREATED';
  store_id: number;
  total: number;
  updated_by_user_id: number | null;
  updated: Date;
  amount_paid: number;
  paid_timestamp: Date | null;
}



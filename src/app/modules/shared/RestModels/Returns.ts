export interface Returns {
  amount_paid: number;
  cashier_user_id: number;
  client_user_id: number | null;
  code: string;
  currency_id: string;
  created: Date;
  id: number;
  note: string | null;
  order_id: number;
  store_id: number;
  total: number;
  type: 'RETURN_COUPON' | 'RETURN_MONEY';
  updated: Date;
}



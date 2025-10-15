export interface Store_Sale_Report {
  amount_description: string;
  ares_order_ids: string;
  average_order_amount: number;
  created_by_user_id: number;
  created: Date;
  date: string | null;
  discounts: number;
  end_timestamp: Date;
  expense_payments: number;
  id: number;
  income_payments: number;
  localtime_end: string | Date;
  localtime_start: string | Date;
  order_count: number;
  order_ids: string;
  start_timestamp: Date;
  store_consecutive: number;
  store_id: number;
  total_sales: number;
  updated_by_user_id: number;
  updated: Date;
}



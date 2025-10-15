export interface Fund {
  id: number;
  amount: number;
  cashier_hour: string | Date;
  created_by_user_id: number;
  created: Date;
  currency_id: string;
  store_id: number | null;
  updated: Date;
}



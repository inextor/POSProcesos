export interface Withdrawal {
  id: number;
  amount: number;
  created_by_user_id: number;
  updated_by_user_id: number | null;
  created: Date;
  currency: string;
  currency_id: string | null;
  device_time: string | Date;
  note: string;
  store_id: number | null;
  transfer_id: number | null;
  updated: Date;
}

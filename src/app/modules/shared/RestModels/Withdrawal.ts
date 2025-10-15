export interface Withdrawal {
  id: number;
  amount: number;
  created_by_user_id: number;
  created: Date;
  currency: string;
  device_time: string | Date;
  note: string;
  updated: Date;
}



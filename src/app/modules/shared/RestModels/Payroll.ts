export interface Payroll {
  created_by_user_id: number;
  created: Date;
  end_date: string;
  id: number;
  paid_status: 'PENDING' | 'PAID';
  paid_timestamp: Date | null;
  start_date: string;
  status: 'ACTIVE' | 'DELETED';
  store_id: number;
  subtotal: number;
  total: number;
  updated_by_user_id: number;
  updated: Date;
  user_id: number;
}



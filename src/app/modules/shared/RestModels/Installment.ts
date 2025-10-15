export interface Installment {
  id: number;
  amount: number;
  created: Date;
  created_by_user_id: number;
  due_date: string;
  installment_number: any;
  order_id: number;
  paid_amount: number;
  paid_timestamp: Date | null;
  status: 'ACTIVE' | 'DELETED';
  updated: Date;
  updated_by_user_id: number;
}



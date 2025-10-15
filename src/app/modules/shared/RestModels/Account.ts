export interface Account {
  id: number;
  status: 'DELETED' | 'ACTIVE';
  balance: number;
  created: Date;
  created_by_user_id: number;
  currency_id: string;
  is_main: any | null;
  updated: Date;
  updated_by_user_id: number;
  user_id: number;
}



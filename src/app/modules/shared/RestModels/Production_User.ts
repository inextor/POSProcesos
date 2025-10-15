export interface Production_User {
  id: number;
  production_id: number;
  user_id: number;
  price: number;
  currency_id: string;
  created: Date;
  updated: Date;
  created_by_user_id: number;
  updated_by_user_id: number;
  total: number | null;
}



export interface Ecommerce_User {
  id: number;
  ecommerce_id: number;
  user_id: number;
  created: Date;
  type: 'ECOMMERCE_ADMIN' | 'ROLE_ADMIN' | 'ROLE_USER';
  updated: Date;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
}



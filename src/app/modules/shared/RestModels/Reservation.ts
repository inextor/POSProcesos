export interface Reservation {
  id: number;
  address_id: number | null;
  client_name: string;
  created: Date;
  created_by_user_id: number;
  condition: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  currency_id: string;
  note: string | null;
  price_type_id: number;
  start: string;
  status: 'ACTIVE' | 'DELETED';
  store_id: number;
  updated: Date;
  updated_by_user_id: number;
  user_id: number | null;
}



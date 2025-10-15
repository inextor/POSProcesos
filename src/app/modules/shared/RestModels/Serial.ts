export interface Serial {
  additional_data: string | null;
  created_by_user_id: number | null;
  created: Date;
  description: string | null;
  last_order_id: number | null;
  last_reservation_id: number | null;
  id: number;
  available_status: 'AVAILABLE' | 'RESERVED' | 'MAINTENANCE';
  item_id: number;
  serial_number: string;
  status: 'ACTIVE' | 'INACTIVE';
  store_id: number;
  updated_by_user_id: number | null;
  updated: Date;
}



export interface Printer {
  id: number;
  created_by_user_id: number;
  created: Date;
  description: number;
  device: string | null;
  ip_address: string | null;
  name: string;
  port: number | null;
  protocol: string;
  serial_number: string;
  store_id: number | null;
  updated_by_user_id: number;
  updated: Date;
}



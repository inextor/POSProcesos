export interface Printer {
  id: number;
  created_by_user_id: number;
  created: Date;
  description: number;
  device: string | null;
  ip_address: string | null;
  model: string | null;
  name: string;
  font_a_columns: number | null;
  font_b_columns: number | null;
  port: number | null;
  protocol: string;
  serial_number: string;
  store_id: number | null;
  updated_by_user_id: number;
  updated: Date;
  vendor_id: string | null;
  product_id: string | null;
  interface_number: number | null;
  codepage_mapping: string | null;
  paper_width: number | null;
  ticket_id: number | null;
}

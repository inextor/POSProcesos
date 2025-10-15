export interface Ledger_Detail {
  id: number;
  ledger_id: number;
  item_id: number;
  description: string | null;
  qty: number;
  unitary_price: number;
  line_total: number;
  created: Date;
  created_by_user_id: number;
  updated: Date;
  updated_by_user_id: number;
}



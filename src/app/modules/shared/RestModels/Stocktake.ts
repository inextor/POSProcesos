export interface Stocktake {
  id: number;
  stock_adjustment: 'DIFFERENCE' | 'EXACT_QTY';
  store_id: number;
  name: string | null;
  status: 'ACTIVE' | 'CLOSED';
  created: Date;
  updated: Date;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
}



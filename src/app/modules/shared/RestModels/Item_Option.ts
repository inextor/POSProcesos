export interface Item_Option {
  id: number;
  item_id: number;
  name: string;
  included_options: number | null;
  max_options: number | null;
  min_selections: number;
  min_options: number;
  included_extra_qty: number;
  max_extra_qty: number | null;
  status: 'ACTIVE' | 'DELETED';
}



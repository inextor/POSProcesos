export interface Price_Log {
  created_by_user_id: number;
  created: Date;
  id: number;
  item_id: number;
  new_percent: number;
  new_price: number;
  old_percent: number;
  old_price: number;
  old_tax_included: 'YES' | 'NO';
  price_list_id: number;
  price_type_id: number;
  tax_included: 'NO' | 'YES';
  updated: Date;
}



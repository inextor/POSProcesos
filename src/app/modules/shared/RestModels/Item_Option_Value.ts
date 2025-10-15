export interface Item_Option_Value {
  id: number;
  item_id: number;
  item_option_id: number | null;
  max_extra_qty: number;
  extra_price: number;
  charge_type: 'OPTIONAL' | 'INCLUDED' | 'EXTRA_CHARGE';
  price: number;
  portion_amount: number;
  status: 'ACTIVE' | 'DELETED';
}



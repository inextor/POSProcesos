export interface Quote_Item {
  id: number;
  created: Date;
  discount_percent: number;
  discount: number;
  ieps_calculated: number;
  ieps_type: 'RATE' | 'AMOUNT';
  ieps_value: number;
  item_id: number;
  original_unitary_price: number;
  provider_price: number;
  qty: number;
  quote_id: number;
  status: 'ACTIVE' | 'DELETED';
  subtotal: number;
  tax_included: 'YES' | 'NO';
  tax: number;
  total: number;
  unitary_price: number;
  updated: Date;
}



export interface Price_Type {
  id: number;
  installments: number;
  model: 'AMOUNT' | 'PERCENT' | 'ALL' | 'Amount, Set a price as is, PERCENT the price must be update based on the reference price, A value of 20 the unitary price must be reference price*1.20';
  created: Date;
  json_tags: any | null;
  name: string;
  show_bill_code: 'YES' | 'NO';
  sort_priority: number;
  tax_model: 'TAX_INCLUDED' | 'PLUS_TAX' | 'ALL';
  type: 'RETAIL' | 'WHOLESALE';
  wholesale_min_qty: number;
  wholesale_type: 'BY_ARTICLE' | 'BY_CATEGORY' | 'BY_TAG';
  pv_bar_background_color: string;
  pv_bar_text_color: string;
  pv_bar_total_color: string;
  status: 'ACTIVE' | 'DELETED';
  updated: Date;
}



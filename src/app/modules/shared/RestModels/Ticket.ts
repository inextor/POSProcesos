export interface Ticket {
  id: number;
  created: Date;
  created_by_user_id: number;
  exceptions_display: 'NEVER' | 'ONLY_IF_PRESENT';
  footer: string | null;
  header: string | null;
  item_money_sign_display: 'NEVER' | 'ALWAYS' | 'ONLY_IF_HAS_PRICE';
  item_name_display: 'TRUNCATED' | 'FULL';
  item_note_display: 'NEVER' | 'ALWAYS';
  item_price_display: 'NEVER' | 'ONLY_IF_HAS_PRICE' | 'ALWAYS';
  item_qty1_display: 'NEVER' | 'ALWAYS' | 'ONLY_IF_HAS_PRICE';
  item_qty2_display: 'NEVER' | 'ALWAYS' | 'ONLY_IF_HAS_PRICE';
  item_qty_times_price_display: 'NEVER' | 'ONLY_IF_HAS_PRICE' | 'ALWAYS';
  item_subtotal_display: 'NEVER' | 'ONLY_IF_HAS_PRICE' | 'ALWAYS';
  item_total_display: 'ALWAYS' | 'ONLY_IF_HAS_PRICE';
  name: string;
  option_item_display: 'NEVER' | 'ALWAYS' | 'ONLY_IF_HAS_PRICE';
  option_price_display: 'NEVER' | 'ONLY_IF_HAS_PRICE' | 'ALWAYS';
  option_qty_by_item: 'NEVER' | 'ALWAYS' | 'ONLY_IF_HAS_PRICE';
  option_row_display: 'NEVER' | 'ONLY_IF_HAS_PRICE' | 'ALWAYS';
  option_total_qty: 'NEVER' | 'ONLY_IF_HAS_PRICE' | 'ALWAYS';
  option_total_qty_times_price: 'NEVER' | 'ONLY_IF_HAS_PRICE' | 'ALWAYS';
  order_note_display: 'ALWAYS' | 'NEVER';
  updated: Date;
  updated_by_user_id: number;
}



export interface Offer {
  id: number;
  category_id: number | null;
  coupon_code: string | null;
  created_by_user_id: number;
  created: Date;
  description: string | null;
  discount: number;
  gift_item_id: number | null;
  hour_end: any;
  hour_start: any;
  image_id: number | null;
  is_cumulative: 'NO' | 'YES';
  is_valid_friday: any;
  is_valid_monday: any;
  is_valid_saturday: any;
  is_valid_sunday: any;
  is_valid_thursday: any;
  is_valid_tuesday: any;
  is_valid_wednesday: any;
  item_id: number | null;
  m: number | null;
  n: number | null;
  name: string;
  status: 'ACTIVE' | 'DELETED';
  store_id: number | null;
  tag: string | null;
  type: 'PERCENT_DISCOUNT' | 'N_X_M' | 'AMOUNT_DISCOUNT' | 'GIFT' | 'FIXED_PRICE';
  updated_by_user_id: number;
  updated: Date;
  valid_from: string | Date;
  valid_thru: string | Date;
  qty: number;
  price_type_id: number | null;
  price: number;
}



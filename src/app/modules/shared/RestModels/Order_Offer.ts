export interface Order_Offer {
  id: number;
  amount: number;
  coupon_code: string;
  order_id: number;
  offer_id: number | null;
  created_by_user_id: number;
  updated_by_user_id: number;
  created: Date;
  updated: Date;
}



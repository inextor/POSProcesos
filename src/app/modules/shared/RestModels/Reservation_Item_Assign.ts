export interface Reservation_Item_Assign {
  id: number;
  created_by_user_id: number;
  created: Date;
  reservation_item_id: number;
  type: 'DELIVERY' | 'COLLECT';
  updated_by_user_id: number;
  updated: Date;
  user_id: number;
}



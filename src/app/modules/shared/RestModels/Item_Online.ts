export interface Item_Online {
  id: number;
  created_by_user_id: number;
  created: string | Date;
  item_id: number;
  store_id: number;
  preference: 'SHOW' | 'HIDE';
  updated_by_user_id: number;
  updated: string | Date;
}

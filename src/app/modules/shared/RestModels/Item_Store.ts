export interface Item_Store {
  id: number;
  created_by_user_id: number;
  created: Date;
  is_available_online: any;
  item_id: number;
  store_id: number;
  pos_preference: 'SHOW' | 'HIDE' | 'DEFAULT';
  updated_by_user_id: number;
  updated: Date;
}



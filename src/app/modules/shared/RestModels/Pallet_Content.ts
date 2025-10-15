export interface Pallet_Content {
  id: number;
  pallet_id: number;
  box_id: number;
  status: 'ACTIVE' | 'REMOVED';
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  created: Date;
  updated: Date;
}



export interface Production_Area_Item {
  id: number;
  production_area_id: number;
  item_id: number;
  status: 'ACTIVE' | 'DELETED';
  created: Date;
  updated: Date;
}



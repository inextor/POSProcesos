export interface Production_Area {
  id: number;
  name: string;
  store_id: number;
  created: Date;
  status: 'ACTIVE' | 'DELETED';
  updated: Date;
}



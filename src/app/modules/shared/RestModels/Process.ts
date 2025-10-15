export interface Process {
  id: number;
  category_id: number | null;
  production_area_id: number;
  name: string;
  item_id: number | null;
  json_tags: any | null;
  generator_type: 'ON_DEMAN' | 'SALE_ITEM' | 'SALE_CATEGORY' | 'SALE_JSON_TAG';
  status: 'ACTIVE' | 'DELETED';
  created: Date;
  updated: Date;
}



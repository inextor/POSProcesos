export interface Item_Recipe {
  id: number;
  item_id: number;
  parent_item_id: number;
  portion_qty: number;
  print_on_recipe: 'NO' | 'YES';
  created: Date;
  updated: Date;
}



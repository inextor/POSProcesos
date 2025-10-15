export interface Task {
  id: number;
  category_id: number | null;
  counter: number;
  created: Date;
  process_id: number;
  description: string;
  order_id: number | null;
  item_id: number | null;
  qty: number;
  over_extend_qty: number;
  requisition_id: number | null;
  is_done: any;
  main_task_id: number | null;
  in_charge_user_id: number | null;
  parent_task_id: number | null;
  process_status_id: number | null;
  production_area_id: number;
  status: 'ACTIVE' | 'DELETED';
  updated: Date;
}



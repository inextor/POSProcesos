export interface Requisition_Item {
  aproved_status: 'NOT_APPROVED' | 'APPROVED';
  created: Date;
  id: number;
  item_id: number;
  qty: number;
  requisition_id: number;
  status: 'ACTIVE' | 'DELETED';
  updated: Date;
}



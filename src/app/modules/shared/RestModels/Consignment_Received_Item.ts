export interface Consignment_Received_Item {
  id: number;
  consignment_received_id: number;
  item_id: number;
  qty: number;
  settled_qty: number;
  returned_qty: number;
  unitary_cost: number;
  total: number;
  created: Date;
  updated: Date;
}

export interface Consignment_Delivered_Item {
  id: number;
  consignment_delivered_id: number;
  item_id: number;
  qty: number;
  sold_qty: number;
  returned_qty: number;
  unitary_price: number;
  total: number;
  created: Date;
  updated: Date;
}

export interface Order_Item_Batch{
	id:number;
	order_item_id:number;
	batch:string | null;
	expiration_date:string | null;
	qty:number;
	created:Date;
	updated:Date;
}

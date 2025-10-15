export interface Batch_Record{
	movement_type:'POSITIVE'|'NEGATIVE'|'ADJUSTMENT';
	batch:string;
	created:Date;
	created_by_user_id:number;
	description:string | null;
	expiration_date:string | null;
	id:number;
	is_current:number | null;
	item_id:number;
	movement_qty:number;
	order_item_id:number | null;
	previous_qty:number;
	production_item_id:number | null;
	purchase_detail_id:number | null;
	qty:number;
	shipping_item_id:number | null;
	stock_record_id:number | null;
	store_id:number;
	updated:Date;
	updated_by_user_id:number;
}

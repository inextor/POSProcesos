export interface Order_Item_Batch {
	id: number;
	order_item_id: number;
	item_exception_id?: number | null;
	item_id?: number | null;
	batch: string | null;
	expiration_date: string | null;
	qty: number;
	created: Date;
	updated: Date;
}

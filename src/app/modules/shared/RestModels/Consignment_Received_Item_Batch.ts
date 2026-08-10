export interface Consignment_Received_Item_Batch {
	id: number;
	consignment_received_item_id: number;
	batch: string;
	expiration_date: string | null;
	qty: number;
	created: Date;
	created_by_user_id: number;
	updated: Date;
	updated_by_user_id: number;
}

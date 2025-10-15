export interface Shipping{
	created:Date;
	created_by_user_id:number | null;
	date:string | null;
	delivery_timestamp: Date | null;
	from_store_id:number | null;
	id:number;
	note:string | null;
	purchase_id:number | null;
	received_by_user_id:number | null;
	requisition_id:number | null;
	shipping_company:string;
	shipping_guide:string;
	status:'PENDING'|'DELIVERED'|'SENT'|'CANCELLED';
	to_store_id:number | null;
	updated:Date;
	updated_by_user_id:number | null;
}

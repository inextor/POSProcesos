export interface Requisition{
	approved_status: 'PENDING'|'NOT_APPROVED'|'APPROVED';
	created:Date;
	created_by_user_id:number | null;
	date:string | null;
	id:number;
	requested_to_store_id:number | null;
	required_by_store_id:number
	required_by_timestamp: string | null;
	status:'PENDING'|'CANCELLED'|'NOT_APPROVED'|'SHIPPED'|'CLOSED'|'APPROVED';
	updated:Date;
	updated_by_user_id:number | null;
}

export interface Production{
	alternate_qty: number;
	control: string | null;
	created:Date;
	created_by_user_id:number
	id:number;
	item_id:number
	merma_qty:number;
	merma_reason:string | null;
	produced: string;
	produced_by_user_id: number | null;
	production_area_id: number | null;
	qty:number
	qty_reported:number;
	store_id:number;
	status:'ACTIVE'|'DELETED';
	updated:Date;
	verified_by_user_id:number | null;
}

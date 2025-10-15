export interface Consumption {
	id: number;
	item_id: number;
	price: number;
	qty: number;
	production_area_id: number | null;
	consumed_by_user_id: number | null;
	store_id: number;
	description: string | null;
	status: 'ACTIVE' | 'DELETED';
	created: Date;
	created_by_user_id: number;
	updated: Date;
	updated_by_user_id: number;
}

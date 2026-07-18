export interface Commission_Rule {
	id: number;
	base_percent: number;
	discount_reduction_per_percent: number;
	price_type_id: number | null;
	status: string;
	store_id: number | null;
	item_id: number | null;
	category_id: number | null;
	created_by_user_id: number;
	created: Date;
	updated_by_user_id: number;
	updated: Date;
}

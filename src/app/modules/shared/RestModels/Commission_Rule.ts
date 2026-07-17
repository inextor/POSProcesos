export interface Commission_Rule {
	id: number;
	base_percent: number;
	discount_reduction_per_percent: number;
	price_type_id: number;
	status: string;
	store_id: number;
	created_by_user_id: number;
	created: Date;
	updated_by_user_id: number;
	updated: Date;
}

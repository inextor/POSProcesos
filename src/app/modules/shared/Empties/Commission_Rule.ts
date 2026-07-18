import { Commission_Rule } from '../RestModels';

export function commission_rule(): Commission_Rule {
	return {
		id: 0,
		base_percent: 0,
		discount_reduction_per_percent: 0,
		price_type_id: null,
		status: 'ACTIVE',
		store_id: null,
		item_id: null,
		category_id: null,
		created_by_user_id: 0,
		created: new Date(),
		updated_by_user_id: 0,
		updated: new Date()
	};
}

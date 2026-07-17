import { Commission_Rule } from '../RestModels';

export function commission_rule(): Commission_Rule {
	return {
		id: 0,
		base_percent: 0,
		discount_reduction_per_percent: 0,
		price_type_id: 0,
		status: 'ACTIVE',
		store_id: 0,
		created_by_user_id: 0,
		created: new Date(),
		updated_by_user_id: 0,
		updated: new Date()
	};
}

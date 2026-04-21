import { Storage_Type } from '../RestModels';

export function storage_type(): Storage_Type {
	return {
		created: new Date(),
		created_by_user_id: 0,
		id: 0,
		name: '',
		sort_weight: 0,
		updated: new Date(),
		updated_by_user_id: 0
	};
}

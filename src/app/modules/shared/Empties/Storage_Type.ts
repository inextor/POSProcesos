import { Storage_Type } from '../RestModels';

export function storage_type(): Storage_Type {
	return {
		id: 0,
		created_by_user_id: 0,
		created: new Date(),
		name: '',
		sort_weight: 0,
		updated_by_user_id: 0,
		updated: new Date(),
	};
}
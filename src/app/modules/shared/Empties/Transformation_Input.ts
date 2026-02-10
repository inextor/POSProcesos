import { Transformation_Input } from '../RestModels';

export function transformation_input(): Transformation_Input {
	return {
		id: 0,
		transformation_id: 0,
		item_id: 0,
		quantity: 1,
		created: new Date(),
		updated: new Date(),
		created_by_user_id: null,
		updated_by_user_id: null
	};
}

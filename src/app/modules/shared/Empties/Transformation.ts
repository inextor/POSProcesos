import { Transformation } from '../RestModels';

export function transformation(): Transformation {
	return {
		id: 0,
		name: '',
		note: null,
		reference: null,
		provider_user_id: null,
		status: 'ACTIVE',
		created: new Date(),
		updated: new Date(),
		created_by_user_id: null,
		updated_by_user_id: null
	};
}

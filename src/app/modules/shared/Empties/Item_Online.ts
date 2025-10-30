import { Item_Online } from '../RestModels';

export function item_online(): Item_Online {
	return {
		id: 0,
		created_by_user_id: 0,
		created: new Date(),
		item_id: 0,
		store_id: 0,
		preference: 'SHOW',
		updated_by_user_id: 0,
		updated: new Date(),
	};
}

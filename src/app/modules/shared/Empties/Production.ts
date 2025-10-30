import { Production } from '../RestModels';

export function production(): Production {
	return {
		control: '',
		alternate_qty: 0,
		created: new Date(),
		created_by_user_id: 0,
		id: 0,
		item_id: 0,
		merma_qty: 0,
		merma_reason: '',
		produced: '',
		produced_by_user_id: null,
		production_area_id: 0,
		qty: 0,
		qty_reported: 0,
		store_id: 0,
		status: 'ACTIVE',
		updated: new Date(),
		verified_by_user_id: null,
	};
}

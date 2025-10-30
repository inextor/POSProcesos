import { Production_Area } from '../RestModels';

export function production_area(): Production_Area {
	return {
		created: new Date(),
		id: 0,
		store_id: 0,
		name: '',
		status: 'ACTIVE',
		updated: new Date(),
	};
}

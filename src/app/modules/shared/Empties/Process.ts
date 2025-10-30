import { Process } from '../RestModels';

export function process(): Process {
	return {
		category_id: null,
		created: new Date(),
		generator_type: "ON_DEMAN",
		id: 0,
		item_id: null,
		json_tags: undefined,
		name: '',
		production_area_id: 0,
		status: 'ACTIVE',
		updated: new Date(),
	};
}

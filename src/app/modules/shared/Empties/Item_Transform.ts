import { Item_Transform } from '../RestModels';

export function item_transform(): Item_Transform {
	return {
		id: 0,
		from_item_id: null,
		to_item_id: 0,
		multiplier: 1,
		created: new Date(),
		updated: new Date(),
	};
}

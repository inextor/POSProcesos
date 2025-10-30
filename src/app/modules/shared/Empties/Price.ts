import { Price } from '../RestModels';

export function price(): Price {
	let p: Price = {
		id: 0,
		price: 1,
		price_type_id: 1,
		currency_id: 'MXN',
		tax_included: 'YES',
		created_by_user_id: 1,
		updated_by_user_id: 1,
		created: new Date(),
		updated: new Date(),
		item_id: 0,
		percent: 0,
		price_list_id: 0
	};
	return p;
}

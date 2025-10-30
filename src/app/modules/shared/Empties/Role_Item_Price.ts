import { Role_Item_Price } from '../RestModels';

export function role_item_price(): Role_Item_Price {
	let p: Role_Item_Price = {
		id: 0,
		price: 1,
		created_by_user_id: 1,
		updated_by_user_id: 1,
		created: new Date(),
		updated: new Date(),
		item_id: 0,
		role_id: 0
	};
	return p;
}

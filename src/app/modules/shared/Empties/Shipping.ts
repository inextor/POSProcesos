import { Shipping } from '../RestModels';

export function shipping(): Shipping {
	return {
		created: new Date(),
		created_by_user_id: null,
		date: '',
		delivery_timestamp: null,
		from_store_id: null,
		id: 0,
		note: '',
		purchase_id: null,
		received_by_user_id: null,
		requisition_id: null,
		shipping_company: '',
		shipping_guide: '',
		status: 'PENDING',
		to_store_id: 0,
		updated: new Date(),
		updated_by_user_id: 0,
	};
}

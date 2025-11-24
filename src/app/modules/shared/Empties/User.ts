import { User } from '../RestModels';

export function user(): User {
	return {
		code: null,
		created: new Date(),
		created_by_user_id: null,
		credit_days: 0,
		credit_limit: 0,
		default_billing_address_id: null,
		default_shipping_address_id: null,
		email: '',
		id: 0,
		image_id: null,
		lat: null,
		lng: null,
		name: '',
		password: '',
		phone: '',
		platform_client_id: null,
		points: 0,
		price_type_id: null,
		production_area_id: null,
		status: 'ACTIVE',
		store_id: 0,
		type: 'CLIENT',
		updated: new Date(),
		updated_by_user_id: null,
		username: '',
		workshift_id: null,
	};
}

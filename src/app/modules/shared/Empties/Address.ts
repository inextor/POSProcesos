import { Address } from '../RestModels';

export function address(): Address {
	return {
		address: null,
		city: null,
		country: null,
		created: new Date(),
		email: null,
		id: 0,
		lat: null,
		lng: null,
		name: '',
		note: null,
		phone: null,
		rfc: null,
		sat_regimen_capital: null,
		sat_regimen_fiscal: null,
		sat_uso_cfdi: null,
		state: null,
		status: 'ACTIVE',
		suburb: null,
		type: 'BILLING',
		updated: new Date(),
		user_id: 0,
		zipcode: null
	};
}

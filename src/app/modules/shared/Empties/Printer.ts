import { Printer } from '../RestModels';

export function printer(): Printer {
	return {
		created: new Date(),
		created_by_user_id: 0,
		description: 0,
		device: null,
		id: 0,
		ip_address: null,
		name: '',
		port: null,
		protocol: '',
		serial_number: '',
		store_id: null,
		updated: new Date(),
		updated_by_user_id: 0
	};
}

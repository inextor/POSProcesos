import { Payroll } from '../RestModels';

export function payroll(): Payroll {
	return {
		id: 0,
		user_id: 0,
		store_id: 0,
		created_by_user_id: 0,
		updated_by_user_id: 0,
		start_date: '',
		end_date: '',
		status: 'ACTIVE',
		created: new Date(),
		updated: new Date(),
		subtotal: 0,
		total: 0,
		paid_status: 'PENDING',
		paid_timestamp: null
	};
}

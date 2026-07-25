import { Transfer } from '../RestModels';

export function transfer(): Transfer {
	return {
		id: 0,
		source_bank_account_id: 0,
		dest_bank_account_id: 0,
		amount: '0',
		note: null,
		paid_date: null,
		reference: null,
		created: new Date(),
		updated: new Date(),
		created_by_user_id: 0,
		updated_by_user_id: 0
	};
}

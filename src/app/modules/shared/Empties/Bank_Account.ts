import { Bank_Account } from '../RestModels';

export function bank_account(): Bank_Account {
	return {
		id: 0,
		name: '',
		account: '',
		alias: '',
		bank: '',
		bank_rfc: null,
		currency: 'MXN',
		email: null,
		is_a_payment_method: 'NO',
		created: new Date(),
		updated: new Date(),
		user_id: null
	};
}

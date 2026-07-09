export function store_bank_account(): any {
	return {
		id: 0,
		bank_account_id: 0,
		store_id: 0,
		name: '',
		default_transaction_type: null,
		created: new Date(),
		updated: new Date(),
	};
}

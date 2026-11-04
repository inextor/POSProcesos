import { Bank_Movement } from '../RestModels';

export function bank_movement(): Bank_Movement {
	return {
		amount_received: 0,
		balance: 0,
		bank_account_id: null,
		is_checkpoint: null,
		card_ending: '',
		client_user_id: null,
		created: new Date(),
		currency_id: 'MXN',
		id: 0,
		invoice_attachment_id: null,
		note: '',
		origin_bank_name: '',
		paid_date: null,
		payment_id: null,
		provider_user_id: null,
		receipt_attachment_id: null,
		received_by_user_id: null,
		reference: '',
		status: 'ACTIVE',
		exchange_rate: 1,
		total: 0,
		transaction_type: 'CASH',
		transfer_id: null,
		type: 'income',
		updated: new Date()
	};
}

export interface Transfer {
	id: number;
	source_bank_account_id: number;
	dest_bank_account_id: number;
	amount: string;
	note: string | null;
	paid_date: string | null;
	reference: string | null;
	created: Date;
	updated: Date;
	created_by_user_id: number;
	updated_by_user_id: number;
}

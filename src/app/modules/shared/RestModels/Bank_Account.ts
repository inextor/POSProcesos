export interface Bank_Account{
	account:string;
	alias:string;
	bank:string;
	bank_rfc:string | null;
	created:Date;
	currency:string;
	email:string | null;
	id:number;
	is_a_payment_method:'NO'|'YES';
	name:string;
	updated:Date;
	user_id:number | null;
}

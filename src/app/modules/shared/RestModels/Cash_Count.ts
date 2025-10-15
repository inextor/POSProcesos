export interface Cash_Count{
	cash_close_id:number;
	created:Date;
	currency_id:string;
	denomination:number;
	id:number;
	quantity:number;
	type: 'COIN' | 'BILL' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CHECK' | 'TRANSFER';
	only_reference:number;
	updated:Date;
 }

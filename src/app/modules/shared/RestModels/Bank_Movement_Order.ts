export interface Bank_Movement_Order{
	amount:number;
	bank_movement_id:number
	created:Date;
	created_by_user_id:number | null;
	currency_amount:number;
	currency_id:string | null;
	exchange_rate:number;
	id:number;
	order_id:number
	status:'ACTIVE'|'DELETED';
	updated:Date;
	updated_by_user_id:number | null;
}

export interface Price{
	created:Date;
	created_by_user_id:number | null;
	currency_id:string | null;
	id:number;
	item_id:number
	percent:number;
	price:number;
	price_list_id:number
	price_type_id:number
	tax_included:'NO'|'YES';
	updated:Date;
	updated_by_user_id:number | null;
}

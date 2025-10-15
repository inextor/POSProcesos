export interface Order_Item{
	reservation_item_id: number | null;
	commanda_id:number | null;
	commanda_status:'NOT_DISPLAYED'|'PENDING'|'DISMISSED';
	created:Date;
	created_by_user_id:number | null;
	delivered_qty:number;
	delivery_status:'PENDING'|'DELIVERED';
	discount:number;
	discount_percent:number | null;
	exceptions:string | null;
	has_separator:'NO'|'YES';
	id:number;
	id_payment:number | null;
	ieps_type:'RATE'|'AMOUNT';
	ieps_value:number;
	is_free_of_charge:'NO'|'YES';
	is_item_extra:'NO'|'YES';
	item_extra_id:number | null;
	item_group:number | null;
	item_id:number
	item_option_id:number | null;
	item_option_qty:number;
	note:string | null;
	offer_id:number | null;
	order_id:number
	original_unitary_price:number;
	paid_qty:number | null;
	preparation_status:'PENDING'|'IN_PREPARATION'|'READY'|'DELIVERED';
	price_id:number | null;
	qty:number;
	return_required:'NO'|'YES';
	status:'ACTIVE'|'DELETED';
	stock_status:'IN_STOCK'|'STOCK_REMOVED';
	subtotal:number;
	system_preparation_ended:Date | null;
	system_preparation_started:Date | null;
	tax:number;
	tax_included:'NO'|'YES';
	total:number;
	type:'NORMAL'|'REFUND';
	unitary_price:number;
	unitary_price_meta:number;
	updated:Date;
	updated_by_user_id:number | null;
}

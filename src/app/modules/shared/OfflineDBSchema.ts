
export const OFFLINE_DB_SCHEMA = {
	name: 'offline_db',
	version: 25,
	schema: {
		order_info:"++id,&order.sync_id,&order.id",
		item_info:"item.id,item.category_id,item.code",
		category:"id",
		item_terms: "++id,item_id,term",
		payment_info:"&payment.sync_id,order_id,order_sync_id",
		store:"id,name",
		price_type: "id,name",
		currency_rate:"id,currency_id,store_id",
		printed_orders:"id",
		printed_items:"id",
		category_tree:"id,parent_category_id,child_category_id",
		table:"id"
	}
};

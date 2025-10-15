export interface Reservation_Item{
	id: number;
	created: Date;
	delivered_qty: number;
	end: string| null;
	item_id: number;
	last_period_id: number | null;
	note: string | null;
	period_type: 'BY_HOUR' | 'DAILY' | 'WEEKLY' | 'MONTHLY'|'ONCE_ONLY';
	price: number;
	tax_included: 'YES' | 'NO';
	qty: number;
	reservation_id: number;
	returned_qty: number;
	scheduled_delivery: Date | null;
	scheduled_return: Date | null;
	serial_item_id: number;
	start: string;
	status: 'ACTIVE' | 'DELETED';
	updated: Date;
}

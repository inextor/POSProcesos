export interface Reservation_Item_Serial{
	id: number;
	created: Date;
	created_by_user_id: number;
	delivered_timestamp: Date | null;
	delivery_by_user_id: number | null;
	end: Date | null;
	minutes_offset: number;
	note: string | null;
	reservation_item_id: number;
	returned_timestamp: Date | null;
	returned_by_user_id: number | null;
	schedule_delivery: Date | null;
	schedule_return: Date | null;
	serial_id: number;
	serial: string;
	start: Date | null;
	status: 'ACTIVE' | 'DELETED';
	updated: Date;
	updated_by_user_id: number;
}

import { Reservation_Item } from '../RestModels';

export function reservation_item(): Reservation_Item {
	return {
		id: 0,
		created: new Date(),
		delivered_qty: 0,
		end: null,
		item_id: 0,
		last_period_id: null,
		note: '',
		period_type: 'MONTHLY',
		price: 0,
		qty: 0,
		reservation_id: 0,
		returned_qty: 0,
		scheduled_delivery: null,
		scheduled_return: null,
		serial_item_id: 0,
		start: '',
		status: 'ACTIVE',
		tax_included: 'YES',
		updated: new Date(),
	};
}

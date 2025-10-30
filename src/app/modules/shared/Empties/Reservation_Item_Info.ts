import { ReservationItemInfo } from '../Models';
import { reservation_item } from './Reservation_Item';
import { item } from './Item';

export function reservation_item_info(): ReservationItemInfo {
	return {
		reservation_item: reservation_item(),
		item: item(),
		serial_item: item(),
		category: null,
		return_assignments: [],
		delivery_assignments: [],
		serials: [],
	};
}

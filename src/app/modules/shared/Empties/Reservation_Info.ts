import { ReservationInfo } from '../Models';
import { reservation } from './Reservation';

export function reservation_info(): ReservationInfo {
	return {
		reservation: reservation(),
		client_user: null,
		user: null,
		address: null,
		items: []
	};
}

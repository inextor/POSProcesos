import { Offer } from '../RestModels';
import { Utils } from '../Utils';

export function offer(): Offer {
	let start = new Date();
	let end = new Date();
	end.setFullYear(end.getFullYear() + 20);

	return {
		batch: null,
		category_id: null,
		coupon_code: null,
		created: new Date(),
		created_by_user_id: 0,
		description: null,
		discount: 0,
		expiration_days: null,
		expiration_thru: null,
		gift_item_id: null,
		hour_end: '23:59',
		hour_start: '00:00',
		id: 0,
		image_id: null,
		is_cumulative: 'NO',
		is_valid_friday: 1,
		is_valid_monday: 1,
		is_valid_saturday: 1,
		is_valid_sunday: 1,
		is_valid_thursday: 1,
		is_valid_tuesday: 1,
		is_valid_wednesday: 1,
		item_id: null,
		m: 1,
		n: 1,
		name: '',
		price_type_id: null,
		qty: 0,
		status: 'ACTIVE',
		store_id: null,
		tag: null,
		type: 'N_X_M',
		updated: new Date(),
		updated_by_user_id: 0,
		valid_from: Utils.getLocalMysqlStringFromDate(start).substring(0, 10),
		valid_thru: Utils.getLocalMysqlStringFromDate(end).substring(0, 10),
		price: 0,
	};
}

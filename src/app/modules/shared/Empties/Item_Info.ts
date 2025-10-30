import { ItemInfo } from '../Models';
import { item } from './Item';

export function item_info(): ItemInfo {
	return {
		item: item(),
		category: null,
		price: undefined,
		prices: [],
		options: [],
		exceptions: [],
		records: [],
		stock_record: undefined,
		serials: [],
		item_options: []
	};
}

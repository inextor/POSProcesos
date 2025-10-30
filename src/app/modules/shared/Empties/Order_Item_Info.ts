import { OrderItemInfo } from '../Models';
import { Item, Category, Price, Item_Exception } from '../RestModels';
import { order_item } from './Order_Item';

export function order_item_info(item: Item, category: Category | null = null, price: Price | null = null, exceptions: Item_Exception[] = [], prices: Price[] = []): OrderItemInfo {
	let orderItem = order_item(item);

	let order_item_info: OrderItemInfo = {
		order_item: orderItem,
		created: new Date(),
		order_item_exceptions: [],
		serials_string: "",
		commanda_type_id: item.commanda_type_id,
		item: item,
		category: null,
		price: undefined,
		prices,
		options: [],
		exceptions: [],
		records: [],
		stock_record: undefined,
		serials: [],
		category_zero: null,
		item_options: []
	};

	return order_item_info;
}

// Import all empty factory functions from Empties directory
import { item_info } from './Empties/Item_Info';
import { role } from './Empties/Role';
import { role_item_price } from './Empties/Role_Item_Price';
import { price } from './Empties/Price';
import { order_item } from './Empties/Order_Item';
import { order_item_info } from './Empties/Order_Item_Info';
import { period } from './Empties/Period';
import { order_info } from './Empties/Order_Info';
import { shipping_info } from './Empties/Shipping_Info';
import { shipping } from './Empties/Shipping';
import { process } from './Empties/Process';
import { reservation } from './Empties/Reservation';
import { reservation_item } from './Empties/Reservation_Item';
import { reservation_item_info } from './Empties/Reservation_Item_Info';
import { reservation_info } from './Empties/Reservation_Info';
import { user } from './Empties/User';
import { address } from './Empties/Address';
import { user_permission } from './Empties/User_Permission';
import { user_extra_fields } from './Empties/User_Extra_Fields';
import { preferences } from './Empties/Preferences';
import { production_area } from './Empties/Production_Area';
import { production } from './Empties/Production';
import { production_area_item } from './Empties/Production_Area_Item';
import { payroll } from './Empties/Payroll';
import { payroll_value } from './Empties/Payroll_Value';
import { payroll_info } from './Empties/Payroll_Info';
import { store } from './Empties/Store';
import { work_log_rules } from './Empties/Work_Log_Rules';
import { item_online } from './Empties/Item_Online';
import { item_store } from './Empties/Item_Store';
import { item_provider } from './Empties/Item_Provider';
import { item_transform } from './Empties/Item_Transform';
import { category_store } from './Empties/Category_Store';
import { category } from './Empties/Category';
import { item } from './Empties/Item';
import { price_type } from './Empties/Price_Type';

/**
 * GetEmpty class provides static methods for creating empty/default instances of models.
 * This class acts as a facade that delegates to individual factory functions in the Empties/ directory.
 */
export class GetEmpty {
	static item_info = item_info;
	static role = role;
	static role_item_price = role_item_price;
	static price = price;
	static order_item = order_item;
	static orderItemInfo = order_item_info;
	static period = period;
	static order_info = order_info;
	static shipping_info = shipping_info;
	static shipping = shipping;
	static process = process;
	static reservation = reservation;
	static reservation_item = reservation_item;
	static reservation_item_info = reservation_item_info;
	static reservation_info = reservation_info;
	static getEmptyReservationInfo = reservation_info; // Alias for backward compatibility
	static user = user;
	static address = address;
	static user_permission = user_permission;
	static user_extra_fields = user_extra_fields;
	static preferences = preferences;
	static production_area = production_area;
	static production = production;
	static production_area_item = production_area_item;
	static payroll = payroll;
	static payroll_value = payroll_value;
	static payroll_info = payroll_info;
	static store = store;
	static work_log_rules = work_log_rules;
	static item_online = item_online;
	static item_store = item_store;
	static item_provider = item_provider;
	static item_transform = item_transform;
	static category_store = category_store;
	static category = category;
	static item = item;
	static price_type = price_type;
}

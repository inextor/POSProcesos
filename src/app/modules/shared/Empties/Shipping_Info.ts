import { ShippingInfo } from '../Models';
import { shipping } from './Shipping';

export function shipping_info(): ShippingInfo {
	return {
		shipping: shipping(),
		items: []
	};
}

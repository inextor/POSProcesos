export type SubscriptionDurationUnit = 'SECOND' | 'MINUTE' | 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
export type SubscriptionAnchor = 'EXACT_PERIOD' | 'END_OF_HOUR' | 'END_OF_DAY' | 'END_OF_WEEK' | 'END_OF_MONTH' | 'START_OF_NEXT_MONTH';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'RETURNED' | 'CANCELLED' | 'SUSPENDED';

export interface Subscription
{
	asset_code: string | null;
	assigned_by_user_id: number | null;
	balance_qty: number | null;
	created: Date;
	created_by_user_id: number;
	duration_qty: number | null;
	duration_unit: SubscriptionDurationUnit | null;
	expiration_anchor: SubscriptionAnchor;
	expires_at: string | null;
	id: number;
	is_returnable: number;
	item_id: number | null;
	last_consumed_at: string | null;
	last_order_id: number | null;
	last_payment_id: number | null;
	note: string | null;
	parent_subscription_id: number | null;
	returned_at: string | null;
	scheduled_delivery: string | null;
	scheduled_return: string | null;
	serial_id: number | null;
	starts_at: string;
	status: SubscriptionStatus;
	store_id: number | null;
	total_qty: number | null;
	updated: Date;
	updated_by_user_id: number;
	user_id: number;
}
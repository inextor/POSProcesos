import { Item } from './Item';

export interface Transformation_Output {
	id: number;
	transformation_id: number;
	item_id: number;
	quantity: number;
	created: Date;
	updated: Date;
	created_by_user_id: number | null;
	updated_by_user_id: number | null;
	item?: Item;
}

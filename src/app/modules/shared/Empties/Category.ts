import { Category } from '../RestModels';

export function category(): Category {
	return {
		background: 'transparent',
		code: '',
		created: new Date(),
		created_by_user_id: null,
		default_clave_prod_serv: '',
		display_status: 'NORMAL',
		id: 0,
		image_id: null,
		image_style: 'CONTAIN',
		name: '',
		shadow_color: '#000000',
		sort_weight: 10,
		text_color: '#FFFFFF',
		text_style: 'CENTER',
		type: '',
		updated: new Date(),
		updated_by_user_id: null,
	};
}

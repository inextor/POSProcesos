import { Item_Provider } from '../RestModels';

export function item_provider(): Item_Provider {
	return {
		id: 0,
		provider_user_id: 0,
		name: '',
		codigo: null,
		to_item_id: 0,
		tasa: null,
		clave_unidad: null,
		objeto_impuesto: null,
		created: new Date(),
		updated: new Date(),
	};
}

import { User_Extra_Fields } from '../RestModels';

export function user_extra_fields(user_id: number): User_Extra_Fields {
	return {
		id: 0,
		user_id,
		json_fields: {},
	};
}

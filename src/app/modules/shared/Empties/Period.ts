import { Period, User } from '../RestModels';

export function period(user: User): Period {
	let date = new Date();
	let minutes_offset = date.getTimezoneOffset();
	return {
		id: 0,
		created: new Date(),
		created_by_user_id: user.id,
		reservation_id: 0,
		end_timestamp: new Date(),
		note: '',
		start_timestamp: new Date(),
		status: 'ACTIVE',
		updated: new Date(),
		minutes_offset,
		updated_by_user_id: user.id,
	};
}

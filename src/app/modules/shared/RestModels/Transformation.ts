export interface Transformation {
	id: number;
	name: string;
	note: string | null;
	reference: string | null;
	provider_user_id: number | null;
	status: 'ACTIVE' | 'DELETED';
	created: Date;
	updated: Date;
	created_by_user_id: number | null;
	updated_by_user_id: number | null;
}

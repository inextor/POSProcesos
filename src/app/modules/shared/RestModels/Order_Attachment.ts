export interface Order_Attachment {
	id: number;
	attachment_id: number;
	order_id: number;
	title: string | null;
	status?: 'ACTIVE' | 'DELETED';
	created: Date;
	updated: Date;
	deleted_timestamp: Date | null;
	created_by_user_id: number;
	updated_by_user_id: number;
}

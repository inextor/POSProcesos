export interface Order_Response {
	id: number;
	order_id: number;
	response_id: number;
	status: 'ACTIVE' | 'DELETED';
	created?: Date | null;
	updated?: Date | null;
}

export interface Check_In{
	created_by_user_id:number | null;
	current:number;
	id:number;
	end_timestamp:Date;
	start_timestamp:Date;
	updated_by_user_id:number | null;
	user_id:number
}

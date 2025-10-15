export interface Category_Store{
	category_id:number
	created:Date;
	created_by_user_id:number
	id:number;
	pos_preference:'SHOW'|'HIDE'|'DEFAULT';
	store_id:number
	updated:Date;
	updated_by_user_id:number
}

export interface Category_Tree{
	child_category_id:number
	created:Date;
	created_by_user_id:number
	depth:number
	id:number;
	parent_category_id:number
	path:string | null;
	updated:Date;
	updated_by_user_id:number
}

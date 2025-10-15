
export interface Category{
	background:string | null;
	code:string | null;
	created:Date;
	created_by_user_id:number | null;
	default_clave_prod_serv:string | null;
	display_status:'NORMAL'|'HIDDEN';
	id:number;
	image_id:number | null;
	image_style:'COVER'|'CONTAIN';
	name:string;
	shadow_color:string | null;
	sort_weight:number;
	text_color:string | null;
	text_style:'NEVER'|'CENTER'|'DOWN';
	type:string | null;
	updated:Date;
	updated_by_user_id:number | null;
}

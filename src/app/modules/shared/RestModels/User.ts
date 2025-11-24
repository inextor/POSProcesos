export interface User{
    code: string | null;
	created:Date;
	created_by_user_id:number | null;
	credit_days:number | null;
	credit_limit:number;
	default_billing_address_id:number | null;
	default_shipping_address_id:number | null;
	email:string | null;
	id:number;
	image_id:number | null;
	lat:number | null;
	lng:number | null;
	name:string;
	password:string | null;
	phone:string | null;
	platform_client_id:number | null;
	points:number;
	price_type_id:number | null;
	production_area_id:number | null;
	status:'ACTIVE'|'DELETED';
	store_id:number | null;
	type:'CLIENT'|'USER';
	updated:Date;
	updated_by_user_id:number | null;
	username:string | null;
	workshift_id:number | null;
}

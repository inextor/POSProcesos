export interface Address{
	address:string | null;
	city:string | null;
	country:string | null;
	created:Date;
	email:string | null;
	id:number;
	lat:number | null;
	lng:number | null;
	name:string;
	note:string | null;
	phone:string | null;
	rfc:string | null;
	sat_regimen_capital:string | null;
	sat_regimen_fiscal:string | null;
	sat_uso_cfdi: string | null;
	state:string | null;
	status:'ACTIVE'|'DELETED';
	suburb:string | null;
	type:'BILLING'|'SHIPPING'|'BILLING_AND_SHIPPING';
	updated:Date;
	user_id:number
	zipcode:string | null;
}

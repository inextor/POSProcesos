export interface Sat_Factura{
	folio: string | null;
	serie: string | null;
	created:Date;
	created_by_user_id:number | null;
	cancelado_por_sat: 'NO'|'YES';
	id:number;
	order_id:number | null;
	payment_id:number | null;
	pdf_attachment_id:number
	solicitud_cancelacion_sat_timestamp:Date | null;
	system_cancelled_timestamp:Date | null;
	updated:Date;
	type:'NORMAL'|'COMPLEMENTO_PAGO' | 'POR_PERIODO'| 'DESCONOCIDO';
	updated_by_user_id:number | null;
	uuid:string;
	xml_attachment_id:number | null;
}

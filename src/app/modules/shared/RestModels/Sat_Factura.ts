export interface Sat_Factura{
	billing_data_id:number | null;
	cancelado_por_sat: 'NO'|'YES';
	created:Date;
	created_by_user_id:number | null;
	credit_note_id:number | null;
	folio: string | null;
	id:number;
	order_id:number | null;
	parent_sat_factura_id:number | null;
	payment_id:number | null;
	pdf_attachment_id:number | null;
	request:string | null;
	serie: string | null;
	solicitud_cancelacion_sat_timestamp:Date | null;
	system_cancelled_timestamp:Date | null;
	transaccion:string | null;
	type:'NORMAL'|'COMPLEMENTO_PAGO'|'POR_PERIODO'|'NOTA_CREDITO'|'PAGO_PARCIAL'|'DESCONOCIDO';
	updated:Date;
	updated_by_user_id:number | null;
	uuid:string | null;
	xml_attachment_id:number | null;
}

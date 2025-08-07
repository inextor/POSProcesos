import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Order, Sat_Factura, Billing_Data, Payment } from '../../modules/shared/RestModels';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, filter, map, mergeMap } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { Utils } from '../../modules/shared/Utils';
import { OrderInfo, PaymentInfo } from '../../modules/shared/Models';
import { LoadingComponent } from '../../components/loading/loading.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { PaginationComponent } from '../../components/pagination/pagination.component';

export interface CSatFacturaInfo extends Sat_Factura
{
	name_type:string;
	sat_cancelled:string;
	link: Array<any>;
	system_status: string;
	client_name?: string;
	folio?: number;
	total?: number;
	type:string;
	payment_id:number;
	system_cancelled_timestamp:Date;
	cancelado_por_sat:string;
	solicitud_cancelacion_sat_timestamp:Date;
	xml_attachment_id:number;
	pdf_attachment_id:number;
	is_current:boolean;
}

@Component({
	selector: 'app-view-sat-factura',
	templateUrl: './list-object-sat-factura.component.html',
	styleUrls: ['./list-object-sat-factura.component.css'],
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		RouterLink,
		LoadingComponent,
		ModalComponent,
		PaginationComponent,
	]
})
export class ListObjectSatFacturaComponent extends BaseComponent implements OnInit
{

	sat_factura_search: SearchObject<Sat_Factura> = this.getEmptySearch();
	sat_factura_info_list: CSatFacturaInfo[] = [];
	billing_data_list: Billing_Data[] = [];

	reenviar_factura_name:string = '';
	reenviar_factura_email:string = '';
	show_reenviar_factura:boolean = false;

	modal_response: string = '';
	modal_UUID: string = '';
	modal_factura_id: number | '' = '';
	show_checar_factura: boolean = false;

	endx: string = '';
	startx: string = '';
	billing_data_id: string = '';

	rest_sat_factura!: RestSimple<Sat_Factura>;
	rest_order!: RestSimple<Order>;
	rest_billing_data!: RestSimple<Billing_Data>;
	rest_payment_info!: Rest<Payment,PaymentInfo>;

	order_id:number | null = null;
	payment_id:number | null = null;
	order:Order | null = null;
	payment_info:PaymentInfo | null = null;

	ngOnInit(): void
	{
		console.log('ngOnInit started for ListObjectSatFacturaComponent');
		try {
			this.path = '/list-sat-factura';

			this.rest_sat_factura = this.rest.initRestSimple('sat_factura');
			this.rest_payment_info = this.rest.initRest('payment_info');
			this.rest_order = this.rest.initRestSimple('order');
			this.rest_billing_data = this.rest.initRestSimple('billing_data');

			this.subs.sink = this.route.paramMap.pipe
			(
				mergeMap((param_map) =>
				{
					console.log('paramMap received', param_map);
					this.order_id = param_map.has('order_id') ? parseInt(param_map.get('order_id') as string) : null;
					this.payment_id = param_map.has('payment_id') ? parseInt(param_map.get('payment_id') as string) : null;

					this.setTitle('Facturas');
					this.is_loading = true;

					this.sat_factura_search = this.getEmptySearch();

					this.sat_factura_search.eq.order_id = this.order_id;
					this.sat_factura_search.eq.payment_id = this.payment_id;

					let order_obs = this.order_id ? this.rest_order.get(this.order_id) : of(null);
					let payment_obs = this.payment_id ? this.rest_payment_info.get(this.payment_id) : of(null);

					console.log('Making API calls');
					return forkJoin({
						facturas: this.rest_sat_factura.search(this.sat_factura_search),
						order: order_obs,
						payment_info: payment_obs
					});
				}),
				catchError((error) => {
					console.error('Error in API call', error);
					this.showError(error);
					return of(null);
				})
			)
			.subscribe((response:any) =>
			{
				console.log('API response received', response);
				if(response) {
					this.order = response.order;
					this.payment_info = response.payment;
					this.sat_factura_info_list = response.facturas.data.map((i:Sat_Factura) => this.getType(i, response.order, response.payment_info));

					this.setPages(this.sat_factura_search.page, response.facturas.total);
				}
				this.is_loading = false;
				console.log('ngOnInit finished');
			});
		} catch (e) {
			console.error('Synchronous error in ngOnInit', e);
		}
	}

	getType(sat_factura: Sat_Factura, order: Order, payment_info: PaymentInfo): CSatFacturaInfo {
		let link: (string | number)[] = [];
		let extended_sat_factura = sat_factura as CSatFacturaInfo;

		if (extended_sat_factura.type == 'NORMAL')
			link = ['/view-order', extended_sat_factura.order_id as number];

		if (extended_sat_factura.type == 'COMPLEMENTO_PAGO')
			link = ['/list-payment-sat-factura', extended_sat_factura.payment_id];

		let name_type = 'Desconocido';

		if (extended_sat_factura.type == 'POR_PERIODO')
		{
			name_type = 'Factura por periodo';
		}

		if (extended_sat_factura.type == 'NORMAL')
		{
			name_type = 'Facturación';
		}

		if (extended_sat_factura.type == 'COMPLEMENTO_PAGO')
		{
			name_type = 'Factura de pago';
		}

		let sat_cancelled = extended_sat_factura.cancelado_por_sat == 'NO' ? 'Activo' : 'Cancelado';
		let system_status = extended_sat_factura.system_cancelled_timestamp == null ? 'Activo' : 'Cancelado';

		let client_name = order?.client_name || '';

		let folio = order?.store_consecutive as number;
		let total = extended_sat_factura.type == 'POR_PERIODO' ? 0
		: ((order?.total || 0) - (order?.discount || 0)) || (payment_info?.payment.payment_amount || 0);

		let is_current = false;

		if(order && order.sat_factura_id == sat_factura.id)
			is_current = true;

		if(payment_info && payment_info.payment.sat_factura_id == sat_factura.id)
			is_current = true;

		return {
			...extended_sat_factura, name_type, sat_cancelled, link, system_status, client_name, folio, total, is_current
		};
	}

	getPdfUrl(sat_factura: Sat_Factura)
	{
		return this.rest.getApiUrl()+'/getFacturaPdf.php?sat_factura_id='+sat_factura.id;
	}

	checarFactura(sat_factura: Sat_Factura)
	{
		this.is_loading = true;
		this.modal_UUID = sat_factura.uuid;
		this.modal_factura_id = sat_factura.id;
		let auth_header = this.rest.getSessionHeaders().get('Authorization') || '';

		fetch(this.rest.getApiUrl()+'/checar_factura.php?sat_factura_id='+sat_factura.id,
		{headers: {Authorization: auth_header}} )
		.then(response => response.json())
		.then(data =>
		{
			console.log(data);

			if (data.estado)
			{
				this.is_loading = false;
				this.modal_response = data.estado;


				this.show_checar_factura = true;
			}
			else
			{
				this.showError('Error al revisar el estado de la factura');
			}

		})
		.catch(error =>
		{
			console.error('Error:', error);
		});
	}

	resendFactura(evt:Event)
	{
		// console.log("HOLA SI JALO LA FUNCIÓN");
	}

	replayFactura(sat_factura:Sat_Factura)
	{
		this.is_loading = true;

		this.subs.sink = this.rest.update('replayFactura',{id:sat_factura.id})
		.subscribe((sat_factura2:any)=>
		{
			//sat_factura = this.getType(sat_factura);
			sat_factura.uuid = sat_factura2.uuid;

		},(error:any)=>this.showError(error));
	}

	cancelarFactura(sat_factura:Sat_Factura)
	{
		this.subs.sink = this.confirmation
		.showConfirmAlert(sat_factura,
			'Cancelar Factura',
			'¿Estas seguro de cancelar esta factura?'
		)
		.pipe
		(
			filter(result=>result.accepted),
			mergeMap((result:any)=>
			{
				this.is_loading = true;
				return this.rest.update('cancelar_factura',{ sat_factura_id: sat_factura.id });
			}),
		)
		.subscribe
		({
			next:(_response:any)=>this.showSuccess('La factura se cancelo correctamente'),
			error:(error:any)=>this.showError(error)
		});
	}

	searchReport()
	{
		this.search( this.sat_factura_search );
		console.log( "ESTE ES EL SARCH REPORT: ", this.sat_factura_search );
	}

	print()
{
		this.rest.hideMenu?.();
		setTimeout(() => window.print(), 500);
	}

}

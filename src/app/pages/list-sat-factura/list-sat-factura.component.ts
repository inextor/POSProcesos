import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Order, Sat_Factura, Billing_Data } from '../../modules/shared/RestModels';
import { ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';
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
	link: string|null;
	system_status: string;
	client_name?: string;
	folio: string | null;
	total?: number;
	type:'NORMAL'|'COMPLEMENTO_PAGO' | 'POR_PERIODO'| 'DESCONOCIDO';
	payment_id:number;
	system_cancelled_timestamp:Date;
	cancelado_por_sat:'NO'|'YES';
	solicitud_cancelacion_sat_timestamp:Date;
	xml_attachment_id:number;
	pdf_attachment_id:number;
}

@Component({
	selector: 'app-list-sat-factura',
	templateUrl: './list-sat-factura.component.html',
	styleUrls: ['./list-sat-factura.component.css'],
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		LoadingComponent,
		ModalComponent,
		PaginationComponent,
	]
})
export class ListSatFacturaComponent extends BaseComponent implements OnInit
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
	rest_payment_info!: RestSimple<PaymentInfo>;
	rest_order!: RestSimple<Order>;
	rest_billing_data!: RestSimple<Billing_Data>;

	ngOnInit(): void
	{
		this.path = '/list-sat-factura';

		this.rest_sat_factura = this.rest.initRestSimple('sat_factura');
		this.rest_payment_info = this.rest.initRestSimple('payment_info');
		this.rest_order = this.rest.initRestSimple('order');
		this.rest_billing_data = this.rest.initRestSimple('billing_data');

		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map) =>
			{
				this.setTitle('Reporte de facturas');
				this.is_loading = true;
				this.sat_factura_search.limit = this.page_size;
				this.sat_factura_search = this.getSearch(param_map, ['created'], ['billing_data_id']);

				this.startx = '';
				this.endx = '';

				if(this.sat_factura_search.ge.created)
				{
					this.startx = Utils.getLocalMysqlStringFromDate(this.sat_factura_search.ge.created as Date);
				}

				if(this.sat_factura_search.le.created)
				{
					this.endx = Utils.getLocalMysqlStringFromDate(this.sat_factura_search.le.created as Date);
				}

				if (this.sat_factura_search.sort_order.length == 0)
				{
					this.sat_factura_search.sort_order = ['id_DESC'];
				}

				this.current_page = this.sat_factura_search.page;

				return this.rest_sat_factura.search(this.sat_factura_search);
			}),
			mergeMap
			(
				(response:any) =>
				{
					let payment_ids = response.data.map((f:any) => f.payment_id).filter((id:any) => id);

					let payment_obs = payment_ids.length > 0
						? this.rest_payment_info.search({ csv: { id: payment_ids } as any, limit: payment_ids.length })
						: of({ total: 0, data: [] });

					return forkJoin
					({
						sat_factura: of(response),
						payments: payment_obs
					})
				}
			),
			mergeMap
			(
				(response:any) =>
				{
					let order_ids = response.sat_factura.data.map((f:any) => f.order_id).filter((id:any) => id);
					let payment_order_ids = response.payments.data.map((p: PaymentInfo) => p.movements?.[0]?.bank_movement_orders?.[0]?.order_id).filter((id:any) => id);

					order_ids.push(...payment_order_ids);

					console.log('Order IDs:', order_ids);

					let order_obs = order_ids.length > 0
						? this.rest_order.search({ csv: { id: order_ids } as any, limit: order_ids.length })
						: of({ total: 0, data: [] });

					return forkJoin
					({
						sat_factura: of(response.sat_factura),
						payments: of(response.payments),
						orders: order_obs,
						billing_data: this.rest_billing_data.search({limit: 9999})
					});
				}
			)
    	)
		.subscribe((response:any) =>
		{
			this.billing_data_list = response.billing_data.data;
			this.sat_factura_info_list = response.sat_factura.data.map((i:Sat_Factura) => this.getType(i, response.orders.data, response.payments.data));

			this.setPages(this.sat_factura_search.page, response.sat_factura.total);
			this.is_loading = false;
		});
  	}

	getType(sat_factura: Sat_Factura, order_list: Order[], payment_info_list: PaymentInfo[]): CSatFacturaInfo {
		let link: string|null= null;
		let extended_sat_factura = sat_factura as CSatFacturaInfo;

		if (extended_sat_factura.type == 'NORMAL')
		{
			//link = ['/view-order', extended_sat_factura.order_id as number];
			link = this.rest.getExternalAppUrl()+'/#/view-order/'+extended_sat_factura.order_id;
		}

		if (extended_sat_factura.type == 'COMPLEMENTO_PAGO')
		{
			//link = ['/view-payment', extended_sat_factura.payment_id];
			link = this.rest.getExternalAppUrl()+'/#/view-payment/'+extended_sat_factura.payment_id;
		}

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

		let payment_info: PaymentInfo | undefined = payment_info_list.find(p => p.payment.id == extended_sat_factura.payment_id);

		let order: Order | undefined = order_list.find(order => order.id == extended_sat_factura.order_id
			|| (payment_info && payment_info.movements?.[0]?.bank_movement_orders?.[0]?.order_id == order.id));

		let client_name = order?.client_name || '';

		let folio = order?.store_consecutive?.toString() || null;
		let total = extended_sat_factura.type == 'POR_PERIODO' ? 0
		: ((order?.total || 0) - (order?.discount || 0)) || (payment_info?.payment.payment_amount || 0);

		return {
			...extended_sat_factura, name_type, sat_cancelled, link, system_status, client_name, folio, total
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

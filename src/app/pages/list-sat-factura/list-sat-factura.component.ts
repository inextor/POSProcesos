import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParamMap } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestResponse, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Billing_Data, Order, Sat_Factura, User } from '../../modules/shared/RestModels';
import { PaymentInfo } from '../../modules/shared/Models';
import { Utils } from '../../modules/shared/Utils';
import { ExcelUtils } from '../../classes/ExcelUtils';
import { LoadingComponent } from '../../components/loading/loading.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { PaginationComponent } from '../../components/pagination/pagination.component';

interface CClient extends User
{
	agent_name: string | null;
}

interface CSatFacturaInfo extends Sat_Factura
{
	name_type: string;
	sat_cancelled: string;
	system_status: string;
	link: string | null;
	client_name: string;
	agent_name: string;
	total: number;
	pdf_url: string;
	xml_url: string;
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
	sat_factura_info_array: CSatFacturaInfo[] = [];
	billing_data_array: Billing_Data[] = [];

	reenviar_factura_name: string = '';
	reenviar_factura_email: string = '';
	show_reenviar_factura: boolean = false;

	modal_response: string = '';
	modal_UUID: string = '';
	modal_factura_id: number | '' = '';
	show_checar_factura: boolean = false;

	endx: string = '';
	startx: string = '';
	billing_data_id: string = '';

	external_base_url: string = this.rest.getExternalAppUrl();

	rest_sat_factura: RestSimple<Sat_Factura> = this.rest.initRestSimple('sat_factura');
	rest_payment_info: RestSimple<PaymentInfo> = this.rest.initRestSimple('payment_info');
	rest_order: RestSimple<Order> = this.rest.initRestSimple('order');
	rest_billing_data: RestSimple<Billing_Data> = this.rest.initRestSimple('billing_data');
	rest_user: RestSimple<CClient> = this.rest.initRestSimple('user');

	ngOnInit(): void
	{
		this.path = '/list-sat-factura';

		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map: ParamMap) =>
			{
				this.setTitle('Reporte de facturas');
				this.is_loading = true;
				this.sat_factura_search.limit = this.page_size;
				this.sat_factura_search = this.getSearch<Sat_Factura>
				(
					param_map,
					['created', 'type', 'order_id', 'payment_id', 'serie', 'folio'],
					['billing_data_id', 'status_filter', 'monto']
				);

				this.startx = '';
				this.endx = '';

				if (this.sat_factura_search.ge.created)
				{
					this.startx = Utils.getLocalMysqlStringFromDate(this.sat_factura_search.ge.created as Date);
				}

				if (this.sat_factura_search.le.created)
				{
					this.endx = Utils.getLocalMysqlStringFromDate(this.sat_factura_search.le.created as Date);
				}

				if (this.sat_factura_search.sort_order.length == 0)
				{
					this.sat_factura_search.sort_order = ['id_DESC'];
				}

				this.current_page = this.sat_factura_search.page;

				let status_filter = this.sat_factura_search.search_extra['status_filter'];

				if (status_filter === 'active')
				{
					this.sat_factura_search.is_null = ['system_cancelled_timestamp'];
					this.sat_factura_search.nn = ['uuid'];
					this.sat_factura_search.eq.cancelado_por_sat = 'NO';
				}
				else if (status_filter === 'cancelled_sat')
				{
					this.sat_factura_search.eq.cancelado_por_sat = 'YES';
				}
				else if (status_filter === 'cancelled_system')
				{
					this.sat_factura_search.nn = ['system_cancelled_timestamp'];
				}

				return this.rest_sat_factura.search(this.sat_factura_search);
			}),
			mergeMap((response: RestResponse<Sat_Factura>) =>
			{
				let payment_ids = response.data.map(f => f.payment_id).filter(id => id);

				let payment_obs = payment_ids.length > 0
					? this.rest_payment_info.search({ csv: { id: payment_ids } as any, limit: payment_ids.length })
					: of({ total: 0, data: [] } as RestResponse<PaymentInfo>);

				return forkJoin
				({
					sat_factura: of(response),
					payments: payment_obs
				});
			}),
			mergeMap((response) =>
			{
				let order_ids: number[] = response.sat_factura.data
					.map((f: Sat_Factura) => f.order_id)
					.filter((id): id is number => !!id);

				let payment_order_ids = response.payments.data
					.map((p: PaymentInfo) => p.movements?.[0]?.bank_movement_orders?.[0]?.order_id)
					.filter((id): id is number => !!id);

				order_ids.push(...payment_order_ids);

				let order_obs = order_ids.length > 0
					? this.rest_order.search({ csv: { id: order_ids }, limit: order_ids.length })
					: of({ total: 0, data: [] } as RestResponse<Order>);

				return forkJoin
				({
					sat_factura: of(response.sat_factura),
					payments: of(response.payments),
					orders: order_obs,
					billing_data: this.rest_billing_data.search({ limit: 9999 })
				});
			}),
			mergeMap((response) =>
			{
				let client_ids: number[] = Array.from(new Set
				(
					response.orders.data
						.map((o: Order) => o.client_user_id)
						.filter((id): id is number => !!id)
				));

				let clients_obs = client_ids.length > 0
					? this.rest_user.search({ csv: { id: client_ids }, limit: client_ids.length })
					: of({ total: 0, data: [] } as RestResponse<CClient>);

				return forkJoin
				({
					sat_factura: of(response.sat_factura),
					payments: of(response.payments),
					orders: of(response.orders),
					billing_data: of(response.billing_data),
					clients: clients_obs
				});
			})
		)
		.subscribe
		({
			next: (response) =>
			{
				let agent_by_client = new Map<number, string>();
				response.clients.data.forEach((u: CClient) => agent_by_client.set(u.id, u.agent_name ?? ''));

				this.billing_data_array = response.billing_data.data;
				this.sat_factura_info_array = response.sat_factura.data
					.map((i: Sat_Factura) => this.getType(i, response.orders.data, response.payments.data, agent_by_client));

				this.setPages(this.sat_factura_search.page, response.sat_factura.total);
			},
			error: (error) =>
			{
				this.showError(error);
			}
		});
	}

	getType(sat_factura: Sat_Factura, order_array: Order[], payment_info_array: PaymentInfo[], agent_by_client: Map<number, string>): CSatFacturaInfo
	{
		let link: string | null = null;

		if (sat_factura.type == 'NORMAL')
		{
			link = this.external_base_url + '/#/view-order/' + sat_factura.order_id;
		}

		if (sat_factura.type == 'COMPLEMENTO_PAGO')
		{
			link = this.external_base_url + '/#/view-payment/' + sat_factura.payment_id;
		}

		let name_type = 'Desconocido';

		if (sat_factura.type == 'POR_PERIODO')
		{
			name_type = 'Factura por periodo';
		}

		if (sat_factura.type == 'NORMAL')
		{
			name_type = 'Facturación';
		}

		if (sat_factura.type == 'COMPLEMENTO_PAGO')
		{
			name_type = 'Factura de pago';
		}

		let sat_cancelled = sat_factura.cancelado_por_sat == 'NO' ? 'Activo' : 'Cancelado';
		let system_status = sat_factura.system_cancelled_timestamp == null ? 'Activo' : 'Cancelado';

		let payment_info = payment_info_array.find(p => p.payment.id == sat_factura.payment_id);
		let order = order_array.find(o => o.id == sat_factura.order_id
			|| (payment_info && payment_info.movements?.[0]?.bank_movement_orders?.[0]?.order_id == o.id));

		let client_name = order?.sat_razon_social || order?.client_name || '';
		let agent_name = order?.client_user_id ? (agent_by_client.get(order.client_user_id) ?? '') : '';

		let total = sat_factura.type == 'POR_PERIODO' ? 0
			: ((order?.total || 0) - (order?.discount || 0)) || (payment_info?.payment.payment_amount || 0);

		let pdf_url = this.rest.getApiUrl() + '/getFacturaPdf.php?sat_factura_id=' + sat_factura.id;
		let xml_url = sat_factura.xml_attachment_id ? this.rest.getFilePath(sat_factura.xml_attachment_id, true) : '';

		return {
			...sat_factura, name_type, sat_cancelled, system_status, link, client_name, agent_name, total, pdf_url, xml_url
		};
	}

	checarFactura(sat_factura: CSatFacturaInfo): void
	{
		this.is_loading = true;
		this.modal_UUID = sat_factura.uuid;
		this.modal_factura_id = sat_factura.id;
		let auth_header = this.rest.getSessionHeaders().get('Authorization') || '';

		fetch(this.rest.getApiUrl() + '/checar_factura.php?sat_factura_id=' + sat_factura.id,
		{ headers: { Authorization: auth_header } })
		.then(response => response.json())
		.then(data =>
		{
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

	resendFactura(evt: Event): void
	{
		// Reenvío por correo: sin implementación en el frontend (se mantiene igual que el legado).
	}

	replayFactura(sat_factura: Sat_Factura): void
	{
		this.is_loading = true;

		this.subs.sink = this.rest.update('replayFactura', { id: sat_factura.id })
			.subscribe
			({
				next: (sat_factura2: any) =>
				{
					sat_factura.uuid = sat_factura2.uuid;
					this.is_loading = false;
				},
				error: (error: any) => this.showError(error)
			});
	}

	cancelarFactura(sat_factura: Sat_Factura): void
	{
		this.subs.sink = this.confirmation
			.showConfirmAlert(sat_factura, 'Cancelar Factura', '¿Estas seguro de cancelar esta factura?')
			.pipe
			(
				filter(result => result.accepted),
				mergeMap(() =>
				{
					this.is_loading = true;
					return this.rest.update('cancelar_factura', { sat_factura_id: sat_factura.id });
				}),
			)
			.subscribe
			({
				next: (_response) => this.showSuccess('La factura se cancelo correctamente'),
				error: (error) => this.showError(error)
			});
	}

	searchReport(): void
	{
		this.search(this.sat_factura_search);
	}

	export(): void
	{
		this.is_loading = true;

		this.subs.sink = this.rest_sat_factura.searchAll(this.sat_factura_search)
		.pipe
		(
			mergeMap((response: RestResponse<Sat_Factura>) =>
			{
				let payment_ids = response.data.map(f => f.payment_id).filter(id => id);

				let payment_obs = payment_ids.length > 0
					? this.rest_payment_info.search({ csv: { id: payment_ids } as any, limit: payment_ids.length })
					: of({ total: 0, data: [] } as RestResponse<PaymentInfo>);

				return forkJoin
				({
					sat_factura: of(response),
					payments: payment_obs
				});
			}),
			mergeMap((response) =>
			{
				let order_ids: number[] = response.sat_factura.data
					.map((f: Sat_Factura) => f.order_id)
					.filter((id): id is number => !!id);

				let payment_order_ids = response.payments.data
					.map((p: PaymentInfo) => p.movements?.[0]?.bank_movement_orders?.[0]?.order_id)
					.filter((id): id is number => !!id);

				order_ids.push(...payment_order_ids);

				let order_obs = order_ids.length > 0
					? this.rest_order.search({ csv: { id: order_ids }, limit: order_ids.length })
					: of({ total: 0, data: [] } as RestResponse<Order>);

				return forkJoin
				({
					sat_factura: of(response.sat_factura),
					payments: of(response.payments),
					orders: order_obs
				});
			}),
			mergeMap((response) =>
			{
				let client_ids: number[] = Array.from(new Set
				(
					response.orders.data
						.map((o: Order) => o.client_user_id)
						.filter((id): id is number => !!id)
				));

				let clients_obs = client_ids.length > 0
					? this.rest_user.search({ csv: { id: client_ids }, limit: client_ids.length })
					: of({ total: 0, data: [] } as RestResponse<CClient>);

				return forkJoin
				({
					sat_factura: of(response.sat_factura),
					payments: of(response.payments),
					orders: of(response.orders),
					clients: clients_obs
				});
			})
		)
		.subscribe
		({
			next: (response) =>
			{
				let agent_by_client = new Map<number, string>();
				response.clients.data.forEach((u: CClient) => agent_by_client.set(u.id, u.agent_name ?? ''));

				let factura_array = response.sat_factura.data
					.map((i: Sat_Factura) => this.getType(i, response.orders.data, response.payments.data, agent_by_client));

				let factura_valida_array = factura_array.filter(f => f.uuid);

				let rows = factura_valida_array.map(f =>
				({
					'ID': f.id,
					'Folio': f.folio || '',
					'Tipo': f.name_type,
					'Cliente': f.client_name || '',
					'Agente': f.agent_name || '',
					'Monto Total': f.total,
					'UUID': f.uuid,
					'Fecha': f.created,
					'Estatus': f.system_status,
					'Estatus CFDI': f.sat_cancelled,
				}));

				let headers = ['ID', 'Folio', 'Tipo', 'Cliente', 'Agente', 'Monto Total', 'UUID', 'Fecha', 'Estatus', 'Estatus CFDI'];
				ExcelUtils.array2xlsx(rows, 'Facturas.xlsx', headers);
				this.is_loading = false;
			},
			error: (error) =>
			{
				this.showError(error);
			}
		});
	}

	print(): void
	{
		this.rest.hideMenu?.();
		setTimeout(() => window.print(), 500);
	}
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';

import { BaseComponent } from '../../modules/shared/base/base.component';
import { LoadingComponent } from '../../components/loading/loading.component';
import { PaginationComponent } from '../../components/pagination/pagination.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { Rest, SearchObject } from '../../modules/shared/services/Rest';
import { Billing_Data, Order, Store } from '../../modules/shared/RestModels';
import { OrderInfo } from '../../modules/shared/Models';
import { Utils } from '../../modules/shared/Utils';

export interface CustomOrderInfo extends OrderInfo
{
	selected: boolean;
	total_pagar: number;
	store_name: string;
	cashier_name: string;
	client_display: string;
	facturado_display: string;
	status_display: string;
}

@Component({
	selector: 'app-facturar-ordenes-sin-cliente',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterModule, LoadingComponent, PaginationComponent, ModalComponent],
	templateUrl: './facturar-ordenes-sin-cliente.component.html',
	styleUrl: './facturar-ordenes-sin-cliente.component.css'
})
export class FacturarOrdenesSinClienteComponent extends BaseComponent implements OnInit
{
	order_search: SearchObject<Order> = this.getEmptySearch();
	order_info_array: CustomOrderInfo[] = [];
	store_array: Store[] = [];
	select_all: boolean = false;
	has_selected: boolean = false;
	selected_total: number = 0;
	start_date: string = '';
	end_date: string = '';

	rest_order_info: Rest<Order, OrderInfo> = this.rest.initRest<Order, OrderInfo>('order_info');
	rest_store: Rest<Store, Store> = this.rest.initRest<Store, Store>('store');
	rest_billing_data: Rest<Billing_Data, Billing_Data> = this.rest.initRest<Billing_Data, Billing_Data>('billing_data');

	billing_data_array: Billing_Data[] = [];
	show_facturar_modal: boolean = false;
	sat_forma_pago: string = '01';
	sat_metodo_pago: string = 'PUE';
	sat_serie: string = 'A';
	sat_uso_cfdi: string = 'S01';
	selected_billing_data_id: number | null = null;
	selected_count: number = 0;

	ngOnInit(): void
	{
		this.path = '/facturar-ordenes-sin-cliente';
		this.setTitle('Órdenes Sin Cliente');

		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((query_params) =>
			{
				this.is_loading = true;

				let fields = [
					'id', 'store_id', 'client_name', 'client_user_id', 'created', 'closed_timestamp',
					'status', 'paid_status', 'total', 'discount', 'amount_paid', 'facturado',
					'sat_factura_id', 'store_consecutive', 'cashier_user_id', 'facturacion_mode'
				];

				let extra_keys = ['start_timestamp', 'end_timestamp'];

				this.order_search = this.getSearch<Order>(query_params, fields, extra_keys);
				this.order_search.limit = this.page_size;
				this.current_page = this.order_search.page;

				//Solo ordenes sin cliente (publico general), el filtro siempre se fuerza
				// Mostrar solo: sin sat_factura, facturacion_mode != PER_PAYMENT, y totalmente pagadas
				this.order_search.is_null = ['client_user_id', 'sat_factura_id'];
				this.order_search.eq.paid_status = 'PAID' as any;
				this.order_search.different = { facturacion_mode: 'PER_PAYMENT' } as any;

				//Listado ligero, sin items
				this.order_search.search_extra['for_listing'] = 1;

				if( this.order_search.sort_order.length == 0 )
				{
					this.order_search.sort_order = ['id_DESC'];
				}

				//Sin filtros, solo ordenes de hoy (evita escaneos completos)
				if( !query_params.has('ge.created')
					&& !query_params.has('eq.status')
					&& !query_params.has('eq.store_id') )
				{
					let date = new Date();
					date.setHours(0);
					date.setMinutes(0);
					date.setSeconds(0);
					this.order_search.ge.created = date;
				}

				this.start_date = this.order_search.ge.created
					? Utils.getLocalMysqlStringFromDate(this.order_search.ge.created).replace(' ', 'T')
					: '';

				this.end_date = this.order_search.le.created
					? Utils.getLocalMysqlStringFromDate(this.order_search.le.created).replace(' ', 'T')
					: '';

				this.select_all = false;
				this.has_selected = false;

				let stores_observable = this.store_array.length > 0
					? of({ total: this.store_array.length, data: this.store_array })
					: this.rest_store.search({ eq: { sales_enabled: 1 }, sort_order: ['name_ASC'], limit: 999999 });

				let billing_observable = this.billing_data_array.length > 0
					? of({ total: this.billing_data_array.length, data: this.billing_data_array })
					: this.rest_billing_data.search({ limit: 999999 });

				return forkJoin
				({
					orders: this.rest_order_info.search(this.order_search),
					stores: stores_observable,
					billing: billing_observable
				});
			})
		)
		.subscribe
		({
			next: (responses) =>
			{
				this.store_array = responses.stores.data;
				this.billing_data_array = (responses as any).billing ? (responses as any).billing.data : this.billing_data_array;
				if (this.billing_data_array.length && !this.selected_billing_data_id) {
					this.selected_billing_data_id = this.billing_data_array[0].id;
				}
				// Default serie from first store if available
				if (this.store_array.length && (!this.sat_serie || this.sat_serie === 'A')) {
					const default_serie = (this.store_array[0] as any).default_sat_serie;
					if (default_serie) this.sat_serie = default_serie;
				}
				this.order_info_array = responses.orders.data.map(oi => this.getCustomOrderInfo(oi));
				this.selected_total = 0;
				this.selected_count = 0;
				this.select_all = false;
				this.setPages(this.current_page, responses.orders.total);
			},
			error: (error) =>
			{
				this.showError(error);
			}
		});
	}

	getCustomOrderInfo(order_info: OrderInfo): CustomOrderInfo
	{
		let status_dict: Record<string, string> = {
			'PENDING': 'Pendiente',
			'ACTIVE': 'Activa',
			'CLOSED': 'Cerrada',
			'CANCELLED': 'Cancelada'
		};

		return {
			...order_info,
			selected: false,
			total_pagar: order_info.order.total - order_info.order.discount,
			store_name: order_info.store?.name || '',
			cashier_name: order_info.cashier?.name || '',
			client_display: order_info.order.client_name || 'PÚBLICO GENERAL',
			facturado_display: (order_info.order.facturado == 'YES' || !!order_info.order.sat_factura_id) ? 'Sí' : 'No',
			status_display: status_dict[order_info.order.status] || order_info.order.status
		};
	}

	onSelectAllCheckbox(event: Event)
	{
		let checkbox = event.target as HTMLInputElement;
		this.select_all = checkbox.checked;

		for( let order_info of this.order_info_array )
		{
			if( order_info.order.status == 'CANCELLED' )
				continue;

			order_info.selected = this.select_all;
		}

		this.recalculateSelectedTotal();
	}

	onSelectOrder(event: Event, order_info: CustomOrderInfo)
	{
		order_info.selected = !order_info.selected;
		this.select_all = this.order_info_array.length > 0
			&& this.order_info_array.every(oi => oi.selected || oi.order.status == 'CANCELLED');
		this.recalculateSelectedTotal();
	}

	recalculateSelectedTotal()
	{
		this.has_selected = this.order_info_array.some(oi => oi.selected);
		this.selected_total = this.order_info_array
			.filter(oi => oi.selected)
			.reduce((prev, oi) => prev + oi.total_pagar, 0);
		this.selected_count = this.order_info_array.filter(oi => oi.selected).length;
	}

	facturar()
	{
		let selected_order_array = this.order_info_array.filter(oi => oi.selected);

		if( selected_order_array.length == 0 )
		{
			this.showError('Selecciona al menos una orden para facturar');
			return;
		}

		// Open modal to let user choose payment method, serie, etc.
		this.show_facturar_modal = true;
	}

	confirmFacturar()
	{
		let selected_order_array = this.order_info_array.filter(oi => oi.selected);

		if( selected_order_array.length == 0 )
		{
			this.showError('Selecciona al menos una orden para facturar');
			return;
		}

		if (!this.selected_billing_data_id) {
			this.showError('Selecciona las credenciales de facturación');
			return;
		}

		this.show_facturar_modal = false;
		this.is_loading = true;

		let payload: any = {
			order_ids: selected_order_array.map(oi => oi.order.id).join(','),
			billing_data_id: this.selected_billing_data_id,
			sat_forma_de_pago: this.sat_forma_pago,
			sat_metodo_de_pago: this.sat_metodo_pago,
			sat_serie: this.sat_serie,
			sat_uso_cfdi: this.sat_uso_cfdi
		};

		this.subs.sink = this.rest.updatePath('facturaMultipleSinCliente', payload)
		.subscribe
		({
			next: () =>
			{
				this.is_loading = false;
				this.showSuccess('Facturado correctamente');
				this.search(this.order_search);
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}
}
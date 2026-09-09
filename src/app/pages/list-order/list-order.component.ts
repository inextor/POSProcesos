import { Component, Injector, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, from, Observable, of } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';
import { SearchObject, Rest, RestResponse, RestSimple } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Currency, Order, Payment, Price_Type, Store, User } from '../../modules/shared/RestModels';
import { OrderInfo, OrderItemInfo, PaymentInfo } from '../../modules/shared/Models';
import { Utils } from '../../modules/shared/Utils';
import { ExcelUtils } from '../../classes/ExcelUtils';
import { LoadingComponent } from '../../components/loading/loading.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { PaginationComponent } from '../../components/pagination/pagination.component';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';

interface COrder extends Order
{
	to_prepare: '' | '1' | null;
	total_final: number | null;
	paid_to_user_id: number | null;
	payment_currency_id: string | null;
	name: string | null;
	zipcode: string | null;
	type: string | null;
}

export interface CustomOrderInfo extends OrderInfo
{
	article_discount: number;
	price_name: string;
	pdf_url: string;
	client_display: string;
	store_display: string;
	cashier_display: string;
	total_after_discount: number;
	total_discount: number;
	facturado_display: string;
}

@Component({
	selector: 'app-list-order',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		RouterModule,
		LoadingComponent,
		ModalComponent,
		PaginationComponent,
		ShortDatePipe
	],
	templateUrl: './list-order.component.html',
	styleUrl: './list-order.component.css'
})
export class ListOrderComponent extends BaseComponent implements OnInit
{
	order_search: SearchObject<COrder> = this.getEmptySearch();
	order_info_array: CustomOrderInfo[] = [];
	store_array: Store[] = [];
	price_type_array: Price_Type[] = [];
	currency_array: Currency[] = [];
	cashier_user_array: User[] = [];
	store_dictionary: Record<number, Store | undefined> = {};
	price_type_dic: Record<number, Price_Type> = {};
	order_total: number = 0;
	total_descuentos: number = 0;
	selected_order_info: OrderInfo | null = null;
	fecha_inicial: string = '';
	fecha_final: string = '';
	show_advanced_search: boolean = false;
	show_cancel_order: boolean = false;
	cancellation_reason: string = '';
	client_user: User | null = null;
	agent_user: User | null = null;
	show_export_modal: boolean = false;
	export_message: string = '';

	rest_order_info: Rest<COrder, OrderInfo> = this.rest.initRest<COrder, OrderInfo>('order_info');
	rest_store: RestSimple<Store> = this.rest.initRestSimple<Store>('store');
	rest_user: RestSimple<User> = this.rest.initRestSimple<User>('user');
	rest_currency: RestSimple<Currency> = this.rest.initRestSimple<Currency>('currency');
	rest_payment_info: Rest<Payment, PaymentInfo> = this.rest.initRest<Payment, PaymentInfo>('payment_info');
	rest_order_report: RestSimple<any> = this.rest.initRestSimple<any>('order_report');

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit()
	{
		this.path = '/list-order';

		this.subs.sink = this.rest.updates
		.pipe
		(
			filter((message) =>
			{
				if (!this.rest.user_permission.view_commandas)
					return false;

				if (message.id)
				{
					if (this.order_info_array.some(order_info => message.id == order_info.order.id))
						return true;
				}

				return message.type == 'order' && this.order_search.page == 0;
			}),
			mergeMap((message) => this.rest_order_info.get(message.id as number))
		)
		.subscribe((order_info) =>
		{
			if (this.rest.user && order_info.order.store_id == this.rest.user.store_id)
			{
				this.search(this.order_search);
			}
		});

		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((query_params) =>
			{
				let fields = [
					'address', 'amount_paid', 'cashier_user_id', 'city', 'client_name', 'client_user_id',
					'created', 'created_by_user_id', 'delivery_status', 'facturacion_code', 'facturado',
					'id', 'name', 'paid_status', 'paid_to_user_id', 'price_type_id', 'sat_factura_id',
					'sat_razon_social', 'shipping_address_id', 'state', 'status', 'store_consecutive',
					'store_id', 'subtotal', 'suburb', 'tax', 'to_prepare', 'total', 'total_final', 'type', 'updated',
					'updated_by_user_id', 'zipcode', 'payment_currency_id', 'sat_serie', 'sat_serie_consecutive'
				];

				let extra_keys: Array<string> =
				[
					'transaction_type', 'publico_general', 'advanced_search', 'total_final',
					'with_discounts', 'agent_user_id', 'start_timestamp', 'end_timestamp'
				];

				let order_search: SearchObject<COrder> = this.getSearch(query_params, fields, extra_keys);

				this.client_user = null;
				this.setTitle('Ordenes');
				this.is_loading = true;
				order_search.limit = this.page_size;
				this.current_page = this.order_search.page;

				if (!order_search?.eq?.client_user_id && !this.rest.user_permission.list_orders)
				{
					order_search.limit = 1;
					order_search.page = 0;
					this.current_page = 0;
				}

				if (order_search.sort_order.length == 0)
				{
					order_search.sort_order = ['id_DESC'];
				}

				if (order_search.eq.to_prepare)
				{
					order_search.search_extra['for_listing'] = null;
				}
				else
				{
					order_search.search_extra['for_listing'] = 1;
				}

				this.show_advanced_search = !!order_search.search_extra['advanced_search'];

				if (!(order_search.eq.price_type_id))
					order_search.eq.price_type_id = null as unknown as number;

				if (order_search.search_extra['publico_general'])
				{
					order_search.is_null = ['client_user_id'];
				}
				else
				{
					order_search.is_null = [];
				}

				if (!this.rest.user_permission.global_pos && this.rest.user?.store_id)
				{
					order_search.eq.store_id = this.rest.user.store_id;
				}

				let add_fecha = !(
					query_params.has('ge.status') ||
					query_params.has('eq.client_user_id') ||
					query_params.has('client_name') ||
					query_params.has('search_extra.start_timestamp') ||
					query_params.has('eq.store_consecutive')
				);

				if (add_fecha)
				{
					let date = new Date();
					date.setHours(0);
					date.setMinutes(0);
					date.setSeconds(0);
					order_search.search_extra['start_timestamp'] = date;
				}

				if (order_search.search_extra['start_timestamp'])
				{
					this.fecha_inicial = Utils.getLocalMysqlStringFromDate(order_search.search_extra['start_timestamp'] as Date).replace(' ', 'T');
				}
				else
				{
					this.fecha_inicial = '';
				}

				if (order_search.search_extra['end_timestamp'])
				{
					this.fecha_final = Utils.getLocalMysqlStringFromDate(order_search.search_extra['end_timestamp'] as Date).replace(' ', 'T');
				}
				else
				{
					this.fecha_final = '';
				}

				order_search.search_extra['hades'] = this.rest.has_hades ? 1 : null;

				this.order_search = order_search;

				return forkJoin
				({
					orders: this.rest_order_info.search(this.order_search),
					user: this.order_search.eq.client_user_id
						? this.rest_user.get(this.order_search.eq.client_user_id)
						: of(null),
					agent: this.order_search.search_extra['agent_user_id']
						? this.rest_user.get(this.order_search.search_extra['agent_user_id'] as number)
						: of(null)
				});
			}),
			mergeMap((response) =>
			{
				this.client_user = response.user;

				let tmp_total = response.orders.data.reduce((p, c) => p + c.order.total, 0);

				let store_obs = this.store_array.length > 0
					? of({ data: this.store_array, total: this.store_array.length })
					: this.rest_store.search({ limit: 999999, eq: { status: 'ACTIVE' } as any, sort_order: ['name_ASC'] });

				let cashier_user_obs = this.cashier_user_array.length > 0
					? of({ data: this.cashier_user_array, total: this.cashier_user_array.length } as RestResponse<User>)
					: this.rest_user.search
					({
						limit: 9999, eq: { type: 'USER' } as any,
						sort_order: ['name_ASC'],
						search_extra: { 'user_permission.pos': 1 }
					});

				let currency_obs = this.currency_array.length > 0
					? of({ data: this.currency_array, total: this.currency_array.length })
					: this.rest_currency.search({ limit: 99999, sort_order: ['name_ASC'] });

				return forkJoin
				({
					order: of(response.orders),
					store: store_obs,
					price_type: this.rest.getPriceTypes(true),
					users: cashier_user_obs,
					currencies: currency_obs,
					order_total: !this.rest.user_permission.reports ? of({ total: tmp_total, data: [] }) : this.getOrderTotal(this.order_search),
					user: of(response.user),
					agent: of(response.agent)
				});
			})
		)
		.subscribe
		({
			next: (responses) =>
			{
				this.is_loading = false;
				this.client_user = responses.user;
				responses.store.data.forEach(store => this.store_dictionary[store.id] = store);
				responses.price_type.data.forEach(price_type => this.price_type_dic[price_type.id] = price_type);
				this.store_array = responses.store.data;
				this.currency_array = responses.currencies.data;

				this.cashier_user_array = responses.users.data.map((user: User) =>
				{
					if (user.username?.toLowerCase()?.localeCompare(user?.name?.toLowerCase()) != 0)
					{
						user.name = user.name + ' (' + user.username + ')';
					}
					return user;
				});

				this.price_type_array = responses.price_type.data;
				this.order_total = responses.order_total.total;
				this.order_info_array = responses.order.data.map(oi => this.getCustomOrderInfo(oi));
				this.total_descuentos = this.order_info_array.reduce((prev, oi) => prev + oi.order.discount + oi.article_discount, 0);
				this.agent_user = responses.agent;

				this.setPages(this.order_search.page, responses.order.total);
			},
			error: (error) =>
			{
				this.showError(error);
			}
		});
	}

	getOrderTotal(search: SearchObject<COrder>): Observable<{ total: number, data: any[] }>
	{
		let new_search = { ...search };
		new_search.search_extra = { ...search.search_extra };

		return this.rest_order_report.search(new_search).pipe
		(
			mergeMap((response: RestResponse<any>) =>
			{
				return of
				({
					total: response.data.length ? response.data[0].grand_total : 0,
					data: []
				});
			})
		);
	}

	confirmReadyToPickup(order_info: OrderInfo)
	{
		this.subs.sink = this.confirmation.showConfirmAlert(order_info
			, 'Marcar Como Listo para recoger'
			, 'Esta seguro de querer marcar la orden como preparada y lista para recoger'
		)
		.subscribe((response) =>
		{
			if (response.accepted)
			{
				this.subs.sink = this.rest
				.update('updateOrderDeliveryStatus', { order_id: order_info.order.id, delivery_status: 'READY_TO_PICKUP' })
				.subscribe(() =>
				{
					order_info.order.delivery_status = 'READY_TO_PICKUP';
					this.rest.sendNotification('order', order_info.order.id);
					this.showSuccess('La orden se marco como lista para recoger');
				}, (error) => this.showError(error));
			}
		});
	}

	confirmSend(order_info: OrderInfo)
	{
		this.subs.sink = this.confirmation.showConfirmAlert
		(
			order_info,
			'Marcar Como Enviado',
			'Esta seguro de querer marcar la orden como enviada'
		)
		.subscribe((response) =>
		{
			if (response.accepted)
			{
				this.subs.sink = this.rest
				.update('updateOrderDeliveryStatus', { order_id: order_info.order.id, delivery_status: 'SENT' })
				.subscribe(() =>
				{
					order_info.order.delivery_status = 'SENT';
					this.showSuccess('La orden se marco como enviada');
					this.rest.sendNotification('order', order_info.order.id);
				}, (error) => this.showError(error));
			}
		});
	}

	confirmDelivered(order_info: OrderInfo)
	{
		this.selected_order_info = order_info;
		this.subs.sink = this.confirmation.showConfirmAlert
		(
			order_info,
			'Marcar Como Entregado',
			'Esta seguro de querer marcar la orden como Entregada'
		)
		.subscribe((response) =>
		{
			if (response.accepted)
			{
				this.is_loading = true;
				this.subs.sink = this.rest
				.update('updateOrderDeliveryStatus', { order_id: order_info.order.id, delivery_status: 'DELIVERED' })
				.subscribe(() =>
				{
					this.is_loading = false;
					this.rest.sendNotification('order', order_info.order.id);
					order_info.order.delivery_status = 'DELIVERED';
				}, (error) => { this.showError(error); });
			}
		});
	}

	togglePublicoGeneral(evt: Event)
	{
		let checkbox: HTMLInputElement = evt.target as HTMLInputElement;
		let eq = this.order_search.eq as any;

		if (!checkbox.checked)
		{
			eq.price_type_id = null;
		}

		this.order_search.search_extra['publico_general'] = checkbox.checked ? '1' : null;
	}

	override search(search_object: SearchObject<COrder>)
	{
		if (!this.show_advanced_search)
		{
			super.search({
				eq: { store_id: search_object.eq.store_id, client_user_id: search_object.eq.client_user_id || null },
				ge: { created: search_object.ge.created },
				le: { created: search_object.le.created },
				search_extra: {
					agent_user_id: search_object.search_extra['agent_user_id'] || null,
					total_final: search_object.search_extra['total_final'],
					advanced_search: (this.show_advanced_search ? '1' : ''),
					start_timestamp: search_object.search_extra['start_timestamp'],
					end_timestamp: search_object.search_extra['end_timestamp']
				}
			});
			return;
		}

		search_object.csv.status = [];
		if (this.show_advanced_search)
			search_object.search_extra['advanced_search'] = 1;

		super.search(search_object);
	}

	confirmCancel(order_info: OrderInfo)
	{
		this.show_cancel_order = true;
		this.selected_order_info = order_info;
	}

	exportOrders(_evt: Event)
	{
		let search: SearchObject<Order> = { ...this.order_search };
		search.limit = 100;

		let status_dict: Record<string, string> = {
			'PENDING': 'Pendiente',
			'ACTIVE': 'Activa',
			'CANCELLED': 'Cancelada',
			'CLOSED': 'Cerrada',
		};

		this.show_export_modal = true;
		this.export_message = 'Descargando...';

		this.subs.sink = this.rest_order_info
		.searchAll(search as SearchObject<COrder>, 100)
		.subscribe((response) =>
		{
			this.show_export_modal = false;

			let payment_method: Record<string, string> = {
				'01': 'Efectivo',
				'02': 'Cheque',
				'04': 'T. Credito',
				'05': 'Monedero Electrónico',
				'28': 'T. Debito',
				'03': 'Transferencia',
				'99': 'Credito',
			};

			let cdate = Utils.getLocalMysqlStringFromDate(new Date()).substring(0, 10);

			let array = response.data.map((order_info: OrderInfo) =>
			{
				let s = order_info.order.sat_forma_pago && order_info.order.sat_forma_pago in payment_method ? payment_method[order_info.order.sat_forma_pago] : 'Por Definir';
				return {
					'Id': order_info.order.id,
					'Cliente': order_info?.client?.name || order_info.order.client_name,
					'Total': order_info.order.total,
					'Pagado': order_info.order.amount_paid,
					'Sucursal': order_info.store.name,
					'Folio': order_info.order.store_consecutive,
					'Fecha': Utils.getLocalMysqlStringFromDate(order_info.order?.system_activated ? order_info.order.system_activated : order_info.order.created).substring(0, 10),
					'Estatus': status_dict[order_info.order.status],
					'Facturado': order_info.order.sat_factura_id ? 'Si' : 'No',
					'Pago': s
				};
			});
			ExcelUtils.array2xlsx(array, 'orders-' + cdate + '.xlsx', ['Id', 'Cliente', 'Total', 'Pagado', 'Sucursal', 'Folio', 'Facturado', 'Fecha', 'Pago', 'Estatus']);
		}, (error) =>
		{
			this.show_export_modal = false;
			this.showError(error);
		});
	}

	exportOrdersWithItems(_evt: Event)
	{
		let search: SearchObject<Order> = { ...this.order_search };
		search.limit = 100;

		let status_dict: Record<string, string> = {
			'PENDING': 'Pendiente',
			'ACTIVE': 'Activa',
			'CANCELLED': 'Cancelada',
			'CLOSED': 'Cerrada',
		};

		this.show_export_modal = true;
		this.export_message = 'Descargando...';

		this.subs.sink = this.rest_order_info
		.searchAll(search as SearchObject<COrder>, 100).pipe
		(
			mergeMap((all: RestResponse<OrderInfo>) =>
			{
				let order_ids = all.data.map(oi => oi.order.id);
				let payment_observables: Observable<RestResponse<PaymentInfo>>[] = [];

				while (order_ids.length)
				{
					let ids = order_ids.splice(0, 100);

					let search: SearchObject<Payment> = this.getEmptySearch();
					search.search_extra = { order_id: ids.join(',') };
					search.limit = 9999;
					payment_observables.push(this.rest_payment_info.search(search));
				}

				if (payment_observables.length == 0)
				{
					return of
					({
						payments: [],
						orders: all
					});
				}

				return forkJoin
				({
					payments: forkJoin(payment_observables),
					orders: of(all)
				});
			})
		)
		.subscribe((response) =>
		{
			let payment_maps = this.getPaymentByOrderIdMap(response.payments);
			let cdate = Utils.getLocalMysqlStringFromDate(new Date()).substring(0, 10);
			let rows: object[] = [];
			let a = '';

			let empty_obj = {
				'Id': a,
				'Cliente': a,
				'Total': a,
				'Pagado': a,
				'Sucursal': a,
				'Folio': a,
				'Fecha': a,
				'Estatus': a,
				'Facturado': a,
				'Método de Pago': a
			};

			for (let order_info of response.orders.data)
			{
				let id = order_info.order.id;
				let cliente = order_info?.client?.name || order_info.order.client_name;
				let total = order_info.order.total;
				let pagado = order_info.order.amount_paid;
				let sucursal = order_info.store.name;
				let folio = order_info.order.store_consecutive;
				let fecha = Utils.getLocalMysqlStringFromDate(order_info.order?.system_activated ? order_info.order.system_activated : order_info.order.created).substring(0, 10);
				let estatus = status_dict[order_info.order.status];
				let facturado = order_info.order.sat_factura_id ? 'Si' : 'No';
				let payments = payment_maps.get(id);
				let metodo_pago = this.getPaymentMethodsString(payments, order_info);

				let order_obj = {
					'Id': id,
					'Cliente': cliente,
					'Total': total,
					'Pagado': pagado,
					'Sucursal': sucursal,
					'Folio': folio,
					'Fecha': fecha,
					'Estatus': estatus,
					'Facturado': facturado,
					'Método de Pago': metodo_pago
				};

				if (order_info.items && order_info.items.length > 0)
				{
					let i = 0;
					for (let item_info of order_info.items)
					{
						let item_obj = {
							'Articulo': item_info.item?.name || '',
							'Categoria': item_info.category?.name || '',
							'Cantidad': item_info.order_item.qty,
							'Precio Unitario': item_info.order_item.unitary_price,
							'Subtotal Item': item_info.order_item.subtotal,
							'Impuesto Item': item_info.order_item.tax,
							'Total Item': item_info.order_item.total
						};

						if (i == 0)
						{
							rows.push({ ...order_obj, ...item_obj });
							i++;
						}
						else
						{
							rows.push({ ...empty_obj, ...item_obj });
						}
					}
				}
				else
				{
					let item_obj = {
						'Articulo': a,
						'Categoria': a,
						'Cantidad': a,
						'Precio Unitario': a,
						'Subtotal Item': a,
						'Impuesto Item': a,
						'Total Item': a
					};
					rows.push({ ...order_obj, ...item_obj });
				}
			}

			ExcelUtils.array2xlsx(
				rows,
				'orders-items-' + cdate + '.xlsx',
				['Id', 'Cliente', 'Total', 'Pagado', 'Sucursal', 'Folio', 'Fecha', 'Estatus', 'Facturado', 'Método de Pago', 'Articulo', 'Categoria', 'Cantidad', 'Precio Unitario', 'Subtotal Item', 'Impuesto Item', 'Total Item']
			);
			this.show_export_modal = false;
		}, (error) =>
		{
			this.show_export_modal = false;
			this.showError(error);
		});
	}

	exportOrdersDetails(_evt: Event)
	{
		let search: SearchObject<Order> = { ...this.order_search };
		search.limit = 100;

		let status_dict: Record<string, string> = {
			'PENDING': 'Pendiente',
			'ACTIVE': 'Activa',
			'CANCELLED': 'Cancelada',
			'CLOSED': 'Cerrada',
		};

		this.show_export_modal = true;
		this.export_message = 'Descargando...';

		this.subs.sink = this.rest_order_info
		.searchAll(search as SearchObject<COrder>, 100).pipe
		(
			mergeMap((all: RestResponse<OrderInfo>) =>
			{
				let order_ids = all.data.map(oi => oi.order.id);
				let payment_observables: Observable<RestResponse<PaymentInfo>>[] = [];

				while (order_ids.length)
				{
					let ids = order_ids.splice(0, 100);

					let search: SearchObject<Payment> = this.getEmptySearch();
					search.search_extra = { order_id: ids.join(',') };
					search.limit = 100;
					payment_observables.push(this.rest_payment_info.search(search));
				}

				if (payment_observables.length == 0)
				{
					return of
					({
						payments: [],
						orders: all
					});
				}

				return forkJoin
				({
					payments: forkJoin(payment_observables),
					orders: of(all)
				});
			})
		)
		.subscribe((response) =>
		{
			let payment_maps = this.getPaymentByOrderIdMap(response.payments);
			let cdate = Utils.getLocalMysqlStringFromDate(new Date()).substring(0, 10);
			let rows: object[] = [];
			let a = '';
			let empty_obj = {
				'Id': a,
				'Cliente': a,
				'Cliente Id': a,
				'Total': a,
				'Descuento Orden': a,
				'Descuento Articulos': a,
				'Pagado': a,
				'Sucursal': a,
				'Creacion': a,
				'Activación': a,
				'Cerrada': a,
				'Estatus': a,
				'Facturado': a
			};

			for (let order_info of response.orders.data)
			{
				let id = order_info.order.id;
				let client = order_info?.client?.name || order_info.order.client_name;
				let client_id = order_info?.client?.id || '';
				let total = order_info.order.total;
				let pagado = order_info.order.amount_paid;
				let sucursal = order_info.store.name;
				let fecha = Utils.getLocalMysqlStringFromDate(order_info.order.created);
				let activacion = order_info.order.system_activated ? Utils.getLocalMysqlStringFromDate(order_info.order.system_activated) : '';
				let cerrada = order_info.order.closed_timestamp ? Utils.getLocalMysqlStringFromDate(order_info.order.closed_timestamp) : '';
				let estatus = status_dict[order_info.order.status];
				let facturado = order_info.order.sat_factura_id ? 'Si' : 'No';
				let payments = payment_maps.get(id);

				let order_obj = {
					'Id': id,
					'Cliente': client,
					'Cliente Id': client_id,
					'Total': total,
					'Descuento Orden': order_info.order.discount,
					'Descuento Articulos': this.getArticleDiscount(order_info.items, order_info.order.tax_percent),
					'Pagado': pagado,
					'Sucursal': sucursal,
					'Creacion': fecha,
					'Activación': activacion,
					'Cerrada': cerrada,
					'Estatus': estatus,
					'Facturado': facturado
				};

				let payment_objs = payments ? this.getPaymentObject(payments, order_info) : [];

				let i = 0;

				for (let po of payment_objs)
				{
					if (i == 0)
					{
						rows.push({ ...order_obj, ...po });
						i++;
					}
					else
					{
						rows.push({ ...empty_obj, ...po });
					}
				}
			}

			ExcelUtils.array2xlsx(rows, 'orders-' + cdate + '.xlsx', ['Id', 'Cliente', 'Cliente Id', 'Total', 'Descuento Orden', 'Descuento Articulos', 'Pagado', 'Sucursal', 'Creacion', 'Activación', 'Cerrada', 'Estatus', 'Facturado', 'ID Pago', 'Total Ingreso', 'Cantidad Pago', 'Fecha Pago', 'Tipo de Cambio', 'Tipo Transaccion', 'Cantidad Saldada', 'Referencia Bancaria', 'Registro Pago UTC', 'Registro Pago Local']);
			this.show_export_modal = false;
		}, (error) =>
		{
			this.show_export_modal = false;
			this.showError(error);
		});
	}

	getPaymentObject(pi_array: PaymentInfo[], order_info: OrderInfo): object[]
	{
		let rows: Record<string, string | number | null>[] = [];

		type FOO = string | number | null;

		for (let payment_info of pi_array)
		{
			for (let bm of payment_info.movements)
			{
				let bmo_array = bm.bank_movement_orders.filter(bmo => bmo.order_id == order_info.order.id);

				let ingreso_currency: FOO = bm.bank_movement.currency_id;
				let ingreso_amount: FOO = bm.bank_movement.amount_received;
				let referencia_bancaria: FOO = bm.bank_movement.reference;
				let tipo_transaccion = this.getTransactionType(bm.bank_movement.transaction_type);

				for (let bmo of bmo_array)
				{
					rows.push
					({
						'ID Pago': payment_info.payment.id,
						'Total Ingreso': ingreso_amount + ' ' + ingreso_currency,
						'Cantidad Pago': bmo.currency_amount + ' ' + ingreso_currency,
						'Fecha Pago': bm.bank_movement.paid_date || '',
						'Tipo de Cambio': bmo.exchange_rate,
						'Tipo Transaccion': tipo_transaccion,
						'Cantidad Saldada': bmo.amount + ' ' + order_info.order.currency_id,
						'Referencia Bancaria': referencia_bancaria,
						'Registro Pago UTC': Utils.getUTCMysqlStringFromDate(bm.bank_movement.created),
						'Registro Pago Local': Utils.getLocalMysqlStringFromDate(bm.bank_movement.created),
					});
				}
			}
		}

		if (rows.length == 0)
		{
			let a = '';
			rows.push
			({
				'ID Pago': a,
				'Total Ingreso': a,
				'Cantidad Pago': a,
				'Fecha Pago': a,
				'Tipo de Cambio': a,
				'Tipo Transaccion': a,
				'Cantidad Saldada': a,
				'Referencia Bancaria': a,
				'Registro Pago UTC': a,
				'Registro Pago Local': a
			});
		}

		return rows;
	}

	getTransactionType(str: string): string
	{
		switch (str)
		{
			case 'CASH': return 'Efectivo';
			case 'CREDIT_CARD': return 'Tarjeta Crédito';
			case 'DEBIT_CARD': return 'Tarjeta Débito';
			case 'CHECK': return 'Cheque';
			case 'COUPON': return 'Cupón';
			case 'TRANSFER': return 'Transferencia';
			case 'DISCOUNT': return '';
			case 'RETURN_DISCOUNT': return 'RETORNO';
			case 'PAYPAL': return 'PAYPAL';
		}

		return 'OTRO';
	}

	getPaymentMethodsString(pi_array: PaymentInfo[] | undefined, order_info: OrderInfo): string
	{
		if (!pi_array || pi_array.length == 0)
		{
			return '';
		}

		let payment_methods = new Set<string>();

		for (let payment_info of pi_array)
		{
			for (let movement_info of payment_info.movements)
			{
				let has_this_order = movement_info.bank_movement_orders?.some(bmo => bmo.order_id == order_info.order.id);

				if (has_this_order)
				{
					let tipo_transaccion = this.getTransactionType(movement_info.bank_movement.transaction_type);

					if (tipo_transaccion)
					{
						payment_methods.add(tipo_transaccion);
					}
				}
			}
		}

		return Array.from(payment_methods).join(', ');
	}

	getPaymentByOrderIdMap(payment_responses: RestResponse<PaymentInfo>[]): Map<number, PaymentInfo[]>
	{
		let payment_maps = new Map<number, PaymentInfo[]>();

		for (let pr of payment_responses)
		{
			for (let payment_info of pr.data)
			{
				let o_ids = new Map<number, number>();

				for (let bmi of payment_info.movements)
				{
					bmi.bank_movement_orders.forEach(bmo => o_ids.set(bmo.order_id, bmo.order_id));
				}

				let order_ids = Array.from(o_ids.keys());

				for (let id of order_ids)
				{
					if (!payment_maps.has(id))
					{
						payment_maps.set(id, []);
					}

					payment_maps.get(id)?.push(payment_info);
				}
			}
		}
		return payment_maps;
	}

	fechaIncialChange(fecha: string)
	{
		this.fecha_inicial = fecha;
		if (fecha)
		{
			this.order_search.search_extra['start_timestamp'] = Utils.getDateFromLocalMysqlString(fecha);
		}
		else
		{
			this.order_search.search_extra['start_timestamp'] = null;
		}
	}

	fechaFinalChange(fecha: string)
	{
		this.fecha_final = fecha;
		if (fecha)
		{
			this.order_search.search_extra['end_timestamp'] = Utils.getDateFromLocalMysqlString(fecha);
		}
		else
		{
			this.order_search.search_extra['end_timestamp'] = null;
		}
	}

	confirmAddStockToStore(order_info: OrderInfo)
	{
		let store = this.store_array.find((store) => store.id == order_info.client?.store_id);
		let msg = 'Estas seguro de querer agregar el inventario la orden a una sucursal' + store?.name;
		let title = 'Agregar Inventario a "' + store?.name + '"';

		this.subs.sink = this.confirmation
		.showConfirmAlert
		(
			order_info,
			title,
			msg,
		)
		.subscribe((response) =>
		{
			if (response.accepted)
			{
				this.is_loading = true;
				this.subs.sink = this.rest.update
				(
					'addStockToStoreFromClientOrder',
					{ order_id: order_info.order.id }
				)
				.subscribe
				(
					() =>
					{
						this.is_loading = false;
						this.showSuccess('Se agrego el inventario a la sucursal');
					},
					(error) => { this.showError(error); }
				);
			}
		});
	}

	getCustomOrderInfo(order_info: OrderInfo): CustomOrderInfo
	{
		let article_discount = this.getArticleDiscount(order_info.items, order_info.order.tax_percent);

		let price_name = this.price_type_array.find(pt => pt.id == order_info.order.price_type_id)?.name || '';
		let pdf_url = '';

		if (order_info.order.sat_pdf_attachment_id)
		{
			pdf_url = this.rest.getFilePath(order_info.order.sat_pdf_attachment_id);
		}

		return {
			...order_info,
			article_discount,
			price_name,
			pdf_url,
			client_display: (order_info?.client?.name || order_info.order.client_name || '').toUpperCase(),
			store_display: order_info.store?.name ? this.toTitleCase(order_info.store.name) : '',
			cashier_display: order_info?.cashier?.name ? this.toTitleCase(order_info.cashier.name) : '',
			total_after_discount: order_info.order.total - order_info.order.discount,
			total_discount: order_info.order.discount + article_discount,
			facturado_display: order_info.order.sat_factura_id ? 'Si' : 'No'
		};
	}

	toTitleCase(str: string): string
	{
		return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
	}

	getArticleDiscount(order_item_infos: OrderItemInfo[], tax_percent: number)
	{
		return order_item_infos.reduce((prev, oi) =>
		{
			if (oi.order_item.original_unitary_price >= oi.order_item.unitary_price_meta)
				return prev;

			let tax = oi.order_item.tax == 0 ? 0 : tax_percent;

			if (tax == 0)
				return prev + (oi.order_item.unitary_price_meta - oi.order_item.original_unitary_price) * oi.order_item.qty;

			let does_price_include_tax = oi.order_item.original_unitary_price > (oi.order_item.unitary_price + 0.001);
			let price_with_tax = does_price_include_tax ? oi.order_item.unitary_price_meta : (oi.order_item.unitary_price_meta * (1 + tax_percent));
			let original_total = oi.order_item.qty * price_with_tax;

			return prev + (original_total - oi.order_item.total);
		}, 0);
	}

	toggleAdvancedSearch(evt: Event)
	{
		let input = evt.target as HTMLInputElement;
		this.show_advanced_search = input.checked;
	}

	loadLastOrders()
	{
		this.subs.sink = this.rest_order_info
		.search({ eq: { status: 'CLOSED' } as any, limit: 20, sort_order: ['created_DESC'] })
		.subscribe((response) =>
		{
			this.order_info_array = response.data.map(oi => this.getCustomOrderInfo(oi));
		});
	}

	cancelOrderWithMessage(evt: Event)
	{
		evt.preventDefault();

		if (this.cancellation_reason.trim() == '')
		{
			this.showError('La razon de cancelar no puede estar vacia');
			return;
		}

		if (!this.selected_order_info)
			return;

		this.is_loading = true;

		this.subs.sink = this.rest
		.update('cancelOrder', { order_id: this.selected_order_info.order.id, cancellation_reason: this.cancellation_reason })
		.subscribe
		(
			() =>
			{
				this.is_loading = false;
				if (this.selected_order_info)
				{
					this.selected_order_info.order.status = 'CANCELLED';
					this.rest.sendNotification('order', this.selected_order_info.order.id);
				}
				this.show_cancel_order = false;
				this.cancellation_reason = '';
				this.showSuccess('La orden se cancelo exitosamente');
			},
			(error) => { this.showError(error); }
		);
	}

	clickOnHeader(_header: string)
	{
		this.sort('total_final', this.order_search);
	}

	showCancelOrderModal(order_info: OrderInfo)
	{
		this.selected_order_info = order_info;
		this.show_cancel_order = true;
	}
}

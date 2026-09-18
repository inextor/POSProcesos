import { Component, Injector, OnInit, QueryList, ViewChild, ViewChildren, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { firstValueFrom, forkJoin, from, fromEvent, Observable, of, Subject } from 'rxjs';
import { User, Item, Stock_Record, Order, Fund, Item_Exception, Currency_Rate, Order_Item, Currency, Offer, Batch_Record, Order_Item_Batch } from '../../modules/shared/RestModels';
import { Price_Type, Store } from '../../modules/shared/RestModels';
import { Address, Category, Price, Table, Printer, Ticket, User_Permission } from '../../modules/shared/RestModels';
import { ItemInfo, ItemOptionValueInfo, OrderInfo, OrderItemInfo, PaymentInfo } from '../../modules/shared/Models';
import { Utils } from '../../modules/shared/Utils';
import { KeyboardShortcutEvent } from '../../modules/shared/services/shortcuts.service';
import { ShortcutsService } from '../../modules/shared/services/shortcuts.service';
import { debounceTime, filter, mergeMap } from 'rxjs/operators';
import { NavigationEnd, ParamMap } from '@angular/router';
import { Rest, RestResponse, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { ModalComponent } from '../../components/modal/modal.component';
import { ItemNamePipe } from '../../modules/shared/pipes/item-name.pipe';
import { ItemSelectorStubComponent } from '../../components/item-selector/item-selector.component';
import { MakePaymentStubComponent } from '../../components/make-payment/make-payment.component';
import { AddPosBillStubComponent } from '../../components/add-pos-bill/add-pos-bill.component';
import { AddWithdrawalStubComponent } from '../../components/add-withdrawal/add-withdrawal.component';
import { AddNewClientStubComponent } from '../../components/add-new-client/add-new-client.component';
import { SaveCashCloseStubComponent } from '../../components/save-cash-close/save-cash-close.component';
import { SaveFundStubComponent } from '../../components/save-fund/save-fund.component';
import { SelectItemOptionStubComponent } from '../../components/select-item-option/select-item-option.component';
import { AddNewAddressStubComponent } from '../../components/add-new-address/add-new-address.component';
import { SelectDeliveryUserStubComponent } from '../../components/select-delivery-user/select-delivery-user.component';
import { MakeOrderReturnStubComponent } from '../../components/make-order-return/make-order-return.component';
import { SelectItemSerialStubComponent } from '../../components/select-item-serial/select-item-serial.component';

//TODO: move these to src/app/modules/shared/Models.ts (ported from old POS models.ts)
export interface UserBalance extends User {
	balance: number;
	credit_limit: number;
	points: number;
	code: string;
}
export interface UserInfo {
	user?: User;
	balance?: number;
	billing_address?: Address;
	shipping_address?: Address;
	addresses?: Address[];
}
export interface ReturnsInfo {
	id: number;
}

interface SearchArriveInterface {
	item_info: RestResponse<ItemInfo>,
	term: string,
	qty: number,
	search_by_code: boolean
}

interface ItemExceptionCliclable extends Item_Exception {
	selected: boolean;
}

declare function printHtml(html_body: string, title: string): any;

@Component
({
	selector: 'app-easy-pos',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterModule, ModalComponent, ItemNamePipe, ItemSelectorStubComponent, MakePaymentStubComponent, AddPosBillStubComponent, AddWithdrawalStubComponent, AddNewClientStubComponent, SaveCashCloseStubComponent, SaveFundStubComponent, SelectItemOptionStubComponent, AddNewAddressStubComponent, SelectDeliveryUserStubComponent, MakeOrderReturnStubComponent, SelectItemSerialStubComponent],
	templateUrl: './easy-pos.component.html',
	styleUrl: './easy-pos.component.css'
})

export class EasyPosComponent extends BaseComponent implements OnInit, AfterViewInit {
	rest_store: RestSimple<Store> = this.rest.initRestSimple<Store>('store');
	rest_currency_rate: RestSimple<Currency_Rate> = this.rest.initRestSimple<Currency_Rate>('currency_rate');
	rest_price_type: RestSimple<Price_Type> = this.rest.initRestSimple<Price_Type>('price_type');
	rest_table: RestSimple<Table> = this.rest.initRestSimple<Table>('table');
	rest_fund: RestSimple<Fund> = this.rest.initRestSimple<Fund>('fund');
	rest_address: RestSimple<Address> = this.rest.initRestSimple<Address>('address');
	rest_order_info: Rest<Order, OrderInfo> = this.rest.initRest<Order, OrderInfo>('order_info');
	rest_order: RestSimple<Order> = this.rest.initRestSimple<Order>('order');
	rest_item_info: Rest<Item, ItemInfo> = this.rest.initRest<Item, ItemInfo>('item_info');
	rest_user: RestSimple<User> = this.rest.initRestSimple<User>('user');
	rest_batch_record: RestSimple<Batch_Record> = this.rest.initRestSimple<Batch_Record>('batch_record');
	rest_offer: RestSimple<Offer> = this.rest.initRestSimple<Offer>('offer');
	rest_price: RestSimple<Price> = this.rest.initRestSimple<Price>('price');
	rest_printer: RestSimple<Printer> = this.rest.initRestSimple<Printer>('printer');
	rest_ticket: RestSimple<Ticket> = this.rest.initRestSimple<Ticket>('ticket');
	rest_user_permission: RestSimple<User_Permission> = this.rest.initRestSimple<User_Permission>('user_permission');
	shortcuts: ShortcutsService;

	constructor(injector: Injector) {
		super(injector);
		this.shortcuts = injector.get(ShortcutsService);
	}

	min_delivery_tomorrow_date: string = '';
	order_list: Order[] = [];
	search_type: 'TACTILE' | 'KEYBOARD' = 'KEYBOARD';
	search_subject = new Subject<string>();
	client_search_subject = new Subject<string>();
	navigation_length: number = 0;
	navigation_detected: number = 0;

	//Is for the search here is saved the current qty of the search item
	item_search_qty: number = 1;
	discount_type: 'PERCENT' | 'AMOUNT' = 'PERCENT';
	manager_user_list: User[] = [];
	dinners_number: string = '';

	@ViewChild('input_search', { read: ElementRef }) input_search!: ElementRef;
	@ViewChildren('batch_qty_input') batch_qty_inputs!: QueryList<ElementRef>;

	random: number = Math.random();

	currency_list: Currency[] = [];
	currency_rate_list: Currency_Rate[] = [];
	currency_rate: Currency_Rate | null = null;
	search_order_id: number | null = null;
	price_type_list: Price_Type[] = [];
	address_list: Address[] = [];
	disabled_price_type = {};
	//type:string = 'ETIQUETAS';
	scanner_enabled = false;
	item_dictionary: Record<number, Item> = {};
	category_dictionary: Record<number, Category> = {};
	item_list: ItemInfo[] = [];
	store: Store = GetEmpty.store();
	search_str: string = '';
	search_client_str: string = '';
	client_list: UserBalance[] = [];
	client_user: UserBalance | null = null;
	user_client_to_add: Partial<User> = {};
	address: Address = GetEmpty.address();
	selecte_address = null;
	client_search_index: number = -1;
	new_client_suggested_name: string = '';

	//new_price:number = 0;
	new_price_password: string = '';
	new_price_manager_user: string = '';
	new_price_change_type: '' | 'ALWAYS' | 'ONCE' = '';
	show_change_item_price: boolean = false;

	item_search_index: number = 0;
	item_search_list: number = 0;
	order_item_search_index: number = 0;
	store_dictionary: Record<number, Store> = {};
	store_list: Store[] = [];
	fund: Fund[] = [];
	selected_order_item: OrderItemInfo | null = null;
	selected_item_info: ItemInfo | null = null;
	editing_order_item_info: OrderItemInfo | null = null;
	selected_option_quantities: Record<number, number> = {};
	selected_option_notes: Record<number, string> = {};
	//order_items:OrderItemInfo[] = [];
	new_price: number | null = null;
	new_price_tax_included: boolean = false;
	active_list: 'search_list' | 'order_item_list' = 'order_item_list';
	last_item_selected: ItemInfo | null = null;
	order_info: OrderInfo = this.getEmptyOrderInfo();
	checked_exceptions: Record<number, boolean> = {};
	hide_search: boolean = true;
	is_search_active: boolean = true;
	order_item_height: number = 48;
	orders_to_display_in_tabs: number = 5;
	show_delivery_options: boolean = false;
	show_delivery_address: boolean = false;
	show_asign_delivery_user: boolean = false;
	show_return_order: boolean = false;
	show_return_order_id_selection: boolean = false;
	show_return_order_search: boolean = false;
	show_client_list: boolean = true;
	show_add_new_client: boolean = false;
	show_corte_caja: boolean = false;
	show_add_new_address: boolean = false;
	show_receive_payment: boolean = false;
	show_agregar_fondo: boolean = false;
	show_add_gasto: boolean = false;
	show_add_retiro: boolean = false;
	show_select_options: boolean = false;
	show_order_button: boolean = false;
	//show_assign_price: boolean = false;
	show_pv_options: boolean = false;
	show_order_item_exceptions: boolean = false;
	show_add_discount: boolean = false;
	show_order_closed: boolean = false;
	selected_item_exceptions: ItemExceptionCliclable[] = [];

	last_width: any = window.innerWidth;

	//Tener cuidado al asignar a return_order_id hace la busqueda de la orden aunque
	//No se este mostrando el modal para no hacer busquedas incesarias solo asignar
	//hasta que se seleccione la orden a devolver, o usar return_order_search_id
	return_order_id: number | null = null;
	return_order_search_id: number | null = null;

	foo_id: string = this.generateUUID();
	//@ViewChildren(any) viewPorts: QueryList<any>;

	@ViewChildren('order_item_view_port') viewPorts!: QueryList<ElementRef>; //TODO: restore cdk viewport scroll
	show_change_order_item_price: boolean = false;
	show_serial_item: boolean = false;
	show_batch_selection: boolean = false;
	available_batches: Batch_Record[] = [];
	batch_selections: {batch: Batch_Record, qty: number}[] = [];
	block_payment: boolean = false;
	show_ask_dinners: boolean = false;
	note: string = '';
	show_order_note: boolean = false;
	show_assign_delivery_date: boolean = false;
	order_delivery_date: string = '';
	comex_points: string | number | null = '';
	comex_max_points: number | null = 0;
	skip_save: boolean = false;
	is_searching: boolean = false;

	ngOnInit() {
		//this.rest.preferences.comex_enabled = 0;
		this.sink = this.router.events.subscribe((evt: any) => {
			let d = new Date();
			d.setHours(9, 0, 0, 0);

			this.min_delivery_tomorrow_date = Utils.getLocalMysqlStringFromDate(d);

			if (evt instanceof NavigationEnd) {
				if (evt.url.indexOf('/pos/pay') != 0 && evt.url.indexOf('/print-receipt') != 0) {
					this.sink = this.saveOrderInfo('Guardar al salir de la orden' + evt.url)
						.subscribe((_response) => {
							//this.order_info = response;
						});
				}
				console.log('Evt', evt);
			}
		}, (error: any) => {
			console.log('Error on event', error);
		});

		this.sink = this.rest.updates.subscribe((message) => {
			if (message.type == 'order' && (!message.store_id || message.store_id == this.rest.user!.store_id)) {
				this.loadOrderList();

				if (message.id && this.order_info.order.id && message.id == this.order_info.order.id) {
					let reason = 'Get order because same order was modified';
					this.sink = this.getOrderInfo(this.order_info.order.id, reason)
						.subscribe((response) => {
							if (response.order.status == 'CLOSED' || response.order.status == 'CANCELLED') {
								this.show_order_closed = true;
							}
						});
				}
			}
		});

		this.initSearchSubscription();
		this.sink = fromEvent(window, 'resize')
			.subscribe((evt) => {
				let current = window.innerWidth;
				if (this.last_width != current) {
					this.updateMobileVariables();
					this.last_width = current;
				}
			});

		this.sink = this.route.paramMap.pipe
		(
			mergeMap((params: ParamMap) => {
				this.setTitle('PV');

				if (this.rest.show_menu)
					this.rest.show_menu = false;

				////Si existe una orden la guardamos
				if (this.order_info.items.length && !this.order_info.order.id) {
					return this.saveOrderInfo('La orden no tiene un id').pipe
					(
						mergeMap(() => of(params))
					);
				}
				return of(params);
			}),
			mergeMap((params: ParamMap) => {

				let store_obs = this.store_list.length
					? of({data: this.store_list, total: this.store_list.length} as RestResponse<Store>)
					: this.rest_store.getAll();
				return forkJoin
					({
						params: of(params),
						store: store_obs,
						currency_rate: this.rest_currency_rate.getAll()
					});
			}),
			mergeMap((response) => {
				this.store_list = response.store.data;
				//this.store_dictionary = Utils.createDictionary(response.store.data,'id');
				this.store = this.store_list.find(store => store.id == this.rest.user!.store_id) as Store;

				console.log('Store is null');

				if (!this.store) {
					this.showError('El cajero no tiene ninguna tienda asignada, Por favor notifique al administrador');
					this.store = this.store_list[0];
				}

				this.loadOrderList();

				this.currency_rate = response
					.currency_rate
					.data
					.find((cr: Currency_Rate) => {
						return cr.currency_id == 'USD' && cr.store_id == this.order_info.order.store_id;
					}) || null;

				let currency_ids = new Map();
				response.currency_rate.data.forEach((cr: Currency_Rate) => {
					currency_ids.set(cr.currency_id,
						{
							id: cr.currency_id,
							name: cr.currency_id
						});
				})

				this.currency_list = Array.from(currency_ids.values());

				this.address_list = [];
				this.updateMobileVariables();
				this.new_client_suggested_name = '';

				if (this.show_add_new_client)
					this.show_add_new_client = false;

				if (this.show_corte_caja)
					this.show_corte_caja = false;

				if (this.show_add_new_client)
					this.show_add_new_client = false;

				if (this.show_add_new_address)
					this.show_add_new_address = false;

				this.show_receive_payment = false;
				this.show_agregar_fondo = false;
				this.show_add_gasto = false;
				this.show_add_retiro = false;
				this.show_select_options = false;
				this.show_change_order_item_price = false;
				this.show_change_item_price = false;
				this.show_order_button = false;
				//this.show_assign_price = false;
				this.show_return_order = false;
				this.show_return_order_search = false;
				this.show_order_item_exceptions = false;
				this.checked_exceptions = {};
				this.show_client_list = false;

				this.is_loading = true;
				this.order_info = this.getEmptyOrderInfo();

				let today_start = new Date();
				today_start.setHours(0);
				today_start.setMinutes(0);

				let today_end = new Date();
				today_end.setHours(23);
				today_end.setMinutes(59);

				this.show_agregar_fondo = false;

				if (!response.params.has('make_payment') && !response.params.has('id')) {
					if (!this.rest.is_offline && this.rest.user_permission.add_payments) {
						this.sink = this.rest_fund.search
						({
							limit: 99999,
							eq:
							{
								created_by_user_id: this.rest?.user?.id
							},
							search_extra:
							{
								current_session: 1
							}
						}).subscribe((response) => {
							this.show_agregar_fondo = response.data.length == 0;
						});
					}
				}

				let empty_order = this.getEmptyOrderInfo();

				if (response.params.has('client_id')) {
					let client_id: number = parseInt(response.params.get('client_id') ?? '') as number;
					empty_order.order.client_user_id = client_id;
				}

				if (response.params.has('table_id')) {
					empty_order.order.table_id = parseInt(response.params.get('table_id') ?? '') as number;
					empty_order.order.service_type = 'IN_PLACE';
					empty_order.order.client_name = '';

					if (this.rest.preferences.ask_for_guests_number) {
						this.show_ask_dinners = true;
					}
				}

				let order_observable: Observable<OrderInfo>;
				//Check amount observable
				let ch_observable: Observable<Record<string, number> | null>;

				if (response.params.has('sync_id')) {
					console.log('Cargo offline?????');
					//TODO: port offline order support (old rest.getOfflineOrderInfoBySyncId)
					order_observable = of(empty_order);
					ch_observable = of(null);
				}
				else if (response.params.has('id')) {
					let n = parseInt(response.params.get('id') ?? '') as number;
					order_observable = this.getOrderObservable(response.params.get('id'), 'Edit new order in webnavigation');
					ch_observable = of(null);
				}
				else {
					order_observable = of(empty_order);
					//TODO: port cashier cash amounts report (old rest.getCashierCashAmounts)
					ch_observable = of(null);
				}

				let price_type_obs = this.price_type_list.length
					? of({ data: this.price_type_list, total:this.price_type_list.length })
					: this.rest_price_type.getAll();

				let table_id_param = response.params.get('table_id');
				let table_obs: Observable<Table | null> = table_id_param
					? this.rest_table.get(parseInt(table_id_param) as number)
					: of(null);

				return forkJoin
					({
						order: order_observable,
						price_type: price_type_obs,
						currency_rates: this.rest_currency_rate.getAll(),
						make_payment: of(response.params.has('make_payment')),
						table: table_obs,
						cashier_amounts: ch_observable
					})
			})
		)
		.subscribe
		({
			error:(error)=>this.showError(error),
			next:(responses) =>
			{
				this.price_type_list = responses.price_type.data;

				this.currency_rate_list = responses.currency_rates.data;

				//console.log('Si cargo el offline id order', responses.order );

				//Si la orden corresponde y no tiene nombre se le agrega el nombre
				//De la mesa
				if (!(responses.order.order.client_name) && responses.table) {
					let date = new Date();
					let hour = Utils.zero(date.getHours()) + ':' + Utils.zero(date.getMinutes());
					responses.order.order.client_name = responses.table.name + ' - ' + hour;
				}

				this.is_loading = false;

				this.show_corte_caja = false;
				this.show_add_new_client = false;
				this.show_add_new_address = false;
				this.show_receive_payment = false;
				this.show_agregar_fondo = false;
				this.show_add_gasto = false;
				this.show_add_retiro = false;
				this.show_select_options = false;
				this.show_order_button = false;
				//this.show_assign_price = false;
				this.show_order_closed = false;

				this.show_receive_payment = responses.make_payment;
				this.store = this.store_list.find(store => store.id == this.rest.user!.store_id) as Store;

				//this.company = this.rest.getCompanyFromSession();

				this.order_info = responses.order;

				if (!this.order_info.store) {
					this.order_info.store = this.store_list.find(store => store.id == this.order_info.order.store_id) as Store;
				}

				this.loadUserBalance();
				this.setPriceTypeColors(this.order_info.order.price_type_id);

				//Las Serikals ponerlos correcto

				this.order_info.items.forEach((oii) => {
					this.order_info.items.forEach((oii) => {
						oii.serials_string = '';
						if (oii.serials && oii.serials.length) {
							oii.serials_string = oii.serials.map((oii) => oii.serial.serial_number).join(',');
						}
					});
				});

				if (this.order_info.items.length) {
					this.selected_order_item = this.order_info.items[this.order_info.items.length - 1];
					this.order_item_search_index = this.order_info.items.length - 1;

					let current = this.viewPorts.toArray();//.forEach(el => el?.scrollToIndex?.(100, "smooth"));
					(current[current.length - 1] as any)?.scrollToIndex?.(this.order_item_search_index);
				}

				if (this.order_info.order.client_user_id) {
					this.sink = forkJoin
						({
							address: this.rest_address.search
								({
									eq: { user_id: this.order_info.order.client_user_id },
									nn: ['lat'],
									limit: 9999
								}),
							client_user: this.searchUserBalance(this.order_info.order.client_user_id)
						})
						.subscribe((response) => {
							this.address_list = response.address.data;
							//XXX AQUI ESTA EL ERROR
							if (response.client_user) {
								this.onSelectClient(response.client_user);
								this.search_client_str = response.client_user.name;
							}
						});
				}

				if (this.order_info.order.paid_status == 'PAID' || this.order_info.order.paid_status == 'PARTIALLY_PAID') {
					this.showError('La orden esta pagada o parcialmente pagada');

					if (this.order_info.order.id)
						this.router.navigate(['/view-order', this.order_info.order.id], { replaceUrl: true });
					else
						this.router.navigate(['/list-order'], { replaceUrl: true });

					return;
				}

				if (responses.cashier_amounts && !this.order_info.order?.id) {
					//console.log('Try to compare', this.store.max_cash_amount, this.store );
					if (this.store && this.store.max_cash_amount) {
						if ((responses.cashier_amounts?.['CASH'] ?? 0) >= this.order_info.store.max_cash_amount) {
							this.block_payment = true;
							this.showMaxAmountWarning()
						}
						else {
							this.block_payment = false;
						}
					}
				}

				if (!this.order_info.order.tax_percent) {
					this.order_info.order.tax_percent = this?.store?.tax_percent || 16;
				}

				if (!(this.order_info.order?.id) && this.price_type_list.length) {
					this.order_info.order.price_type_id = this.price_type_list[0].id;
					this.setPriceTypeColors(this.price_type_list[0].id);
				}

				//this.order_info.items.forEach((oii)=>this.updateOrderItemPrice(oii.order_item,this.order_info.order.tax_percent));

				if (!this.show_receive_payment && this.order_info.order.discount > 0) {
					this.restorePrices();
				}

				this.updateOrderTotal();

				this.is_loading = false;

				const effective_input_type = this.rest.preferences.default_input_type ?? 'TACTILE';
				if (effective_input_type != this.search_type) {
					this.search_type = effective_input_type;
				}
			}
		})

		this.sink = this.shortcuts.shortcuts.subscribe((kse) => this.keyHandler(kse));
	}

	ngAfterViewInit() {
		this.sink = this.batch_qty_inputs.changes.subscribe((inputs: QueryList<ElementRef>) => {
			if (inputs.length > 0) {
				setTimeout(() => {
					console.log('Focusing');
					inputs.first.nativeElement.focus();
					inputs.first.nativeElement.select();
				}, 310);
			}
		});
	}

	initSearchSubscription() {
		this.sink = this.search_subject.pipe
			(
				mergeMap((response) => {
					return of(response);
				}),
				filter((_x) => {
					if (this.is_searching) {
						console.log('Search blocked');
					}
					return !this.is_searching;
				}),
				debounceTime(350),
				mergeMap((search: string) => {
					//console.log('Search is', search );
					let qty = 1;

					if (this.rest.is_offline || this.rest._offline_search_enabled) {
						let s = search.trim();
						let extracted = s;

						if (/^\d+\*/.test(s)) {
							let index = s.indexOf('*');
							extracted = s.substring(index + 1).trim();
							let qty_string = s.substring(0, index);
							qty = parseInt(qty_string, 10) as number;
							//console.log(extracted);

							return forkJoin({
								item_info: this.searchByCode(extracted),
								term: of(extracted),
								qty: of(qty),
								search_by_code: of(true)
							})
						}

						return forkJoin({
							item_info: this.searchOfflineItemInfo(extracted),
							term: of(extracted),
							qty: of(qty),
							search_by_code: of(false)
						})
					}
					else {
						let s = search.trim();
						let extracted = s;
						let search_by_code = false;

						if (/^\d{8,13}$/.test(s)) {
							search_by_code = true
							this.is_searching = true;
						}
						else if (/^\d+\*/.test(s)) {
							let index = s.indexOf('*');
							extracted = s.substring(index + 1);
							let qty_string = s.substring(0, index);
							qty = parseInt(qty_string, 10) as number;
							//console.log(extracted);
							search_by_code = true;
						}
						else if (s.startsWith('#')) {
							search_by_code = true;
						}

						return forkJoin({
							item_info: this.rest_item_info
								.search({ eq: { on_sale: 'YES', status: 'ACTIVE' }, limit: 20, search_extra: { category_name: extracted, store_id: this.order_info.order.store_id } }),
							term: of(extracted),
							qty: of(qty),
							search_by_code: of(search_by_code)
						})
					}
				})
			)
			.subscribe((responses) => {
				this.is_searching = false;
				this.onSearchArrives(responses);
				console.log(responses);
			}, (error: any) => {
				this.is_searching = false;
				this.showError(error);
				console.log('Error occourred', error);
			});

		this.sink = this.client_search_subject.pipe
			(
				mergeMap((response) => {
					console.log("Se pierde", response);
					return of(response);
				}),
				filter((response) => response.length > 0),
				debounceTime(350),
				mergeMap((s: string) => {
					let search: SearchObject<User> = this.getEmptySearch();
					search.limit = 20;
					search.eq.type = 'CLIENT';

					if( s.length == 1 )
					{
						search.start.name = s;
					}
					else
					{
						search.lk.name = s;
						search.lk.phone = s;
					}

					return this.rest_user.search(search);
				})
			)
			.subscribe((responses) => {
				this.show_client_list = true;
				this.client_list = responses.data as unknown as UserBalance[];
			}, (error: any) => {
				this.showError(error);
				console.log('Error occourred', error);
			});
	}

	onSearchArrives(response: SearchArriveInterface): void {
		this.is_loading = false;
		this.last_width = window.innerWidth;
		this.updateMobileVariables();
		//console.log( response );
		this.updatePrices(response.item_info.data);
		this.item_search_qty = response.qty;

		//this wrong on so many levels
		//List to show search items
		this.item_list = response.item_info.data;

		if (response.item_info.data.length == 0 && response.search_by_code) {
			this.showError('Producto no encontrado');
			if (this.scanner_enabled) {
				this.search_str = '';
			}
		}

		if (response.item_info.data.length == 1) {
			if (response.search_by_code) {
				this.onSelectItem(this.item_list[0], response.qty == 1);

				if (response.qty > 1) {
					this.updateOrderItemValue(this.order_info.items[this.order_info.items.length - 1], response.qty);
				}

				this.item_search_qty = 1;
				this.search_str = '';
				this.item_list.splice(0, this.item_list.length);
			}
			else if (this.search_str.length == 13 && response.item_info.data[0].item.code?.trim() == this.search_str.trim()) {
				//El trece es la cantidad de digitos de un codigo de barras EAN-13
				this.onSelectItem(this.item_list[0], response.qty == 1);
				this.updateOrderItemValue(this.order_info.items[this.order_info.items.length - 1], response.qty);
				this.item_search_qty = 1;
				this.search_str = '';
			}
		}

		this.order_item_search_index = 0;
		this.item_search_index = 0;
		if (this.search_type == 'KEYBOARD') {
			this.active_list = 'search_list';
		}
	}

	getOrderObservable(id: any, reason: string): Observable<OrderInfo> {
		if (id == null) {
			return of(this.getEmptyOrderInfo());
		}

		let order_id = parseInt('' + id) as number;

		if (this.rest.is_offline) {
			//TODO: port offline order by id (old rest helper)
		return of(this.getEmptyOrderInfo());
		}

		console.log('Previa' + this.order_info.order.id + ' Actual:' + id);

		if (order_id == this.order_info.order.id) {
			return of(this.order_info);
		}

		return this.getOrderInfo(id, reason);
	}

	onSearch(evt: any) {


		let search: string = evt.target.value.trim();
		this.active_list = 'search_list';
		this.item_search_index = -1;

		if (!search) {
			this.item_list.splice(0, this.item_list.length);
			return;
		}

		if (search.length == 1) {
			this.item_list.splice(0, this.item_list.length);
			return;
		}

		this.search_subject.next(search);

	}

	updateMobileVariables() {
		// xs,sm
		if (window.innerWidth < 992) {
			this.order_item_height = 88;
			this.hide_search = true;
			this.is_search_active = true;
			this.orders_to_display_in_tabs = 3;
		}
		else if (window.innerWidth < 1280) {
			//md,lg....
			this.orders_to_display_in_tabs = window.innerWidth < 1280 ? 4 : 6;
			this.hide_search = false;

			if (window.innerWidth < 1400 && this.rest.show_menu) {
				this.order_item_height = 88;
			}
			else {
				this.order_item_height = 56;
			}
		}

		this.hide_search = window.innerWidth < 768;
	}

	keyHandler(kse: KeyboardShortcutEvent) {
		let input = window.document.querySelector('input:focus');

		if (input && input.getAttribute('id') != 'item_search_pos') {
			return;
		}

		if (kse.shortcut.name == 'Escape') {
			if (this.show_corte_caja
				|| this.show_add_new_client
				|| this.show_add_new_address
				|| this.show_receive_payment
				|| this.show_add_discount
				|| this.show_agregar_fondo
				|| this.show_add_gasto
				|| this.show_add_retiro
				|| this.show_client_list
				|| this.show_serial_item
				|| this.client_list.length > 0
			) {
				this.show_corte_caja = false;
				this.show_add_new_client = false;
				this.show_add_new_address = false;
				this.show_receive_payment = false;
				this.show_add_discount = false;
				this.show_agregar_fondo = false;
				this.show_select_options = false;
				this.client_list = [];
				this.show_client_list = false;
				this.show_edit_qty = false;
				this.show_serial_item = false;

				kse.stopPropagation();
				return;
			}
		}

		let ret = this.show_corte_caja || this.show_add_new_client || this.show_select_options ||
			this.show_add_new_address || this.show_receive_payment || this.show_agregar_fondo || this.show_add_gasto || this.show_add_retiro ||
			this.show_edit_qty || this.show_add_discount || this.show_order_item_exceptions ||
			this.show_serial_item || this.show_batch_selection;

		if (ret) {
			return;
		}

		let shortcut_name: string = kse.shortcut.name ?? ''

		if (kse.shortcut.name == 'F2') {
			shortcut_name = 'ADD_EXCEPTION';
		}

		if (kse.shortcut.name == 'Control+A') {
			shortcut_name = 'NewClient';
		}

		if (kse.shortcut.name == 'F4') {
			shortcut_name = 'ADD_EXCEPTION';
		}

		if (kse.shortcut.name == 'F7') {
			shortcut_name == 'CHANGE_PRICE';
		}

		if (kse.shortcut.name == 'Alt+F12') {
			shortcut_name = 'OPEN_CASHIER_BOX';
		}

		switch (shortcut_name) {
			case 'ArrowLeft':
				{
					if (this.active_list == 'order_item_list' && this.search_type == 'KEYBOARD') {
						this.active_list = 'search_list';
						kse.stopPropagation();
					}
					return;
				}
			case 'ArrowRight':
				{
					if (this.active_list == 'search_list') {
						this.active_list = 'order_item_list';
						kse.stopPropagation();
					}
					return
				}
			case 'ArrowUp':
				{
					if (this.client_list.length > 0) {
						if (this.client_search_index > 1) {
							this.client_search_index--;
							kse.stopPropagation();
							return;
						}
					}

					if (this.active_list == 'search_list') {
						if (this.item_search_index > 0) {
							this.item_search_index--;
							let current = this.viewPorts.toArray();//.forEach(el => el?.scrollToIndex?.(100, "smooth"));
							(current[0] as any)?.scrollToIndex?.(this.item_search_index);
						}
						kse.stopPropagation();
						return;
					}
					if (this.active_list == 'order_item_list') {
						if (this.order_item_search_index > 0) {
							this.order_item_search_index--;

							let current = this.viewPorts.toArray();//.forEach(el => el?.scrollToIndex?.(100, "smooth"));
							(current[current.length - 1] as any)?.scrollToIndex?.(this.order_item_search_index);
						}
						kse.stopPropagation();
					}
					return;
				}
			case 'ArrowDown':
				{
					if (this.client_list.length > 0) {
						if (this.client_search_index < this.client_list.length + 1) {
							this.client_search_index++;
							kse.stopPropagation();
							return;
						}
					}

					if (this.active_list == 'search_list') {
						if (this.item_search_index < this.item_list.length - 1) {
							this.item_search_index++;
							let current = this.viewPorts.toArray();//.forEach(el => el?.scrollToIndex?.(100, "smooth"));
							(current[0] as any)?.scrollToIndex?.(this.item_search_index);
						}
						kse.stopPropagation();
						return;
					}

					if (this.active_list == 'order_item_list') {
						if (this.order_item_search_index < this.order_info.items.length - 1) {
							this.order_item_search_index++;
							//let current = this.viewPorts.toArray();//.forEach(el => el?.scrollToIndex?.(100, "smooth"));
							let current = this.viewPorts.toArray();//.forEach(el => el?.scrollToIndex?.(100, "smooth"));
							(current[current.length - 1] as any)?.scrollToIndex?.(this.order_item_search_index);
						}
						kse.stopPropagation();
						return;
					}
					return;
				}
			case 'Backspace':
				{
					if (this.active_list == 'order_item_list' && this.order_info.items.length) {
						if (this.order_info.items[this.order_item_search_index].order_item.qty > 1) {
							this.decrementOrderItemInfo(this.order_info.items[this.order_item_search_index]);
						}
						else {
							this.removeItem(this.order_info.items[this.order_item_search_index]);
							if (this.order_item_search_index > 0) {
								this.order_item_search_index--;
							}
							else if (this.order_info.items.length == 0 && this.search_type == 'KEYBOARD') {
								this.active_list = 'search_list';
							}
						}
						kse.stopPropagation();
					}
					return;
				}
			case 'Shift+Enter':
				{
					if (this.active_list == 'search_list' && this.item_list.length) {
						this.onSelectItem(this.item_list[this.item_search_index], false);
						kse.stopPropagation();
						return;
					}

					if (this.active_list == 'order_item_list' && this.order_item_search_index < this.order_info.items.length) {
						kse.stopPropagation();

						if (!this.isOrderItemQtyEditable(this.order_info.items[this.order_item_search_index])) {
							this.showError('Artículo entregado por favor agregue uno nuevo');
							return;
						}

						this.selected_order_item = this.order_info.items[this.order_item_search_index];
						this.selected_order_item_qty = this.order_info.items[this.order_item_search_index].order_item.qty;
						this.edit_qty_type = 'AMOUNT';
						this.show_edit_qty = true;

						//console.log('Show edit_qty');
						return;
					}
					return;
				}
			case 'Enter':
				{
					//El siguiente codigo es para ignorar el "Enter" de la pistola scanner.
					if (this.item_search_index == 0 && this.item_list.length) {
						let item_info = this.item_list[this.item_search_index];
						let c_name = item_info.category && this.rest.preferences.display_categories_on_items == 'YES'
							? item_info.category.name + ' '
							: '';

						c_name = c_name + item_info.item.name;

						let item_code = item_info.item.code?.toLowerCase().trim();
						let search_str = this.search_str.toLowerCase().trim();

						//Si la cadena de busqueda no esta en el nombre del articulo o en el codigo del articulo
						//Nos salimos
						if (!(c_name.toLowerCase().includes(search_str) || (item_code && (item_code.includes(search_str) || item_code == search_str)))) {
							return;
						}
					}

					if (this.client_list.length > 0) {
						if (this.client_search_index == 0) {
							this.client_list = [];
							this.noRegistrarUsuario();
							kse.stopPropagation();
							return;
						}

						if (this.client_search_index == 1) {
							this.client_list = [];
							this.agregarNuevoClienteConNombre(this.search_client_str);
							kse.stopPropagation();
							return;
						}

						this.onSelectClient(this.client_list[this.client_search_index - 2]);
						kse.stopPropagation();
						return;
					}

					if (this.active_list == 'search_list' && this.item_list.length) {
						this.onSelectItem(this.item_list[this.item_search_index], this.item_search_qty == 1);
						if (this.item_search_qty > 1) {
							this.search_str = '';
							this.updateOrderItemValue(this.order_info.items[this.order_info.items.length - 1], this.item_search_qty);
							this.item_search_qty = 1;
						}
						kse.stopPropagation();
						return;
					}
					else if (this.active_list == 'order_item_list' && this.order_info.items.length) {
						this.search_str = '';
						let oii = this.order_info.items[this.order_item_search_index];
						this.incrementOrderItemInfo(oii);
						kse.stopPropagation();
						return;
					}
					return;
				}
			case 'NewClient':
				{
					this.show_add_new_client = true;
					kse.stopPropagation();
					return;
				}
			case 'PAGAR':
				{
					this.pay(null);
					kse.stopPropagation();
					return;;
				}
			case 'CORTE_CAJA':
				{
					this.show_corte_caja = true;
					kse.stopPropagation();
					return;
				}
			case 'ADD_EXPENSE':
				{
					this.show_add_gasto = true;
					kse.stopPropagation();
					return;
				}
			case 'CHANGE_PRICE':
				{
					if (this.order_info.items.length) {
						this.selected_order_item = this.order_info.items[this.order_item_search_index];
						this.show_change_order_item_price = true;
						//this.show_change_item_price = true;
						this.new_price_tax_included = false;
						kse.stopPropagation();
					}
					return;
				}
			case 'ADD_EXCEPTION':
				{
					if (this.active_list == 'order_item_list' && this.order_info.items.length) {
						this.showOrderItemExceptions()
						kse.stopPropagation();
					}
					return;
				}
			case 'ADD_FUNDS':
				{
					this.show_agregar_fondo = true;
					kse.stopPropagation();
					return;
				}
			case 'OPEN_CASHIER_BOX':
				{
					//Efecto Placebo.

					if (this.rest.user_permission.open_cashier_box_anytime) {
						console.log('FOOO');
						setTimeout(() => {
							printHtml('.', '');
						}, 50);
						kse.stopPropagation();
					}
					return;
				}
		}
	}

	updatePrices(items: ItemInfo[] | OrderItemInfo[]) {
		let is_order_item = false;

		items.forEach((i: OrderItemInfo | ItemInfo) => {
			let price: Price | null | undefined = undefined;

			if ('order_item' in i) {
				price = this.getPriceForOrderItemInfo(i as OrderItemInfo);
			}
			else {
				price = i.prices.find(price => {
					return price.price_list_id == this.order_info.store.price_list_id &&
						price.price_type_id == this.order_info.order.price_type_id;
				});
			}

			if (i?.records) {

				let store_id = this.order_info?.store?.id && this.order_info.store.id > 0 ? this.order_info.store.id : this.rest.user!.store_id;

				let stock_record: Stock_Record | undefined = i.records.find(sr => sr.store_id == store_id );
				if (stock_record)
					i.stock_record = stock_record;
			}

			i.price = price ?? undefined;

			if ('order_item' in i) {
				is_order_item = true;
				let oii = i as OrderItemInfo;
				let item_parent: OrderItemInfo | null | undefined = null;

				if (oii.order_item.item_option_id) {
					let foo = items as OrderItemInfo[];
					item_parent = foo.find((j: OrderItemInfo) => {
						return j.order_item.item_group == i.order_item.item_group && !(j.order_item?.item_option_id);
					});
				}

				let discount_amount = (i.order_item.discount_percent ?? 0) > 0 ? 0 : i.order_item.discount;

				if (item_parent) {
					i.order_item.tax_included = item_parent.order_item.tax_included;
				}
				else if (price) {
					oii.order_item.tax_included = price.tax_included;

					if (!this.setOrderItemPrice(oii.order_item, price, this.order_info.store.default_currency_id, this.order_info.order.currency_id, this.currency_rate_list)) {
						oii.order_item.original_unitary_price = price.price;
					}
				}
				else {
					let name = (this.rest.preferences.display_categories_on_items ? (i?.category?.name || '') : '') + ' -' + i.item.name;
					this.showError('No se encontró precio para el item ' + name);
				}

				let tax = this.getItemTax(oii);

				if (oii.order_item.discount_percent) {
					this.applyDiscountPercent(oii, oii.order_item.discount_percent);
				}
				else if (oii.order_item.discount) {
					this.applyDiscountAmount(oii, discount_amount,)
				}

				this.updateOrderItemPrice(oii.order_item, tax, 0);
			}
		});

		if (is_order_item) {
			this.order_info.items = this.order_info.items.map(i => i);
		}
	}

	getItemTax(ii: OrderItemInfo): number
	{
		return ii.item.applicable_tax == 'DEFAULT'
			? this.order_info.order.tax_percent
			: ii.item.tax_percent;
	}

	getItemTags(item: Item): string[] {
		//No se hizo con maps, por que es importante el orden
		let array = Array<string>();

		if (!item.json_tags)
			return [];

		for (let t of item.json_tags) {
			if (array.includes(t))
				continue;

			array.push(t);
		}
		return array;
	}

	getPriceForOrderItemInfo(oii: OrderItemInfo): Price | null | undefined {
		let item_tags = this.getItemTags(oii.item);

		let tmp_price_type_list = this.price_type_list.map(i => i);
		let same_item_qty = 0;
		let same_category_qty = 0;

		let qty_by_tag = new Map<string, number>();

		for (let t_oii of this.order_info.items) {
			//Solo los que cobramos a precio normal
			if (t_oii.order_item.item_option_id)
				continue;

			if (t_oii.item.id == oii.item.id)
				same_item_qty = t_oii.order_item.qty;

			//Limpiamos por si llegan tags duplicados
			let other_item_tags = this.getItemTags(t_oii.item);

			for (let tag of item_tags) {
				if (other_item_tags.includes(tag)) {
					let qty = qty_by_tag.get(tag) || 0;
					qty_by_tag.set(tag, qty + t_oii.order_item.qty);
				}
			}

			if (oii.item.category_id && t_oii.item.category_id == oii.item.category_id) {
				same_category_qty += t_oii.item.category_id;
			}
		}

		tmp_price_type_list.sort((pt1, pt2) => {
			if (pt1.type == pt2.type) {
				return pt2.sort_priority > pt1.sort_priority ? -1 : 1;
			}
			return pt1.type == 'RETAIL' ? 1 : -1;
		});

		let wholesale_price_type = tmp_price_type_list.find(pt => {
			if (pt.type == 'WHOLESALE') {
				if (pt.wholesale_type == 'BY_ARTICLE') {
					return same_item_qty >= pt.wholesale_min_qty;
				}

				if (pt.wholesale_type == 'BY_CATEGORY') {
					return same_category_qty >= pt.wholesale_min_qty;
				}

				if (!pt.json_tags) {
					return false;
				}

				//WHOLESALE BY TAG
				for (let t of pt.json_tags) {
					let qty_tag = qty_by_tag.get(t) || 0;

					if (qty_tag >= pt.wholesale_min_qty)
						return true;
				}
			}
			return false;
		})

		if (wholesale_price_type) {
			let price = oii.prices.find(p => {
				return wholesale_price_type.id == p.price_type_id && p.price_list_id == this.store.price_list_id;
			});

			if (price)
				return price;
		}

		let price: Price | undefined = oii.prices.find(price => {
			return price.price_list_id == this.order_info.store.price_list_id &&
				price.price_type_id == this.order_info.order.price_type_id;
		});

		return price;
	}

	decrementOrderItemInfo(oii: OrderItemInfo) {
		if (!this.isOrderItemQtyEditable(oii)) {
			return;
		}

		this.updateOrderItemValue(oii, oii.order_item.qty - 1);
	}

	incrementOrderItemInfo(oii: OrderItemInfo) {
		if (!this.isOrderItemQtyEditable(oii)) {
			return;
		}

		if (oii?.stock_record && oii.item.availability_type === 'ON_STOCK')
		{
			let current_qty = this.getCurrentItemQtyInOrder(oii.item.id);

			if (current_qty >= oii.stock_record.qty && this.rest.user_permission.view_stock )
			{
				return this.showError(`No hay suficiente inventario para ${oii.item.name}.`);
			}
		}

		this.updateOrderItemValue(oii, oii.order_item.qty + 1);
	}

	updateOrderItemValue(oii: OrderItemInfo, new_qty: number) {
		oii.order_item.qty = new_qty;
		if (oii.batches && oii.batches.length == 1) {
			oii.batches[0].qty = new_qty;
		}

		let oiioptions = this.order_info.items.filter(i => i.order_item.item_group == oii.order_item.item_group);
		oiioptions.forEach((oii2: OrderItemInfo) => {
			if (oii2 == oii)
				return;

			oii2.order_item.qty = oii.order_item.qty * oii2.order_item.item_option_qty;
			//XXX en el futuro tambien probar por PERCENT
			//let tax = oii2.item.applicable_tax == 'DEFAULT' ? this.order_info.order.tax_percent : 0;

			let tax = this.getItemTax(oii);

			this.updateOrderItemPrice(oii2.order_item, tax, 0);
		});

		this.updatePrices(this.order_info.items);
		this.updateOrderTotal();
	}

	onSelectItem(item_info: ItemInfo, increment: boolean) {
		if (item_info.item.form_id && !this.order_info.order.client_user_id) {
			return this.showError('El articulo requiere que se asigne un cliente');
		}

		if (item_info.item.has_serial_number == 'YES') {
			let filter = (s: any) => s.store_id == this.order_info.order.store_id;

			if (item_info.serials?.filter(filter)?.length) {
				return this.showError('NO hay inventario para el articulo ' + item_info.item.name);
			}
		}

		let stock_record: Stock_Record | undefined = undefined;

		if (item_info?.records)
			stock_record = item_info.records.find(i => i.store_id == this.order_info.order.store_id);

		let price: Price | undefined = undefined;

		if (item_info.prices) {
			price = item_info.prices.find((i: Price) => {
				return i.price_list_id == this.order_info.store.price_list_id &&
					this.order_info.order.price_type_id == i.price_type_id
			});
		}

		if (price == undefined) {

			//console.log('Sin precio', item_info );
			return this.showError('El producto no tiene un precio asignado');
		}

		if (item_info.item.has_serial_number == 'YES') {
			if (item_info.serials.some(s => s.serial.store_id == this.order_info.store.id)) {
				return this.showSerialItem(item_info);
			}
			return this.showError('No hay inventario para este articulo');
		}

		if (item_info.item.batch_option !== 'NONE') {
			this.showBatchSelection(item_info);
			return;
		}

		if (!item_info?.options?.length) {
			if (increment && this.order_info.items.length) {
				let map = this.order_info.items.map(i => i);
				map.reverse();

				let same: OrderItemInfo | undefined = map.find(i => i.order_item.item_id == item_info.item.id);

				if (same && !(same.order_item?.id)) {
					this.incrementOrderItemInfo(same);
					this.updateOrderTotal();
					this.search_str = '';
					return;
				}
			}

			let unitary_price = price.price;
			let date = new Date();

			let order_item = GetEmpty.order_item(item_info.item);
			order_item.original_unitary_price = unitary_price;
			order_item.unitary_price_meta = unitary_price;
			order_item.tax_included = price.tax_included,
				order_item.ieps_type = item_info.item.ieps_type;
			order_item.ieps_value = item_info.item.ieps_value;
			//this.setOrderItemPrice();

			this.setOrderItemPrice(order_item, price, this.order_info.store.default_currency_id, this.order_info.order.currency_id, this.currency_rate_list);

			this.addOrderItem
				([{
					order_item,
					item: item_info.item,
					category: item_info.category,
					records: item_info.records,
					stock_record: stock_record,
					price: price,
					prices: item_info.prices,
					exceptions: item_info.exceptions,
					order_item_exceptions: [],
					options: [],
					serials: [],
					serials_string: '',
					batches: [],
					created: date,
					category_zero: item_info.category_zero ?? null,
					item_options: item_info.item_options,
					commanda_type_id: item_info.item.commanda_type_id
				}]);

			if (item_info.item.note_required == 'YES') {
				this.selected_order_item = this.order_info.items[this.order_info.items.length - 1];
				this.showOrderItemExceptions();
			}
		}
		else {
			this.clearOptionEdition();
			this.selected_item_info = item_info;
			this.show_select_options = true;
		}
		//console.log( this.order_info.items );

		let index = this.item_list.findIndex((ii: ItemInfo) => ii.item.id == item_info.item.id);
		//this.item_list.splice(0,this.item_list.length);
		this.search_str = '';

		if (index > -1) {
			if (this.search_type == 'KEYBOARD') {
				this.active_list = 'search_list';
			}
			this.item_search_index = index;
		}

		this.updateOrderTotal();
	}

	showSerialItem(item_info: ItemInfo) {

		this.clearOptionEdition();
		this.selected_item_info = item_info;
		this.show_serial_item = true;
	}

	showBatchSelection(item_info: ItemInfo) {
		this.clearOptionEdition();
		this.selected_item_info = item_info;
		this.show_batch_selection = true;
		this.available_batches = [];
		this.batch_selections = [];

		this.is_loading = true;
		this.sink = this.rest_batch_record.search({
			eq: {
				item_id: item_info.item.id,
				store_id: this.order_info.store.id,
				is_current: 1
			},
			gt: {qty: 0},
			limit: 1000
		}).subscribe(
			(response) => {
				this.available_batches = this.sortBatchesByExpiration(response.data);
				this.batch_selections = this.available_batches.map(b => ({batch: b, qty: 0}));
				if (this.batch_selections.length === 1) {
					this.batch_selections[0].qty = 1;
				}
				this.is_loading = false;
			},
			(error: any) => {
				this.showError(error);
				this.is_loading = false;
			}
		);
	}

	//FEFO (first expired, first out): primero sale lo que caduca antes y, a misma caducidad, el
	//lote que entro antes. Los que no manejan caducidad se van al final con una fecha centinela,
	//porque no compiten por salir primero.
	//expiration_date llega como string ISO ('YYYY-MM-DD'): Utils.convertToDate solo convierte
	//created, updated y las llaves con 'timestamp', asi que se compara como texto y de paso
	//se evita el corrimiento de zona horaria.
	sortBatchesByExpiration(batches: Batch_Record[]): Batch_Record[] {
		const SIN_CADUCIDAD = '9999-12-31';

		return batches.sort((a,b)=>
			(a.expiration_date || SIN_CADUCIDAD).localeCompare(b.expiration_date || SIN_CADUCIDAD)
			|| a.id - b.id
		);
	}

	onBatchSelectionConfirm() {
		let selected_item_info = this.selected_item_info;

		if (!selected_item_info) {
			return this.showError('No se selecciono ningun producto');
		}

		let total_qty = this.batch_selections.reduce((sum, current) => sum + current.qty, 0);
		if (total_qty === 0) {
			this.showError('Debe seleccionar al menos una unidad');
			return;
		}

		let selected = this.batch_selections.filter(b => b.qty > 0);

		let stock_record: Stock_Record | undefined = undefined;
		if (selected_item_info?.records)
			stock_record = selected_item_info.records.find(i => i.store_id == this.order_info.order.store_id);

		let price = selected_item_info.prices.find((i: Price) => {
			return i.price_list_id == this.order_info.store.price_list_id &&
				this.order_info.order.price_type_id == i.price_type_id
		});

		if (price == undefined) {
			return this.showError('El producto no tiene un precio asignado');
		}

		let date = new Date();

		let order_item = GetEmpty.order_item(selected_item_info.item);

		order_item.qty = total_qty;

		order_item.original_unitary_price = price.price;
		order_item.unitary_price_meta = price.price;
		order_item.tax_included = price.tax_included;
		order_item.ieps_type = selected_item_info.item.ieps_type;
		order_item.ieps_value = selected_item_info.item.ieps_value;

		this.setOrderItemPrice(order_item, price, this.order_info.store.default_currency_id, this.order_info.order.currency_id, this.currency_rate_list);

		let batches: Order_Item_Batch[] = selected.map(sel => {
			return {
				id: 0,
				order_item_id: 0,
				batch: sel.batch.batch,
				expiration_date: sel.batch.expiration_date,
				qty: sel.qty,
				created: date,
				updated: date
			} as Order_Item_Batch;
		});

		let order_item_info: OrderItemInfo = {
			order_item,
			item: selected_item_info.item,
			category: selected_item_info.category,
			records: selected_item_info.records,
			stock_record: stock_record,
			price: price,
			prices: selected_item_info.prices,
			exceptions: selected_item_info.exceptions,
			order_item_exceptions: [],
			batches: batches,
			options: [],
			serials: [],
			serials_string: '',
			created: date,
			category_zero: selected_item_info.category_zero ?? null,
			item_options: selected_item_info.item_options,
			commanda_type_id: selected_item_info.item.commanda_type_id
		};

		this.addOrderItem([order_item_info]);

		if (selected_item_info.item.note_required == 'YES') {
			this.selected_order_item = this.order_info.items[this.order_info.items.length - 1];
			this.showOrderItemExceptions();
		}

		this.show_batch_selection = false;
	}

	hadSerialNumbers(serial_numbers: string[]): boolean {
		for (let oii of this.order_info.items) {
			for (let s of oii.serials ?? []) {
				if (serial_numbers.includes(s.serial.serial_number)) {
					return true;
				}
			}
		}

		return false;
	}

	onOrderItemWithOptions(order_item_info_list: OrderItemInfo[]) {
		if (order_item_info_list.length == 0) {
			this.show_select_options = false;
			this.clearOptionEdition();
			return;
		}

		let serials_numbers: string[] = [];
		for (let oii of order_item_info_list) {
			for (let s of oii.serials ?? []) {
				serials_numbers.push(s.serial.serial_number);
			}
		}

		if (this.hadSerialNumbers(serials_numbers)) {
			return this.showError('Los numeros de serie ya se encuentran en la orden');
		}

		if (this.block_payment) {
			this.showMaxAmountWarning();
		}

		if (this.isEditingTheseOptions(order_item_info_list)) {
			this.replaceItemOptions(this.editing_order_item_info as OrderItemInfo, order_item_info_list);
			this.selected_item_info = null;
			this.show_select_options = false;
			this.clearOptionEdition();
			return;
		}

		this.selected_item_info = null;
		this.show_select_options = false;
		this.show_serial_item = false;
		this.addOrderItem(order_item_info_list);

		if (order_item_info_list && order_item_info_list.length) {
			let order_item_info = order_item_info_list[0];

			if (order_item_info.item.note_required == 'YES') {
				this.selected_order_item = order_item_info;
				this.showOrderItemExceptions();
			}
		}
	}

	isEditingTheseOptions(order_item_info_list: OrderItemInfo[]): boolean {
		let editing_order_item_info = this.editing_order_item_info;

		if (!editing_order_item_info)
			return false;

		return order_item_info_list.some((oii) => {
			return !oii.order_item.item_option_id
				&& oii.item.id == editing_order_item_info.item.id;
		});
	}

	replaceItemOptions(oii: OrderItemInfo, order_item_info_list: OrderItemInfo[]) {
		if (this.order_info.items.indexOf(oii) == -1) {
			return this.showError('El artículo ya no se encuentra en la orden');
		}

		let options = order_item_info_list.filter((i) => !!i.order_item.item_option_id);

		options.forEach((option_oii) => {
			option_oii.order_item.item_group = oii.order_item.item_group;
			this.updateOrderItemPrice(option_oii.order_item, this.getItemTax(option_oii), 0);
		});

		this.getOptionOrderItems(oii).forEach((old_option_oii) => {
			let old_index = this.order_info.items.indexOf(old_option_oii);

			if (old_index > -1) {
				this.order_info.items.splice(old_index, 1);
			}
		});

		this.order_info.items.splice(this.order_info.items.indexOf(oii) + 1, 0, ...options);

		this.updateOrderButton();
		this.updateOrderTotal();
	}

	hasItemOptions(oii: OrderItemInfo): boolean {
		if (oii.order_item.item_option_id || !oii.order_item.item_group)
			return false;

		if (oii.options?.length)
			return true;

		return this.order_info.items.some((i) => {
			return i !== oii
				&& i.order_item.item_group == oii.order_item.item_group
				&& !!i.order_item.item_option_id;
		});
	}

	editOptions(oii: OrderItemInfo) {
		if (!this.rest.user_permission.delete_draft_items) {
			return this.showError('No tienes permiso para editar los artículos de la orden');
		}

		this.is_loading = true;
		this.sink = this.rest_item_info.get(oii.item.id).subscribe((item_info) => {
			this.is_loading = false;

			if (!item_info?.options?.length) {
				return this.showError('Este artículo ya no tiene opciones configuradas');
			}

			this.editing_order_item_info = oii;
			this.selected_item_info = item_info;
			this.selected_option_quantities = this.getSelectedOptionQuantities(oii, item_info);
			this.selected_option_notes = this.getSelectedOptionNotes(oii, item_info);
			this.show_select_options = true;
		}, (error: any) => {
			this.is_loading = false;
			this.showError(error);
		});
	}

	getSelectedOptionQuantities(oii: OrderItemInfo, item_info: ItemInfo): Record<number, number> {
		let quantities: Record<number, number> = {};

		this.getOptionOrderItems(oii).forEach((option_oii) => {
			let iovi = this.findItemOptionValue(item_info, option_oii);

			if (iovi) {
				quantities[iovi.item_option_value.id] = option_oii.order_item.item_option_qty || option_oii.order_item.qty || 0;
			}
		});

		return quantities;
	}

	getSelectedOptionNotes(oii: OrderItemInfo, item_info: ItemInfo): Record<number, string> {
		let notes: Record<number, string> = {};

		this.getOptionOrderItems(oii).forEach((option_oii) => {
			if (!option_oii.order_item.note)
				return;

			let iovi = this.findItemOptionValue(item_info, option_oii);

			if (iovi) {
				notes[iovi.item_option_value.id] = option_oii.order_item.note;
			}
		});

		return notes;
	}

	getOptionOrderItems(oii: OrderItemInfo): OrderItemInfo[] {
		return this.order_info.items.filter((i) => {
			return i.order_item.status == 'ACTIVE'
				&& i.order_item.item_group == oii.order_item.item_group
				&& !!i.order_item.item_option_id;
		});
	}

	findItemOptionValue(item_info: ItemInfo, option_oii: OrderItemInfo): ItemOptionValueInfo | null {
		let option_value: ItemOptionValueInfo | null = null;

		item_info.options.some((ioi) => {
			option_value = ioi.values.find((iovi) => {
				return iovi.item.id == option_oii.item.id
					&& iovi.item_option_value.item_option_id == option_oii.order_item.item_option_id;
			}) || null;

			return !!option_value;
		});

		return option_value;
	}

	clearOptionEdition() {
		this.editing_order_item_info = null;
		this.selected_option_quantities = {};
		this.selected_option_notes = {};
	}

	addOrderItem(order_item_info: OrderItemInfo[]): void {
		//Validar antes de mutar: si un articulo no tiene precio para la lista/tipo
		//actual, abortamos para no dejar un item sin precio (NaN) ni ocultar el
		//boton de pagar dejando la orden inconsistente.
		for (let i of order_item_info) {
			if (i.order_item.item_option_id)
				continue;

			let has_previous = this.order_info.items.some((o_oii) => {
				return o_oii.item.id == i.item.id &&
					!o_oii.order_item.item_option_id &&
					o_oii.order_item.status == 'ACTIVE' &&
					!o_oii.order_item.discount && !o_oii.order_item.discount_percent
			});

			if (has_previous)
				continue;

			let price = i.prices.find((p: Price) => {
				return p.price_type_id == this.order_info.order.price_type_id
					&& p.price_list_id == this.order_info.store.price_list_id
			});

			if (price == undefined) {
				return this.showError('El producto no tiene un precio asignado');
			}
		}

		order_item_info.forEach((i: OrderItemInfo) => {
			let price = i.prices.find((p: Price) => {
				return p.price_type_id == this.order_info.order.price_type_id
					&& p.price_list_id == this.order_info.store.price_list_id
			})

			if (price == undefined) {
				return this.showError('El producto no tiene un precio asignado');
			}

			if (!(i.order_item.item_option_id)) {
				let other_oii = this.order_info.items.find((o_oii) => {
					return o_oii.item.id == i.item.id &&
						!o_oii.order_item.item_option_id &&
						o_oii.order_item.status == 'ACTIVE' &&
						!o_oii.order_item.discount && !o_oii.order_item.discount_percent
				});

				//Si ya hay uno previo ponemos el precio del articulo anterior
				if (other_oii) {
					i.order_item.unitary_price = other_oii.order_item.unitary_price;
					i.order_item.unitary_price_meta = other_oii.order_item.unitary_price_meta;
					i.order_item.original_unitary_price = other_oii.order_item.original_unitary_price;
				}
				else {
					this.setOrderItemPrice(i.order_item, price, this.order_info.store.default_currency_id, this.order_info.order.currency_id, this.currency_rate_list);
				}
			}

			let tax = this.getItemTax(i);
			this.updateOrderItemPrice(i.order_item, tax, 0)
		});

		this.order_info.items.push(...order_item_info);
		this.updateOrderTotal();

		this.order_item_search_index = this.order_info.items.length - 1;

		setTimeout(() => {
			let current = this.viewPorts.toArray();//.forEach(el => el?.scrollToIndex?.(100, "smooth"));
			(current[current.length - 1] as any)?.scrollToIndex?.(this.order_item_search_index);
		}, 100);
	}

	removeItem(item: OrderItemInfo) {
		if (!this.rest.user_permission.delete_draft_items) {
			return this.showError('No tienes permiso para eliminar artículos');
		}

		if (item.order_item.item_option_id) {
			return;
		}

		let indexes: number[] = [];

		this.order_info.items.forEach((i, index) => {
			if (i == item) {
				indexes.push(index);
				return
			}

			if (i.order_item.item_group == item.order_item.item_group)
				indexes.push(index);
		});

		indexes.sort((a, b) => { return b < a ? 1 : -1 });

		while (indexes.length) {
			let i: number | undefined = indexes.pop();

			if (i === undefined) {
				break;
			}

			this.order_info.items.splice(i, 1);
		}

		this.updateOrderButton();
		this.updateOrderTotal();
	}

	onClientSearch(search_term: string) {
		this.client_user = null;

		if (!search_term) {
			this.client_list = [];
			this.client_search_index = -1;
			this.search_client_str = '';
			return;
		}


		this.search_client_str = search_term;
		this.client_search_subject.next(search_term);
	}

	agregarNuevoClienteConNombre(client_name: string) {
		this.show_client_list = false;
		this.client_list = [];
		this.client_search_index = -1;
		this.new_client_suggested_name = client_name;
		this.show_add_new_client = true;
	}

	noRegistrarUsuario() {
		this.client_search_index = 0;
		this.show_client_list = false;
		this.client_user = null;
		this.order_info.client = null;
		this.order_info.order.client_user_id = null;
		this.order_info.order.client_name = this.search_client_str;
		this.client_list = [];
		this.client_search_index = -1;
	}

	onSelectClient(client_user: UserBalance) {
		this.client_search_index = 0;
		this.client_user = client_user;
		this.search_client_str = client_user.name;
		this.order_info.order.client_name = client_user.name;
		this.show_client_list = false;

		let major_priority_price_type = this.price_type_list.reduce((p, c) => {
			return c.sort_priority > p.sort_priority ? c : p;
		});

		if (this.order_info.order.client_user_id != client_user.id
			&& this.order_info.order.price_type_id == major_priority_price_type.id
			&& this.order_info.order.status == 'PENDING')
			this.onPriceTypeChanged(client_user.price_type_id ?? this.order_info.order.price_type_id);

		this.order_info.order.client_user_id = client_user.id;

		this.client_list = [];
		this.client_search_index = -1;
		this.order_info.client = client_user;

		let search: SearchObject<Address> = this.getEmptySearch();
		search.limit = 99999;
		search.eq.user_id = this.client_user.id;
		search.sort_order = ['address_ASC'];

		this.comex_points = '';

		if (client_user.code && this.rest.preferences.comex_enabled)
		{
			this.loadComexPoints();
		}

		this.sink = this.rest_address
			.search(search)
			.subscribe((response) => {
				this.address_list = response.data;

				let shipping_address = response.data.find(i => i.type == 'SHIPPING' || i.type == 'BILLING_AND_SHIPPING');
				let billing_address = response.data.find(i => i.type == 'BILLING' || i.type == 'BILLING_AND_SHIPPING');

				if (shipping_address) {
					this.order_info.order.shipping_address_id = this.address_list[0].id;
					this.assignBillingAddress(shipping_address);
					this.assignShippingAddress(shipping_address);
				}

				if (billing_address) {
					this.assignBillingAddress(billing_address);
				}
			});
	}

	showAddNewClientWithName() {
		this.new_client_suggested_name = this.search_client_str;
		this.show_add_new_client = true;
		this.user_client_to_add.name = this.search_client_str;
	}

	showAddClient(_evt: any) {
		this.show_add_new_client = true;
		this.user_client_to_add.name = this.search_client_str;
	}

	showAgregarDireccion(_evt: Event) {
		if (!this.client_user) {
			return this.showError('Seleccione un cliente primero');
		}

		this.show_add_new_address = true;
		this.address.name = this.client_user.name;
		this.address.user_id = this.client_user.id;
	}

	saveAddress(evt: any) {
		this.sink = this.rest_address.create(this.address)
			.subscribe((address: Address) => {
				this.address = {
					...GetEmpty.address(),
					sat_regimen_capital: '',
					sat_regimen_fiscal: '',
					type: 'SHIPPING',
					address: ''
				};
				this.order_info.order.shipping_address_id = address.id;
				this.address_list.push(address)
				evt.target.reset();
				this.show_add_new_address = false;
			}, (error: any) => this.showError(error));
	}

	onChangeRequireDevolucion(evt: any, ii: OrderItemInfo) {
		ii.order_item.return_required = evt.target.checked ? 'YES' : 'NO';
	}

	updateOrderTotal() {

		let total: number = 0;
		let subtotal: number = 0;
		let tax: number = 0;
		let ieps: number = 0;

		let unrounded_tax: number = 0;
		let unrounded_ieps: number = 0;

		this.order_info.items.forEach((order_item_info: OrderItemInfo) => {

			if (order_item_info.order_item.original_unitary_price == 0 || order_item_info.order_item.is_free_of_charge == 'YES') {
				order_item_info.order_item.total = 0;
				order_item_info.order_item.subtotal = 0;
				order_item_info.order_item.tax = 0;
				order_item_info.order_item.ieps_calculated = 0;
				return;
			}

			if (order_item_info.order_item.discount_percent) {
				this.applyDiscountPercent(order_item_info, order_item_info.order_item.discount_percent);
			}

			let item_tax_percent = this.getItemTax(order_item_info);
			this.updateOrderItemPrice(order_item_info.order_item, item_tax_percent, 0);

			let multiply = 1;
			if (order_item_info.order_item.type == 'REFUND') {
				multiply = -1;
			}

			let prev_rounded_tax = Math.round(unrounded_tax * 100) / 100;
			let prev_rounded_ieps = Math.round(unrounded_ieps * 100) / 100;

			total += multiply * order_item_info.order_item.total;

			// IEPS calculation logic matching server
			let ieps_percent = order_item_info.order_item.ieps_type == 'RATE' ? order_item_info.order_item.ieps_value : 0;
			let ieps_fixed = order_item_info.order_item.ieps_type == 'AMOUNT' ? order_item_info.order_item.ieps_value * order_item_info.order_item.qty : 0;

			let base = (order_item_info.order_item.total - ieps_fixed) / (1 + ((item_tax_percent + ieps_percent) / 100));
			let item_unrounded_tax = base * (item_tax_percent / 100);
			let item_unrounded_ieps = (base * (ieps_percent / 100)) + ieps_fixed;

			unrounded_tax += multiply * item_unrounded_tax;
			unrounded_ieps += multiply * item_unrounded_ieps;

			let current_rounded_tax = Math.round(unrounded_tax * 100) / 100;
			let current_rounded_ieps = Math.round(unrounded_ieps * 100) / 100;

			order_item_info.order_item.tax = Math.abs(current_rounded_tax - prev_rounded_tax);
			order_item_info.order_item.ieps_calculated = Math.abs(current_rounded_ieps - prev_rounded_ieps);
			order_item_info.order_item.subtotal = order_item_info.order_item.total - order_item_info.order_item.tax - order_item_info.order_item.ieps_calculated;

			tax += multiply * order_item_info.order_item.tax;
			ieps += multiply * order_item_info.order_item.ieps_calculated;
			subtotal += multiply * order_item_info.order_item.subtotal;
		});

		this.order_info.order.total = Math.round(total * 100) / 100;
		this.order_info.order.tax = Math.round(unrounded_tax * 100) / 100;
		this.order_info.order.sat_ieps = Math.round(unrounded_ieps * 100) / 100;
		this.order_info.order.subtotal = this.order_info.order.total - this.order_info.order.tax - this.order_info.order.sat_ieps;

		this.updateOrderButton();
	}

	pay(_evt: any) {
		if (this.is_loading) {
			return;
		}

		this.is_loading = true;
		this.sink = this.saveOrderInfo('Vamos a pagar asi que vamos a guardar')
			.pipe
			(
				mergeMap((response) => {
					let notes = response.items.reduce((p, i) => p + '' + i.order_item.note, '');
					this.order_info = response;
					return this.applyOffers();
				})
			)
			.subscribe((response) => {
				this.skip_save = true;

				let notes = response.items.reduce((p, i) => p + '' + i.order_item.note, '');
				this.order_info = response;
				this.is_loading = false;

				if (this.rest.is_offline) {
					this.router.navigate(['/pos/pay-offline', 'pay', response.order.sync_id]);
				}
				else {
					setTimeout(() => {
						this.router.navigate(['/pos/pay/pay', response.order.id]);
					}, 200);
				}
			}, (error: any) => {
				console.log('Error al tratar de pagoar en pos 1269');
				this.showError(error)
			});
	}

	nuevaVenta() {
		this.show_pv_options = false;

		if (!this.order_info.order.id) {
			if (this.order_info.items.length == 0) {
				this.order_info = this.getEmptyOrderInfo();
				this.loadOrderList();
				this.search_client_str = '';
				return;
			}

			this.sink = this.saveOrderInfo('Nuevva Venta').subscribe
				({
					next: () => {
						this.order_info = this.getEmptyOrderInfo();
						this.loadOrderList();
						this.search_client_str = '';
					},
					error: (error: any) => {
						this.showError(error)
					}
				});
			return;
		}

		this.sink = this.saveOrderInfo('Nueva venta solo por guardar').subscribe(() => {
			this.router.navigate(['/pos']);
		}, (error: any) => this.showError(error));
	}

	getOrderInfo(id: any, reason: string): Observable<OrderInfo> {
		console.log('Cargando orderInfo: ' + reason);
		return this.rest_order_info.get(id);
	}

	saveOrderInfo(reason: string = 'Unknown'): Observable<OrderInfo> {
		if (this.order_info.order.status == 'CANCELLED' || this.order_info.order.status == 'CLOSED') {
			return of(this.order_info);
		}

		console.log('Saving order reason: ' + reason);
		let notes = this.order_info.items.reduce((p, i) => p + '' + i.order_item.note, '');
		//console.log("saved and notes is ",notes);

		if (!this.order_info.order.client_name) {
			let date = new Date();
			let hour = Utils.zero(date.getHours()) + ':' + Utils.zero(date.getMinutes());
			this.order_info.order.client_name = 'PÚBLICO GRAL ' + hour;
		}

		this.updateOrderTotal();

		if (this.rest.is_offline) {
			//TODO: port offline order update (old rest helper)
		return of(this.order_info);
		}

		if (this.order_info.items.length == 0) {
			return of(this.order_info);
		}


		return this.order_info.order.id
			? this.rest_order_info.update(this.order_info)
			: this.rest_order_info.create(this.order_info);
	}

	setPriceTypeColors(price_type_id: number) {
		let current_price_type = this.price_type_list.find(i => i.id == price_type_id);

		if (!current_price_type) {
			let x = this.price_type_list.map(i => JSON.stringify(i)).join(',');
			console.log('No se encontro el precio tipo', price_type_id, "---->" + x + '<------');
			return;
		}
		document.body.style.setProperty('--pv-bar-text-color', current_price_type.pv_bar_text_color);
		document.body.style.setProperty('--pv-bar-background-color', current_price_type.pv_bar_background_color);
		document.body.style.setProperty('--pv-bar-total-color', current_price_type.pv_bar_total_color);
	}

	//Ported from old RestService (~/Projects/POS/src/app/services/rest.service.ts).
	//Do not change rounding: billing depends on these exact values.
	roundTo4(value: number): number {
		return Math.round(value * 100) / 100;
	}

	roundTo2(value: number): number {
		return Math.round(value * 100) / 100;
	}

	updateOrderItemPrice(order_item: Order_Item, tax_percent: number, extra_charge_percent: number): void {
		if (order_item.tax_included == 'NO') {
			let up: number = Math.round((order_item.original_unitary_price * order_item.qty) * (1 + ((tax_percent + extra_charge_percent) / 100)) * 100) / 100;
			order_item.unitary_price = this.roundTo2(up / (1 + (tax_percent / 100)) / order_item.qty);
			order_item.subtotal = this.roundTo2(order_item.unitary_price * order_item.qty);
			order_item.tax = this.roundTo2(order_item.subtotal * (tax_percent / 100));
			order_item.total = up;
		}
		else {
			let up: number = Math.round((order_item.original_unitary_price * order_item.qty) * (1 + (extra_charge_percent / 100)) * 100) / 100;
			order_item.unitary_price = this.roundTo2(up / (1 + (tax_percent / 100)) / order_item.qty);
			order_item.subtotal = this.roundTo2(order_item.unitary_price * order_item.qty);
			order_item.tax = this.roundTo2(order_item.subtotal * (tax_percent / 100));
			order_item.total = Math.round(up * 100) / 100;
		}
	}

	setOrderItemPrice(ii: Order_Item, price: Price, default_currency_id: string, order_currency_id: string, rates: Currency_Rate[]): boolean {
		if (price.currency_id == order_currency_id) {
			ii.original_unitary_price = price.price;
			ii.unitary_price_meta = price.price;
			return true;
		}

		let cr: Currency_Rate | undefined = rates.find((r) => {
			if (order_currency_id == default_currency_id) {
				return r.currency_id == price.currency_id;
			}

			return r.currency_id == order_currency_id;
		});

		if (!cr) {
			this.showError('No se encontro el tipo de cambio para la moneda ' + price.currency_id);
			return false;
		}

		if (default_currency_id == order_currency_id) {
			ii.original_unitary_price = price.price * cr.rate;
			ii.unitary_price_meta = price.price * cr.rate;
		}
		else {
			ii.original_unitary_price = price.price / cr.rate;
			ii.unitary_price_meta = price.price / cr.rate;
		}

		return true;
	}

	searchByCode(code: string): Promise<RestResponse<ItemInfo>> {
		//TODO: port offline code search (old rest.searchByCode used IndexedDB)
		return firstValueFrom(this.rest_item_info.search({
			eq: { code } as never,
			limit: 1,
			search_extra: { store_id: this.order_info.order.store_id }
		}));
	}

	searchOfflineItemInfo(name: string): Observable<RestResponse<ItemInfo>> {
		//TODO: port offline item search (old rest.searchOfflineItemInfo used IndexedDB)
		return this.rest_item_info.search({
			eq: { on_sale: 'YES', status: 'ACTIVE' },
			limit: 20,
			search_extra: { category_name: name, store_id: this.order_info.order.store_id }
		});
	}

	//Ported from old RestService order helpers (~/Projects/POS/src/app/services/rest.service.ts).
	apiUpdateOrderDeliveryStatus(order_id: number, delivery_status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READY_TO_PICKUP', commanda_type_id: number | null = null): Observable<Order> {
		return this.rest.update('updateOrderDeliveryStatus', { order_id, delivery_status, commanda_type_id }) as Observable<Order>;
	}

	apiCancelOrder(order_id: number, cancellation_reason = 'N/A'): Observable<any> {
		return this.rest.update('cancelOrder', { order_id, cancellation_reason }).pipe(
			mergeMap((response) => {
				this.rest.sendNotification('order', order_id);
				return of(response);
			})
		);
	}

	apiSetOrderActive(order_id: number): Observable<any> {
		return this.rest.update('setOrderActive', { order_id });
	}

	apiRemoveOrderItem(order_item_id: number): Observable<any> {
		return this.rest.update('cancelOrderItem', { order_item_id });
	}

	calcExchangeRate(order_currency_id: string, default_currency_id: string, target_currency_id: string, currency_rate_list: Currency_Rate[]): number {
		if (order_currency_id == target_currency_id || currency_rate_list.length == 0)
			return 1;

		let currency_rate = currency_rate_list.find((r: Currency_Rate) => {
			if (order_currency_id == default_currency_id) {
				return r.currency_id == target_currency_id;
			}

			return r.currency_id == order_currency_id;
		});

		if (!currency_rate)
			return 1;

		return default_currency_id == order_currency_id
			? currency_rate.rate
			: 1 / currency_rate.rate;
	}

	getEmptyOrderInfo(): OrderInfo {
		let price_type_id: number = this.price_type_list.length ? this.price_type_list[0].id : 1; //Posible error
		let store_id = this.rest.user!.store_id;

		let store = this.store_list.find(store => store.id == store_id) as Store;
		let tax_percent = 0;

		if (store) {
			tax_percent = store.tax_percent;
		}

		let version_created = this.rest.getVersion();
		let items: OrderItemInfo[] = [];
		let order: Order = {
			address: '',
			amount_paid: 0,
			ares: 0,
			authorized_by: null,
			billing_address_id: null,
			billing_data_id: store?.default_billing_data_id,
			cancellation_reason: '',
			cancellation_timestamp: null,
			cancelled_by_user_id: null,
			cashier_user_id: this.rest.user!.id,
			city: '',
			client_name: '',
			client_user_id: null,
			closed_timestamp: null,
			consignment_delivered_id: null,
			created: new Date(),
			currency_id: 'MXN',
			delivery_schedule: null,
			delivery_status: 'PENDING',
			delivery_user_id: null,
			discount: 0,
			discount_calculated: 0,
			external_id: null,
			facturacion_code: '',
			facturado: 'NO',
			guests: 1,
			id: 0,
			initial_payment: 0,
			lat: null,
			lng: null,
			marked_for_billing: 'NO',
			note: '',
			paid_status: 'PENDING',
			paid_timetamp: null,
			period_id: null,
			price_type_id: price_type_id,
			quote_id: null,
			sat_codigo_postal: null,
			sat_domicilio_fiscal_receptor: '',
			sat_exchange_rate: 0,
			sat_factura_id: null,
			sat_forma_pago: '99',
			sat_ieps: 0,
			sat_isr: 0,
			sat_pdf_attachment_id: null,
			sat_razon_social: null,
			sat_receptor_email: null,
			sat_receptor_rfc: '',
			sat_regimen_capital_receptor: '',
			sat_regimen_fiscal_receptor: '',
			sat_serie: store?.default_sat_serie || 'A',
			sat_serie_consecutive: null,
			sat_uso_cfdi: '',
			sat_xml_attachment_id: null,
			service_type: 'QUICK_SALE',
			shipping_address_id: null,
			shipping_cost: 0,
			state: null,
			status: 'PENDING',
			store_consecutive: null,
			store_id: this.rest.user!.store_id as number,
			suburb: null,
			subtotal: 0,
			sync_id: this.rest.getSyncId(),
			system_activated: null,
			table_id: null,
			tag: '',
			tax: 0,
			tax_percent: tax_percent,
			total: 0,
			updated: new Date(),
			version_created,
			version_updated: version_created
		};

		let price_type = this.price_type_list.find((i) => i.id == price_type_id);

		let empty: OrderInfo = {
			items,
			order,
			cashier: this.rest.user,
			delivery_user: null,
			client: null,
			store: store,
			purchase: null,
			offers: [],
			price_type: price_type as Price_Type
		};
		this.setPriceTypeColors(price_type_id);
		return empty;
	}

	loadOrderList() {
		if (!this.rest.is_offline) {
			let date = new Date();
			date.setHours(0, 0, 0, 0);

			let ge = this.rest.preferences.pv_show_orders == 'ALL_OPEN'
				? {} : { created: date };

			this.sink = this.rest_order.search
				({
					eq: { store_id: this.rest.user!.store_id as number, paid_status: 'PENDING' },
					ge,
					csv: { status: ['ACTIVE', 'PENDING'] },
					sort_order: ['name_ASC', 'id_DESC'],
					limit: 99999
				}).subscribe((response) => {
					this.order_list = response.data;
				});
		}
	}

	onOrderSearchChange(order_id: number | null) {
		//console.log( order_id );
		if (order_id) {
			this.is_loading = true;
			this.sink = this.saveOrderInfo('Cargar otra order diferente orden diferente')
				.subscribe((order_info: OrderInfo) => {
					this.order_info = order_info;
					this.loadUserBalance();
					this.is_loading = false;
					this.router.navigate(['/pos', order_id]);
				}
					, (error: any) => {
						this.showError(error);
					})
		}
	}

	searchUserBalance(user_id: number): Observable<UserBalance | null> {
		if (this.rest.is_offline) {
			return of(null);
		}

		if (!this.order_info.client?.id) {
			return of(null);
		}

		return this.rest_user.search({ csv: { id: [this.order_info.client.id] }, limit: 1 }).pipe
			(
				mergeMap((response) => {

					if (response.data.length)
						return of(response.data[0] as unknown as UserBalance);

					return of(null);
				})
			);
	}

	loadUserBalance() {
		if (this.order_info.client && !this.rest.is_offline) {
			this.sink = this.searchUserBalance(this.order_info.client.id)
				.subscribe((response) => {
					this.client_user = response;
				});
		}
	}

	onNewClient(user: UserInfo | null): void {
		this.show_add_new_client = false;

		if (user == null) {
			return console.log('cliente es nullo');
		}

		if (!user.user) {
			return console.log('cliente es nullo');
		}

		this.order_info.client = user.user;

		this.sink = this.searchUserBalance(user.user.id)
			.subscribe((response) => {
				if (response) {
					this.onSelectClient(response);
				}
			});

		if( this.order_info.order.id )
		{
			this.sink = this.saveOrderInfo('Nuevo cliente se asingo el cliente')
			.subscribe((response) => {
				this.order_info = response;
				console.log('Se guardo la orden');
			});
		}

		if (user.shipping_address) {
			this.assignBillingAddress(user.shipping_address);
			this.assignShippingAddress(user.shipping_address);
		}

		if (user.billing_address) {
			this.assignBillingAddress(user.billing_address);
		}
	}

	assignShippingAddress(address: Address) {
		if (address.address)
			this.order_info.order.address = address.address;

		if (address?.lng) {
			this.order_info.order.address = address.address;
			this.order_info.order.lng = address?.lng;
			this.order_info.order.lat = address?.lat;
		}
	}

	assignBillingAddress(address: Address) {
		if (address?.rfc)
			this.order_info.order.sat_receptor_rfc = address?.rfc;

		if (address.name)
			this.order_info.order.sat_razon_social = address.name;

		if (address?.email)
			this.order_info.order.sat_receptor_email = address.email

		if (address.sat_regimen_fiscal)
			this.order_info.order.sat_regimen_fiscal_receptor = address.sat_regimen_fiscal;

		if (address.sat_regimen_capital)
			this.order_info.order.sat_regimen_capital_receptor = address.sat_regimen_capital;

		if (address.zipcode)
			this.order_info.order.sat_domicilio_fiscal_receptor = address.zipcode;
	}

	onModalFondoCerro(seAgrego: boolean): void {
		//console.log("Se agrego fondo",seAgrego);
		this.show_agregar_fondo = false;

		if(seAgrego)
		{
			setTimeout(() => {
				printHtml('.', '');
			}, 50);
		}


		if (this.store?.max_cash_amount) {
			//TODO: port cashier cash amounts report (old rest.getCashierCashAmounts)
			this.block_payment = false;
		}
	}

	onExpenseAdded(payment_info: PaymentInfo | null): void {
		if (payment_info) {
			this.showSuccess('El pago se guardó exitosamente');
		}

		this.show_add_gasto = false;
		this.show_add_retiro = false;

		// Recompute the cashier's drawer balance so the "max cash allowed" warning
		// reflects the withdrawal that was just made (withdrawals lower CASH).
		if (this.store?.max_cash_amount) {
			//TODO: port cashier cash amounts report (old rest.getCashierCashAmounts)
			this.block_payment = false;
		}
	}

	onWithdrawalAdded(): void {
		this.show_add_gasto = false;
		this.show_add_retiro = false;

		if (this.store?.max_cash_amount) {
			//TODO: port cashier cash amounts report (old rest.getCashierCashAmounts)
			this.block_payment = false;
		}
	}

	/* SE llega a utilizar esto??? */
	taxIncludedClick(evt: MouseEvent) {
		let checkbox = evt.target as HTMLInputElement;
		this.new_price_tax_included = checkbox.checked;
	}

	ordenarACommanda() {
		this.sink = this.saveOrderInfo('Agregar ordenes a comandas 2')
			.pipe
			(
				mergeMap((oi: OrderInfo) => {
					this.order_info = oi;
					return this.rest.update('addOrderItemsToCommanda', { order_id: oi.order.id })
				})
			)
			.subscribe((_responses) => {
				if (this.order_info.order.id) {
					if (!this.route.snapshot.paramMap.has('id')) {
						this.rest.sendNotification('order', this.order_info.order.id);
						//TODO: port updateCommandas socket emit (old rest helper)
						this.router.navigate(['/pos', this.order_info.order.id]);
						return;
					}
				}
				this.order_info.order.status = 'ACTIVE';
				this.rest.sendNotification('order', this.order_info.order.id);
				//TODO: port updateCommandas socket emit (old rest helper)
				this.updateOrderTotal();
				this.showSuccess('La orden se actualizó exitosamente');
			}, (error: any) => this.showError(error));
	}

	updateOrderButton() {
		let first_check = this.order_info.items.length && (this.order_info.order.service_type != 'QUICK_SALE');
		this.show_order_button = first_check || this.order_info.items.some(i => i.item.commanda_type_id !== null);
	}

	override ngOnDestroy() {
		//!this.show_receive_payment para que no salga el mensaje de errro
		//cuando se esta haciendo un pago
		//La orden de todos modos se guarda en el modal del pago
		//y antes de mostrar el modal del pago

		if (this.skip_save || this.show_receive_payment) {
			super.ngOnDestroy();
			return;
		}

		if (this.order_info.items.length && !this.show_receive_payment) {
			//If show receive payment is already saved
			if (!this.show_receive_payment) {
				this.sink = this.saveOrderInfo('On Destroy').subscribe
					(
						(order_info: OrderInfo) => {
							//Condicion de carrera esto hace que falle en ordenes muy grandes
							//this.order_info = order_info;
							super.ngOnDestroy();
						},
						(error: any) => {
							//this.showError('La orden no se pudo guardar');
							super.ngOnDestroy()
						}
					);
			}
		}
		else {
			super.ngOnDestroy();
		}
	}

	clickOnException(item_exception: ItemExceptionCliclable) {
		if (!this.selected_order_item) {
			return;
		}

		if (this.selected_order_item.order_item.item_option_id) {
			return;
		}

		if (!this.selected_order_item.order_item.exceptions) {
			this.selected_order_item.order_item.exceptions = '';
		}

		this.selected_order_item.order_item.exceptions.replaceAll('\n •' + item_exception.description, '');

		let index = this.selected_order_item.order_item_exceptions
			.findIndex((oie) => {
				return oie.item_exception_id == item_exception.id
			});

		this.selected_order_item.order_item.exceptions = this.selected_order_item.order_item.exceptions.replaceAll('\n•' + item_exception.description, '');
		this.selected_order_item.order_item.exceptions = this.selected_order_item.order_item.exceptions.replaceAll('•' + item_exception.description, '');

		if (index >= 0) {
			this.checked_exceptions[item_exception.id] = false;
			this.selected_order_item.order_item_exceptions.splice(index, 1);
			item_exception.selected = false;
		}
		else {
			this.checked_exceptions[item_exception.id] = true;

			let str = this.selected_order_item.order_item.exceptions + '\n•' + item_exception.description;
			this.selected_order_item.order_item.exceptions = str.trim();

			this.selected_order_item.order_item_exceptions.push({
				id: 0,
				item_exception_id: item_exception.id,
				order_item_id: this.selected_order_item.order_item.id,
				description: item_exception.description,
				stock_item_id: item_exception.stock_item_id,
				created: new Date(),
				updated: new Date()
			});
			item_exception.selected = true;
		}
	}

	//Muestra una lista de excepciones predefinidas
	//
	showOrderItemExceptions() {
		let selected_order_item = this.order_info.items[this.order_item_search_index] ?? null;

		if (!selected_order_item) {
			return;
		}

		this.selected_order_item = selected_order_item;

		this.selected_item_exceptions = selected_order_item.order_item.item_option_id
			? []
			: selected_order_item.exceptions.map((ie) => {
				return {
					...ie,
					selected: selected_order_item.order_item_exceptions?.some((oie) => {
						return ie.id == oie.item_exception_id;
					})
				};
			});

		this.show_order_item_exceptions = true;
	}

	onPriceTypeChanged(price_type_id: number): void {
		// Lista de articulos problematicos
		// Regresa la lista de articulos que no tienen un precio
		let problem_oii = this.order_info.items.filter((oii) => {
			let price = oii.prices.find(p => p.price_type_id == price_type_id && p.price_list_id == this.order_info.store.price_list_id);
			//Siu el articulo no tiene precio entonces se regresa
			return price == undefined;
		});

		//La lista de articulos debe ser Zero
		if (problem_oii.length) {
			let s_i = this.rest.preferences.display_categories_on_items == 'YES';

			problem_oii.forEach((oii) => {
				let i_name = s_i && oii.category ? oii.category.name + ' ' + oii.item.name : oii.item.name;
				this.showError('El articulo "' + i_name + '" no tiene precio asignado para el tipo de consumo');
			});
		}

		this.order_info.order.price_type_id = price_type_id;
		let new_price_type = this.price_type_list.find(pt => pt.id == price_type_id);

		if (new_price_type) {
			this.order_info.price_type = new_price_type;
		}
		this.setPriceTypeColors(price_type_id);
		this.updatePrices(this.order_info.items);
		this.updateOrderTotal();
	}

	onSelectDoubleClick(oii: OrderItemInfo) {
		if (oii.item.has_serial_number == 'YES')
			return;

		//console.log('Double click');
		this.onSelectOrderItem(oii);

		this.selected_order_item_qty = oii.order_item.qty;

		if (this.isOrderItemQtyEditable(oii)) {
			this.selected_order_item_qty = oii.order_item.qty;
			this.edit_qty_type = 'AMOUNT';
			this.show_edit_qty = true;
		}
	}

	onSelectOrderItem(order_item_info: OrderItemInfo, evt: Event | null = null) {
		if (evt) {
			//console.log('Click', evt );
		}

		this.selected_order_item = order_item_info;
		this.active_list = 'order_item_list';
		let index = this.order_info.items.findIndex((oii) => oii == order_item_info);
		//console.log('Selected item',index);

		if (index > -1) {
			this.order_item_search_index = index;
		}
	}

	setOrderType(service_type: 'IN_PLACE' | 'TOGO' | 'PICK_UP' | 'QUICK_SALE') {
		this.order_info.order.service_type = service_type;
		this.show_delivery_options = false;

		if (this.order_info.order.service_type != 'QUICK_SALE') {
			this.show_order_button = true;
		}

		if (this.order_info.order.client_user_id && this.order_info.order.service_type == 'TOGO' && this.address_list.length == 0) {
			this.show_add_new_address = true;
		}

		let require_date = ['TO_GO','PICK_UP'];

		if (require_date.includes( service_type ) )
		{
			this.show_assign_delivery_date = true;

			if( !this.order_info.order.delivery_schedule )
			{
				let date = new Date();
				date.setMinutes(date.getMinutes() + 5);
				this.order_info.order.delivery_schedule = Utils.getLocalMysqlStringFromDate(new Date());
			}
		}
		else
		{
			this.order_info.order.delivery_schedule = null;
		}
	}

	onSelectDeliveryAddress(address: Address) {
		this.order_info.order.shipping_address_id = address.id;
		this.order_info.order.address = address.address;
		//this.order_info.order.city	= address.city;
		//this.order_info.order.suburb	= address.suburb;
		//this.order_info.order.state	= address.state;
		this.order_info.order.lat = address.lat;
		this.order_info.order.lng = address.lng;
		this.show_delivery_address = false;
	}

	showAddNewAddress() {
		this.show_delivery_address = false;
		this.show_add_new_address = true;
	}

	onAddressChange(address: Address) {
		if (address == null)
			return;

		console.log('Si cambio la direccion');
		let index = this.address_list.findIndex((i) => i.id == address.id);
		if (index > -1) {
			this.address_list.splice(index, 1, address);
		}
		else {
			this.address_list.push(address);
		}
		this.order_info.order.shipping_address_id = address.id;
		this.show_add_new_address = false;
	}

	updateOrderDeliveryStatus(delivery_status: 'READY_TO_PICKUP' | 'SENT') {
		this.sink = this.apiUpdateOrderDeliveryStatus(this.order_info.order.id, delivery_status)
			.subscribe(() => {
				this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
					this.router.navigate(['/pos', this.order_info.order.id]);
				});

			}, (error: any) => { this.showError(error) });
	}

	showSelectDeliveryUser() {
		this.show_asign_delivery_user = true;
	}

	onDeliveryUserSelected(user: User) {
		this.show_asign_delivery_user = false;
		this.order_info.order.delivery_user_id = user.id;
	}

	cancelOrder() {
		this.sink = this.confirmation.showConfirmAlert
			(
				this.order_info,
				'Cancelar Orden',
				'Estas seguro de querer cancelar la orden'
			)
			.subscribe((response) => {
				if (response.accepted) {
					if (this.order_info.order.id) {
						this.sink = this.apiCancelOrder(this.order_info.order.id).subscribe(() => {
							this.showSuccess('La orden fue cancelada con exito');
							this.router.navigateByUrl('/', { skipLocationChange: true })
								.then(() => {
									this.router.navigate(['/pos'], { replaceUrl: true });
								});
						}, (error: any) => this.showError(error));
					}
					else {
						this.nuevaVenta();
					}
				}
			});
	}

	showOrderReturnSearch() {
		this.show_pv_options = false;
		this.show_return_order_search = true;
	}

	cancelReturnOrderId() {
		this.return_order_id = null;
		this.show_return_order = false;
		this.show_return_order_search = false;
	}

	showReturnOrder(order_id: number, evt: Event | null = null) {
		if (evt != null) {
			evt.preventDefault();
			evt.stopPropagation();
		}

		if (!order_id) {
			return;
		}

		this.show_return_order_search = false;
		this.return_order_id = order_id;
		this.show_return_order = true;
	}

	onOrderReturnedSuccessfully(returns_info: ReturnsInfo) {
		//let x = window.open('/#/print-return-receipt/'+returns_info.returns.id+'/print=1');
		this.show_return_order = false;
		this.return_order_id = null;
		this.show_return_order_search = false;
	}

	setOrderActive() {
		if (this.order_info.order.id) {
			this.sink = this
				.apiSetOrderActive(this.order_info.order.id)
				.subscribe(() => {
					this.showSuccess('La orden fue activada con exito');
					this.router.navigateByUrl('/', { skipLocationChange: true })
						.then(() => {
							this.router.navigate(['/pos', this.order_info.order.id], { replaceUrl: true });
						});
				}, (error: any) => this.showError(error));
		}
		else {
			this.sink = this.saveOrderInfo().pipe
				(
					mergeMap((order_info) => {
						this.order_info = order_info;
						this.rest.sendNotification('order', order_info.order.id);
						return this.apiSetOrderActive(this.order_info.order.id)
					})
				)
				.subscribe(() => {
					this.showSuccess('La orden fue activada con exito');

					this.router.navigateByUrl('/', { skipLocationChange: true })
						.then(() => {
							this.router.navigate(['/pos', this.order_info.order.id], { replaceUrl: true });
						});
				}, (error: any) => {
					this.showError(error)
				});
		}
	}

	categoryIdChange(category_id: number) {

	}

	edit_qty_type: 'AMOUNT' | 'PRICE' = 'AMOUNT';
	selected_order_item_qty: number = 1;
	show_edit_qty: boolean = false;
	selected_order_item_discount_percent: number = 0;
	selected_order_item_discount: number = 0;

	onSelectedItemQtyChanged(evt: Event) {
		evt.preventDefault();
		evt.stopPropagation();

		if (this.selected_order_item?.stock_record && this.selected_order_item.item.availability_type === 'ON_STOCK') {
			let current_item_qty = this.getCurrentItemQtyInOrder(this.selected_order_item.item.id);
			let new_total_qty = current_item_qty - this.selected_order_item.order_item.qty + this.selected_order_item_qty;

			if (new_total_qty > this.selected_order_item.stock_record.qty) {
				this.showError(`No hay suficiente inventario para ${this.selected_order_item.item.name}`);
				return;
			}
		}

		if (!this.selected_order_item) {
			return;
		}

		this.updateOrderItemValue(this.selected_order_item, this.selected_order_item_qty);
		this.show_edit_qty = false;
		this.focusSearch();
	}

	isOrderItemQtyEditable(oii: OrderItemInfo) {
		if (oii.order_item.delivery_status == 'DELIVERED') {
			return false;
		}

		if (oii.order_item.item_option_id) {
			return false;
		}

		if (oii.batches && oii.batches.length > 1) {
			return false;
		}

		return (!oii.order_item.id || this.order_info.order.status == 'PENDING') && !oii.order_item.item_option_id;
	}

	confirmRemoveElement(oii: OrderItemInfo | null) {
		if (!oii) {
			return;
		}

		this.sink = this.confirmation.showConfirmAlert(oii, 'Eliminar Artículo', 'Se eliminaran el artículo de la orden')
			.subscribe((response) => {

				if (response.accepted) {
					this.is_loading = true;
					this.sink = this.apiRemoveOrderItem(oii.order_item.id).subscribe(() => {
						this.order_info.items = this.order_info.items.filter((oi) => oi.order_item.item_group != oii.order_item.item_group);

						if (this.order_info.order.id) {
							this.rest.sendNotification('order', this.order_info.order.id);
						}

						this.is_loading = false;
					}, (error: any) => this.showError(error));
				}
			})
	}

	generateUUID(): string { // Public Domain/MIT
		var d = new Date().getTime();//Timestamp
		var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16;//random number between 0 and 16
			if (d > 0) {//Use timestamp until depleted
				r = (d + r) % 16 | 0;
				d = Math.floor(d / 16);
			} else {//Use microseconds since page-load if supported
				r = (d2 + r) % 16 | 0;
				d2 = Math.floor(d2 / 16);
			}
			return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
		});
	}

	onClosePayment(close: boolean) {
		if (close === false) {
			console.log('Se cerro el pago');

			if (this.order_info.order.id) {
				console.log('Hay que aplicar el descuento', this.order_info.order.discount);

				this.subs.sink = forkJoin
					({
						amount: this.rest.updatePath('apply_system_coupon', { order_id: this.order_info.order.id, coupon_code: 'AMOUNT', amount: 0 }),
						percent: this.rest.updatePath('apply_system_coupon', { order_id: this.order_info.order.id, coupon_code: 'PERCENT', amount: 0 }),
					})
					.subscribe((x) => {
						console.log('Se actualizo el precio de la orden', x);
						this.router.navigate(['/pos', this.order_info.order.id], { replaceUrl: true });
					}
						, (error: any) => {
							console.log('Fale ferga la fida', error);
							//IIIIII FALIO FER LA FIDA
							//en la practica no hay pedo pero pos haber si no nos agarra mal parqueados
							this.router.navigate(['/pos', this.order_info.order.id], { replaceUrl: true });
						})
			}
			else //Offline
			{
				this.router.navigate(['/pos/offline', this.order_info.order.sync_id], { replaceUrl: true });
			}
		}
		else {
			console.log('Se cerro el pago con true');
		}
	}

	showInterfase(option: 'TACTILE' | 'KEYBOARD') {
		this.show_pv_options = false;
		this.search_type = option;
	}

	enableOfflineSearch(): void {
		//this.show_pv_options = false;
		this.rest._offline_search_enabled = true;
	}

	disableOfflineSearch(): void {
		this.rest._offline_search_enabled = false;
	}

	get isAnyModalOpen(): boolean {
		return this.show_corte_caja || this.show_add_new_client || this.show_select_options || this.show_add_gasto || this.show_add_retiro ||
			this.show_add_new_address || this.show_receive_payment || this.show_agregar_fondo ||
			this.show_edit_qty || this.show_add_discount || this.show_order_item_exceptions || this.show_serial_item ||
			this.show_return_order_search || this.show_return_order_id_selection || this.show_order_closed ||
			this.show_change_order_item_price || this.show_batch_selection || this.show_ask_dinners || this.show_order_note ||
			this.show_assign_delivery_date || this.show_pv_options || this.show_order_item_exceptions;
	}

	focusSearch() {
		if (this.input_search && this.input_search.nativeElement) {
			setTimeout(() => {
				this.input_search.nativeElement.focus();
			}, 100);
		}
	}

	selected_order_item_total_original: number = 0;
	showAddDiscount() {
		this.discount_type = 'PERCENT';
		let index = (this.order_item_search_index > this.order_info.items.length || this.order_item_search_index < 0)
			? 0
			: this.order_item_search_index;

		this.selected_order_item = this.order_info.items[index || 0];

		this.selected_order_item_discount_percent = this.selected_order_item.order_item.discount_percent || 0;
		this.selected_order_item_discount = this.selected_order_item.order_item.discount || 0;

		if (this.selected_order_item.order_item.tax_included == 'YES') {
			this.selected_order_item_total_original = this.selected_order_item.order_item.unitary_price_meta * this.selected_order_item.order_item.qty;
		}
		else {
			this.selected_order_item_total_original = (this.selected_order_item.order_item.unitary_price_meta * (1 + this.order_info.order.tax_percent / 100)) * this.selected_order_item.order_item.qty;
		}

		this.show_add_discount = true;
	}

	applyDiscount() {
		if (!this.selected_order_item) {
			return;
		}

		if (this.discount_type == 'PERCENT') {
			this.applyDiscountPercent(this.selected_order_item, this.selected_order_item_discount_percent);
		}
		else {
			this.applyDiscountAmount(this.selected_order_item, this.selected_order_item_discount);
		}
		if (this.show_add_discount) {
			this.show_add_discount = false;
		}
		this.updateOrderTotal();
		this.focusSearch();
	}

	applyDiscountPercent(selected_order_item: OrderItemInfo, discount_percent: number) {
		//Si trae una oferta aplicada ya no se puede hacer descuento
		if (!selected_order_item.order_item.offer_id) {
			let tax_percent = selected_order_item.item.applicable_tax == 'EXEMPT' ? 0 : this.order_info.order.tax_percent;
			selected_order_item.order_item.discount_percent = discount_percent;
			selected_order_item.order_item.original_unitary_price = selected_order_item.order_item.unitary_price_meta;

			if (selected_order_item.order_item.tax_included == 'YES') {
				selected_order_item.order_item.original_unitary_price = selected_order_item.order_item.unitary_price_meta * (1 - discount_percent / 100);
			}
			else {
				selected_order_item.order_item.original_unitary_price = (selected_order_item.order_item.unitary_price_meta * (1 + tax_percent/100)) * (1 - discount_percent / 100);
			}

		}
		//let tax = selected_order_item.item.applicable_tax == 'DEFAULT' ? this.order_info.order.tax_percent : 0;
		let tax = this.getItemTax(selected_order_item);
		this.updateOrderItemPrice(selected_order_item.order_item, tax, 0);
	}

	applyDiscountAmount(selected_order_item: OrderItemInfo, discount_amount: number) {
		this.show_add_discount = false;

		if (!selected_order_item.order_item.offer_id) {
			let tax_percent = selected_order_item.item.applicable_tax == 'EXEMPT' ? 0 : this.order_info.order.tax_percent;

			selected_order_item.order_item.original_unitary_price = selected_order_item.order_item.unitary_price_meta;
			let percent = Math.round(discount_amount / selected_order_item.order_item.unitary_price_meta * 100);

			if (selected_order_item.order_item.tax_included == 'YES') {
				selected_order_item.order_item.original_unitary_price = selected_order_item.order_item.unitary_price_meta - discount_amount;
			}
			else {
				let price_base = selected_order_item.order_item.unitary_price_meta * (1 + tax_percent) - discount_amount;
				selected_order_item.order_item.original_unitary_price = Math.round(price_base / (1 + tax_percent) * 100) / 100;
			}
		}

		//selected_order_item.order_item.discount_percent = (1-(discount_amount/(original_price/selected_order_item.order_item.qty)))*100;
		//let tax = selected_order_item.item.applicable_tax == 'DEFAULT' ? this.order_info.order.tax_percent : 0;
		let tax = this.getItemTax(selected_order_item);
		this.updateOrderItemPrice(selected_order_item.order_item, tax, 0);
	}

	toggleOrderItemToRefund() {
		this.selected_order_item = this.order_info.items[this.order_item_search_index];
		if (this.selected_order_item.order_item.type == 'REFUND') {
			this.selected_order_item.order_item.type = 'NORMAL';
		}
		else {
			this.selected_order_item.order_item.type = 'REFUND';
		}
		this.updateOrderTotal();
	}

	applyOffers(): Observable<OrderInfo> {
		if (!this.order_info.order.id) {
			return of(this.order_info);
		}

		let m = new Map(); //item_id map
		let mm = new Map(); //category map
		let mmm = new Map(); // tag map

		for (let oii of this.order_info.items) {
			if (oii.order_item.item_option_id)
				continue;

			m.set(oii.order_item.item_id, true);

			if (oii.item.category_id) {
				mm.set(oii.item.category_id, true)
			}

			if (oii.item.json_tags) {
				for (let tag of oii.item.json_tags) {
					mmm.set(tag, true);
				}
			}
		}

		let ids = [...m.keys()]
		let category_ids = [...mm.keys()];
		let tag_ids = [...mmm.keys()];

		return forkJoin
			({
				offers_by_item: this.rest_offer.search({ csv: { item_id: ids } }),
				offers_by_category: this.rest_offer.search({ csv: { category_id: category_ids } }),
				offers_by_tag: this.rest_offer.search({ csv: { tag: tag_ids } })
			})
			.pipe
			(
				mergeMap((response) => {

					let d = response.offers_by_item.data
						.concat(response.offers_by_category.data)
						.concat(response.offers_by_tag.data);

					let filter = (o: Offer) =>
					{
						if( o.price_type_id == null )
						{
							return true;
						}

						return o.price_type_id == this.order_info.order.price_type_id;
					};

					let data = d.filter( filter );
					let total = data.length;

					return of({ total, data });
				}),
				mergeMap((response) => {
					let offer_ids = response.data.map(offer => offer.id).join(',');

					if (offer_ids.length == 0)
					{
						console.log('No se aplicaron ofertas no hay');
						return of(this.order_info);
					}

					//console.log('Apply Offers');

					let d = new Date();
					let minutes_offset = d.getTimezoneOffset();

					return this.rest.update('applyOffers', { order_id: this.order_info.order.id, offer_ids, minutes_offset });
				}),
				mergeMap((_response) => {
					let reason = 'Get update order info because offer where applied';
					return this.getOrderInfo(this.order_info.order.id, reason);
					//this.rest_order_info.get( this.order_info.order.id )
				}),
				mergeMap((response) => {
					console.log('SOME ERROR?', response);

					let notes = response.items.reduce((p, i) => p + "\n" + i.order_item.note, '');
					console.log("ewta debe traer la oferta ", notes);
					return of(response);
				})
			);
	}

	ceil2(x: number) {
		return Math.ceil(x * 100) / 100;
	}

	showChangePrice(oii: OrderItemInfo | null) {
		if (!oii) {
			return;
		}

		this.selected_order_item = oii;
		this.show_change_order_item_price = true;
		this.new_price_change_type = '';

		//TODO: port getUsersWithPermission filter (old rest helper)
		this.sink = this.rest_user.search({ limit: 50 })
			.subscribe((response) => {
				this.manager_user_list = response.data;
			});
	}

	onChangeOrderItemPrice(_evt: Event) {
		if (!this.selected_order_item || !this.new_price) {
			return;
		}

		let selected_order_item = this.selected_order_item;
		let new_price = this.new_price;

		if (this.rest.user_permission.store_prices || this.rest.user_permission.global_prices) {
			this.changeOrderItemPrice
				(
					this.new_price_change_type == 'ALWAYS' ? 'ALWAYS' : 'ONCE',
					selected_order_item.order_item,
					new_price
				);
		}
		else {
			let permissions = 'price_store,global_prices,price_types';

			this.sink = this.rest.checkPermissions
				(
					this.new_price_manager_user,
					this.new_price_password,
					permissions
				)
				.subscribe((response) => {
					this.changeOrderItemPrice(
						this.new_price_change_type == 'ALWAYS' ? 'ALWAYS' : 'ONCE',
						selected_order_item.order_item,
						new_price
					);
				});
		}
	}

	onChangeItemPrice(event: Event) {
		let item_info = this.selected_item_info;
		let price = this.new_price;

		if (!item_info || !price) {
			return;
		}

		let iprice = item_info.item?.reference_price || 1;

		let p: Price = {
			...GetEmpty.price(),
			price,
			item_id: item_info.item.id,
			percent: (price / iprice) * 100,
			currency_id: this.order_info.order.currency_id,
			price_type_id: this.order_info.order.price_type_id,
			updated: new Date(),
			price_list_id: this.order_info.store.price_list_id
		};
		this.sink = this.rest_price.create(p).subscribe(() => {
			this.showSuccess('El precio se actualizo correctamente');
			this.show_change_item_price = false;
		}, (error: any) => this.showError(error));
	}

	showChangeItemPrice(oii: OrderItemInfo) {
		this.selected_order_item = oii;
		this.show_change_order_item_price = true;
	}

	showChangeOrderItemPrice(item_info: ItemInfo) {
		this.selected_item_info = item_info;
		this.show_change_item_price = true;
	}

	changeOrderItemPrice(change_type: 'ALWAYS' | 'ONCE', order_item: Order_Item, price: number) {
		if (!this.selected_order_item) {
			return;
		}

		let selected_order_item = this.selected_order_item;

		if (change_type == 'ONCE') {
			order_item.unitary_price_meta = price;
			order_item.original_unitary_price = price;
			order_item.tax_included = 'YES';

			// Para corregir el bug de cuando se cambia primero el precio y luego se incrementa.
			// las siguientes 4 lineas

			let oii2 = this.order_info.items.find((oi) => oi.order_item == order_item);

			if (!oii2) {
				return;
			}

			let p = oii2.prices.find(p => p.price_list_id == this.order_info.store.price_list_id && p.price_type_id == this.order_info.order.price_type_id);

			if (!p) {
				return;
			}

			p.tax_included = 'YES';
			p.price = price;


			let tax = this.getItemTax(this.selected_order_item);
			this.updateOrderItemPrice(order_item, tax, 0);
			this.updateOrderTotal();
			this.show_change_order_item_price = false;
			this.show_order_item_exceptions = false;
		}
		else {
			let p: Price = {
				...GetEmpty.price(),
				price,
				item_id: order_item.item_id,
				currency_id: this.order_info.order.currency_id,
				percent: 0,
				updated: new Date(),
				price_type_id: this.order_info.order.price_type_id,
				price_list_id: this.order_info.store.price_list_id
			};

			this.sink = this.rest_price.create(p).subscribe(() =>
			{
				order_item.unitary_price_meta = price;
				order_item.original_unitary_price = price;
				order_item.tax_included = 'YES';

				let tax = this.getItemTax(selected_order_item);
				this.updateOrderItemPrice(order_item, this.order_info.order.tax_percent, 0);
				this.updateOrderTotal();
				this.showSuccess('El precio se actualizo correctamente');
				this.show_change_order_item_price = false;
				this.show_order_item_exceptions = false;
				this.item_list = [];
			}, (error: any) => this.showError(error));
		}
	}

	toggleSeparator(order_item_info: OrderItemInfo) {
		let new_value: 'YES' | 'NO' = order_item_info.order_item.has_separator == 'YES' ? 'NO' : 'YES';
		order_item_info.order_item.has_separator = new_value;
	}

	showMaxAmountWarning() {
		this.showError('Caja sobrepasa la cantidad maxima de efectivo permitida, Por favor hacer un retiro');
	}

	/*
	showRemoveItemFromOrder()
	{
		//Search for users with permission
		this.sink = this.rest_user_permission.search();
	}

	removeItemFromOrder()
	{
	}
	*/

	updateDinnersNumber(evt: Event) {
		evt.preventDefault();
		this.order_info.order.guests = parseInt(this.dinners_number) as number;
		this.dinners_number = '';
		this.show_ask_dinners = false;
	}

	printPreReceipt(evt: Event) {
		this.is_loading = true;
		//this.updatePaymentData();
		//this.setStoreBillingData();
		// Registrar Pago

		this.sink = (this.rest.is_offline ? of(this.order_info) : this.rest_order_info.update(this.order_info))
			.subscribe(async () => {
				this.is_loading = false;

				//TODO: port USB printing (old PrinterService/TicketBuilder)
				// Browser printing
				let url = '/index.html#/print-receipt/' + this.rest.preferences.default_print_receipt + '/' + this.order_info.order.id + '/print/1';
				console.log('Opening browser print:', url);

				//XXX NO BORRAR el log Es indispensable para que siga existiendo el contexto del evento y no bloque la
				//el abrir la ventana
				console.log(evt);
				//XXX NO BORRAR

				window.open(url);
			})
	}

	async printPreReceiptUsb(evt: Event): Promise<boolean> {
		//TODO: port USB printing (old PrinterService/TicketBuilder)
		return false;
	}

	showOrderNote() {
		this.note = this.order_info?.order?.note || '';
		this.show_pv_options = false;
		this.show_order_note = true;
	}

	saveNote(evt: Event) {
		evt.preventDefault();
		this.order_info.order.note = this.note;
		this.show_order_note = false;
	}

	onCurrencyRateChanged(currency_id: string) {
		//actualizando el currency_id de la orden
		this.order_info.order.currency_id = currency_id;
		//actualizando el currency_rate de la orden
		this.updatePrices(this.order_info.items);
		this.updateOrderTotal();
	}

	getExchangeRate(currency_id: string): number {
		if (this.order_info?.order?.store_id === 0) {
			return 1;
		}

		if (!this.order_info.store) {
			this.order_info.store = this.store_list.find(store => store.id == this.order_info.order.store_id) as Store;

			if (!this.order_info.store)
				return 1;
		}

		if (this.order_info.store.id === 0)
			return 1;

		let currency_rate_list = this.currency_rate_list.filter(cr => cr.store_id == this.order_info.store.id);

		return this.calcExchangeRate
			(
				this.order_info.order.currency_id,
				this.order_info.store.default_currency_id,
				currency_id,
				currency_rate_list,
			);
	}

	restorePrices() {
		this.order_info.order.discount = 0;
		for (let oii of this.order_info.items) {
			oii.order_item.discount = 0;
			oii.order_item.discount_percent = 0;
		}
		this.updatePrices(this.order_info.items);
	}

	onStoreChanged(store_id: number) {
		let last_store_id = this.order_info.order.store_id;
		let store = this.store_list.find(store => store.id == store_id);

		if (!store) {
			this.showError('La sucursal seleccionada no existe por favor recargar datos en el menú');
			return;
		}

		console.log('Cambiando store Store is', store);

		try {
			this.order_info.order.store_id = store_id;
			this.order_info.store = store;
			this.updatePrices(this.order_info.items);
			this.updateOrderTotal();
		}
		catch (e) {
			this.showError('OCurrion un error al cambiar de sucursal');
			this.order_info.order.store_id = last_store_id;
			this.order_info.store = this.store_list.find(store => store.id == last_store_id) as Store;
		}
	}

	updateDeliveryDate(evt: Event) {
		console.log('Delivering');

		evt.preventDefault();
		evt.stopPropagation();

		let date = Utils.getLocalDateFromMysqlString(this.order_delivery_date);

		if (!date) {
			return;
		}

		this.order_info.order.delivery_schedule = Utils.getLocalMysqlStringFromDate(date);
		console.log('Delivering', this.order_info.order.delivery_schedule);
		this.show_assign_delivery_date = false;
	}

	// Esta funcion se utiliza para calcular la cantidad de un item en la orden actual
	getCurrentItemQtyInOrder(item_id: number) {
		return this.order_info.items
			.filter(i => i.item.id === item_id)
			.reduce((sum, i) => sum + i.order_item.qty, 0);
	}

	back() {

	}
	log(x: any)
	{
		console.log(x);
	}
	closeModalCorte()
	{
		this.show_corte_caja = false;
	}

	loadComexPoints()
	{
		let store_code = this.store.code;

		//TODO: port comex endpoint (old rest helper)
		this.sink = of(null)
		.subscribe
		({
			next: (response) => {
				this.comex_points = response;
				this.comex_max_points = response;
			}
			, error: (error: any) => {
				this.comex_max_points = 0;
				console.log('Error getting comex points', error);
				this.showError(error);
			}
		});
	}
}

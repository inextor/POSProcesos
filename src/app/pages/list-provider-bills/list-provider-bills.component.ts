import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Bill, Currency_Rate, Store, User, Payment } from '../../modules/shared/RestModels';
import { BillInfo, PaymentInfo, BankMovementBillInfo } from '../../modules/shared/Models';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { Utils } from '../../modules/shared/Utils';
import { SearchObject, Rest, RestSimple } from '../../modules/shared/services/Rest';
import { forkJoin, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { LoadingComponent } from '../../components/loading/loading.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { PaginationComponent } from '../../components/pagination/pagination.component';

@Component({
	selector: 'app-list-provider-bills',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		RouterModule,
		LoadingComponent,
		ModalComponent,
		PaginationComponent
	],
	templateUrl: './list-provider-bills.component.html',
	styleUrl: './list-provider-bills.component.css'
})
export class ListProviderBillsComponent extends BaseComponent implements OnInit
{
	provider: User = GetEmpty.user();
	cbill_info_list: BillInfo[] = []; // Current paginated page of bills
	all_pending_bills: BillInfo[] = []; // All pending bills for totals & global selection
	currency_rate_list: Currency_Rate[] = [];
	user_store: Store = GetEmpty.store();
	store_list: Store[] = [];
	bill_search: SearchObject<Bill> = this.getEmptySearch();

	show_make_payment: boolean = false;
	payment_amount: number = 0;
	selected_bill_info_list: BillInfo[] = [];

	// Map to track checked/unchecked bills across pages (key is bill ID)
	selected_bills_map: Map<number, boolean> = new Map();

	total: number = 0;
	pending: number = 0;
	total_to_pay: number = 0;
	total_to_pay_currency_id: string = '';

	// Service Initializations
	rest_bill_info: Rest<Bill, BillInfo> = this.rest.initRest<Bill, BillInfo>('bill_info');
	rest_currency_rate: RestSimple<Currency_Rate> = this.rest.initRestSimple<Currency_Rate>('currency_rate');
	rest_store: RestSimple<Store> = this.rest.initRestSimple<Store>('store');
	rest_user: RestSimple<User> = this.rest.initRestSimple<User>('user');
	rest_payment_info: Rest<Payment, PaymentInfo> = this.rest.initRest<Payment, PaymentInfo>('payment_info');

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit(): void
	{
		this.page_size = 50; // Use a standard page size of 50 in the new system

		// Subscribing to parameters and queries concurrently (Angular 20 / BaseComponent standard)
		this.subs.sink = this.getParamsAndQueriesObservable()
		.pipe
		(
			mergeMap(({param, query}) => {
				this.is_loading = true;
				const provider_id = Number(param.get('id'));

				// Setup routing path for pagination links
				this.path = `/list-provider-bills/${provider_id}`;

				// Construct search filters for server-side paginated queries
				let fields = ["provider_user_id", "paid_status"];
				let extra_keys: string[] = [];
				this.bill_search = this.getSearch(query, fields, extra_keys);
				this.bill_search.eq.provider_user_id = provider_id;
				this.bill_search.eq.paid_status = 'PENDING';
				this.bill_search.eq.status = 'ACTIVE';
				this.bill_search.sort_order = ['id_ASC']; // Oldest bills first
				this.bill_search.limit = this.page_size;

				this.current_page = this.bill_search.page;

				return forkJoin
				({
					provider: this.rest_user.get(provider_id),
					paginated_bills: this.rest_bill_info.search(this.bill_search as any),
					all_pending_bills: this.rest_bill_info.search({
						eq: { provider_user_id: provider_id, paid_status: 'PENDING', status: 'ACTIVE' },
						limit: 999999
					} as any),
					currency_rate: this.rest_currency_rate.search({ limit: 99999 }),
					store_list: this.rest_store.search({ eq: { status: 'ACTIVE' }, limit: 99999 }),
					user_store: this.rest_store.get(this.rest.user?.store_id || 1)
				});
			})
		)
		.subscribe({
			next: (response) => {
				this.setTitle('Compras de ' + response.provider.name);

				this.provider = response.provider;
				this.currency_rate_list = response.currency_rate.data;
				this.store_list = response.store_list.data;
				this.user_store = response.user_store;

				// Current page bills
				this.cbill_info_list = response.paginated_bills.data;
				this.setPages(this.bill_search.page, response.paginated_bills.total);

				// All pending bills across all pages
				this.all_pending_bills = response.all_pending_bills.data;

				// Initialize selection state globally (cross-page). Default to true (checked) if not already configured.
				this.all_pending_bills.forEach((bill_info) => {
					if (!this.selected_bills_map.has(bill_info.bill.id)) {
						this.selected_bills_map.set(bill_info.bill.id, true);
					}
				});

				// Calculate grand overall totals of the provider (Total and Pending)
				this.total = 0;
				this.pending = 0;

				this.all_pending_bills.forEach((bill_info) => {
					// Map stores to the bills for display purposes
					bill_info.store = this.store_list.find(s => s.id === bill_info.bill.store_id) || null;

					const rate = this.getExchangeRate(this.user_store.default_currency_id, bill_info.bill);
					this.total += (bill_info.bill.total / rate);
					this.pending += (bill_info.bill.total - bill_info.bill.amount_paid) / rate;
				});

				// Recalculate dynamic pay totals for currently checked bills
				this.calculateTotals();

				this.is_loading = false;
			},
			error: (error) => {
				this.showError(error);
			}
		});
	}

	getExchangeRate(currency_id: string, bill: Bill): number
	{
		const bill_currency = bill.currency_id || this.user_store.default_currency_id;

		if (bill_currency === currency_id)
			return 1;

		const default_currency_id = this.user_store.default_currency_id;

		const currency_rate = this.currency_rate_list.find((r: Currency_Rate) =>
		{
			if (r.store_id !== bill.store_id)
				return false;

			if (bill_currency === default_currency_id)
			{
				return r.currency_id === currency_id;
			}

			return r.currency_id === bill_currency;
		});

		if (!currency_rate) {
			return 1;
		}

		return default_currency_id === bill_currency
			? currency_rate.rate
			: 1 / currency_rate.rate;
	}

	calculateTotals()
	{
		const selected_bills = this.all_pending_bills.filter(b => this.isBillSelected(b.bill.id));

		const reduce_currencies = (p: string[], bi: BillInfo) =>
		{
			const cid = bi.bill.currency_id;
			if (cid && !p.includes(cid))
			{
				p.push(cid);
			}
			return p;
		};

		const currencies_ids = selected_bills.reduce(reduce_currencies, []);

		this.total_to_pay_currency_id = currencies_ids.length === 1 ? currencies_ids[0] : this.user_store.default_currency_id;
		this.total_to_pay = 0;

		selected_bills.forEach((bill_info) =>
		{
			this.total_to_pay += (bill_info.bill.total - bill_info.bill.amount_paid) / this.getExchangeRate(this.total_to_pay_currency_id, bill_info.bill);
		});
	}

	isBillSelected(bill_id: number): boolean
	{
		return this.selected_bills_map.get(bill_id) ?? false;
	}

	someChecked(): boolean
	{
		if (this.cbill_info_list.length === 0) return false;
		return !this.cbill_info_list.some(bi => !this.isBillSelected(bi.bill.id));
	}

	onToggleAll(evt: Event)
	{
		const input = evt.target as HTMLInputElement;
		const value = input.checked;

		// Toggle check only for bills present on the current paginated view page
		this.cbill_info_list.forEach((bill_info) => {
			this.selected_bills_map.set(bill_info.bill.id, value);
		});

		this.calculateTotals();
	}

	onToggleCheck(bill_info: BillInfo)
	{
		const current = this.isBillSelected(bill_info.bill.id);
		this.selected_bills_map.set(bill_info.bill.id, !current);
		this.calculateTotals();
	}

	isOverdue(dueDateStr: any): boolean
	{
		if (!dueDateStr) return false;
		const today = new Date();
		today.setHours(0,0,0,0);
		const due = new Date(dueDateStr);
		return due < today;
	}

	onPay()
	{
		this.selected_bill_info_list = this.all_pending_bills.filter(b => this.isBillSelected(b.bill.id));

		if (this.selected_bill_info_list.length === 0)
		{
			this.showError('No hay ninguna orden seleccionada');
			return;
		}

		const first_currency_id = this.selected_bill_info_list[0].bill.currency_id || this.user_store.default_currency_id;

		for (const bi of this.selected_bill_info_list)
		{
			const bi_currency = bi.bill.currency_id || this.user_store.default_currency_id;
			if (bi_currency !== first_currency_id)
			{
				this.showError('Las ordenes seleccionadas deben ser del mismo tipo de moneda');
				return;
			}
		}

		this.payment_amount = Number(this.total_to_pay.toFixed(2));
		this.total_to_pay_currency_id = first_currency_id;
		this.show_make_payment = true;
	}

	makePayment()
	{
		if (this.rest.is_offline)
		{
			this.showError('Opcion no soportada todavia');
			return;
		}

		if (this.payment_amount > this.total_to_pay)
		{
			this.showError('La cantidad a pagar no puede ser mayor al total a pagar');
			return;
		}

		this.is_loading = true;

		const first_bill = this.selected_bill_info_list[0].bill;
		let concept = 'Pago por orden de compra ';

		this.selected_bill_info_list.forEach((bill_info) =>
		{
			concept += '#' + bill_info.bill.id + ', ';
		});

		// Remove last comma and space
		concept = concept.substring(0, concept.length - 2);

		const first_currency = first_bill.currency_id || this.user_store.default_currency_id;

		const payment_info: any =
		{
			payment: {
				type: 'expense',
				tag: 'Compra',
				payment_amount: this.payment_amount,
				concept,
				received_amount: this.payment_amount,
				facturado: 'NO',
				change_amount: 0,
				exchange_rate: 1,
				currency_id: first_currency,
				paid_by_user_id: this.rest.user?.id || 0,
				sat_pdf_attachment_id: null,
				sat_factura_id: null,
				sat_xml_attachment_id: null,
				sync_id: this.rest.getSyncId()
			},
			movements: []
		};

		const bm: any = {
			bank_movement: {
				amount_received: this.payment_amount,
				bank_account_id: null,
				card_ending: '',
				client_user_id: null,
				created: new Date(),
				currency_id: first_currency,
				id: null,
				invoice_attachment_id: null,
				note: '',
				origin_bank_name: '',
				paid_date: Utils.getMysqlStringFromLocalDate(new Date()).substring(0, 10),
				payment_id: null,
				provider_user_id: first_bill.provider_user_id || null,
				receipt_attachment_id: null,
				received_by_user_id: null,
				reference: '',
				status: 'ACTIVE',
				exchange_rate: 1,
				total: this.payment_amount,
				transaction_type: null,
				type: 'expense',
				updated: new Date()
			},
			bank_movement_bills: []
		};

		let remaining = this.payment_amount;

		for (const bi of this.selected_bill_info_list)
		{
			if (remaining <= 0.003)
				continue;

			const paid_amount = bi.bill.amount_paid;
			const bill_remaining = bi.bill.total - paid_amount;
			const bmb_amount = remaining < bill_remaining ? remaining : bill_remaining;

			const bmb: BankMovementBillInfo =
			{
				bill: bi.bill,
				bank_movement_bill: {
					id: null as any,
					amount: bmb_amount,
					bill_id: bi.bill.id,
					currency_amount: bmb_amount,
					currency_id: bi.bill.currency_id || this.user_store.default_currency_id,
					exchange_rate: 1,
					status: 'ACTIVE'
				} as any
			};

			remaining -= bmb_amount;
			bm.bank_movement_bills.push(bmb);
		}

		payment_info.movements = [bm];

		this.subs.sink = this.rest_payment_info.create(payment_info as any)
		.subscribe
		({
			next: (response) =>
			{
				this.showSuccess('El pago se realizo correctamente');
				this.is_loading = false;
				this.show_make_payment = false;
				this.router.navigate(['/provider-resume']);
			},
			error: (error) =>
			{
				this.showError(error);
			}
		});
	}
}

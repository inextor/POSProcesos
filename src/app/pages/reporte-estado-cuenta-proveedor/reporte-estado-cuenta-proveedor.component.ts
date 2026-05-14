import { Component, OnInit } from '@angular/core';
import { Bill, Billing_Data, Preferences, Purchase, Store, User } from '../../modules/shared/RestModels';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Rest } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, of } from 'rxjs';
import { LoadingComponent } from '../../components/loading/loading.component';
import { mergeMap } from 'rxjs/operators';
import { BillInfo, PurchaseInfo } from '../../modules/shared/Models';
import { environment } from '../../../environments/environment';
import { Utils } from '../../modules/shared/Utils';

interface ReporteItem {
	fecha: Date;
	folio: string;
	concepto: string;
	producto: string;
	cantidad: number | null;
	precio_unitario: number | null;
	forma_pago: string;
	metodo_pago: string;
	cargo: number;
	abono: number;
	saldo: number;
	dias_vencimiento: number;
}

interface Balance {
	total_bills: number;
	total_paid: number;
	balance: number;
}

@Component({
	selector: 'app-reporte-estado-cuenta-proveedor',
	standalone: true,
	imports: [CommonModule, FormsModule, LoadingComponent],
	templateUrl: './reporte-estado-cuenta-proveedor.component.html',
	styleUrl: './reporte-estado-cuenta-proveedor.component.css'
})
export class ReporteEstadoCuentaProveedorComponent extends BaseComponent implements OnInit
{
	start_date: string = '';
	end_date: string = '';

	selectedProvider: User | null = null;
	store: Store | null = null;
	billing_data: Billing_Data | null = null;
	preferences: Preferences | null = null;
	total_cargos: number = 0;
	total_abonos: number = 0;

	report_items: ReporteItem[] = [];
	bills_in_range: BillInfo[] = [];

	rest_bill_info: Rest<Bill, BillInfo> = this.rest.initRest<Bill, BillInfo>('bill_info');
	rest_purchase_info: Rest<Purchase, PurchaseInfo> = this.rest.initRest<Purchase, PurchaseInfo>('purchase_info');
	rest_user: Rest<User, User> = this.rest.initRest<User, User>('user');
	rest_store: Rest<Store, Store> = this.rest.initRest<Store, Store>('store');
	rest_billing_data: Rest<Billing_Data, Billing_Data> = this.rest.initRest<Billing_Data, Billing_Data>('billing_data');
	rest_preferences: Rest<Preferences, Preferences> = this.rest.initRest<Preferences, Preferences>('preferences');

	balance: Balance = {
		total_bills: 0,
		total_paid: 0,
		balance: 0
	};

	ngOnInit(): void {
		this.path = '/reporte-estado-cuenta-proveedor';

		this.sink = this.getParamsAndQueriesObservable().pipe
		(
			mergeMap(params =>
			{
				this.setTitle('Reporte de Estado de Cuenta de Proveedor');

				let start = new Date();
				start.setDate(1);
				start.setHours(0,0,0,0);

				let end = Utils.getEndOfMonth(start);

				this.start_date = (params.query.get('start_date') || Utils.getLocalMysqlStringFromDate(start)).substring(0,10);
				this.end_date = (params.query.get('end_date') || Utils.getLocalMysqlStringFromDate(end)).substring(0,10);

				const provider_user_id = parseInt( params.query.get('provider_user_id') as string ) as number;

				start = Utils.getDateFromLocalMysqlString( this.start_date+' 00:00:00' );
				end = Utils.getDateFromLocalMysqlString( this.end_date+' 23:59:59' );

				if( this.rest?.user?.store_id == null )
				{
					this.showError('No tienes configurado una sucursal, por favor habla con tu administrador');
				}

				this.is_loading = true;

				return forkJoin({
					provider: this.rest_user.get(provider_user_id),
					bills: this.getProviderBills(provider_user_id, end),
					store: this.rest_store.get(this.rest?.user?.store_id as number),
					preferences: this.rest_preferences.get(1),
					balance: this.rest.getReportByPath('getProviderBalance', { to_date: Utils.getLocalMysqlStringFromDate(start), provider_user_id: provider_user_id }),
					range_start: of(start),
					range_end: of(end)
				});
			}),
			mergeMap((response: any) =>
			{
				this.store = response.store;
				this.preferences = response.preferences;
				this.balance = response.balance;
				this.selectedProvider = response.provider;

				const billing_data_id = this.store?.default_billing_data_id;

				const purchase_ids: number[] = (response.bills.data || [])
					.map((bi: BillInfo) => bi.bill.purchase_id)
					.filter((id: number | null): id is number => id != null);

				const purchases_obs = purchase_ids.length > 0
					? this.rest_purchase_info.search({ csv: { id: purchase_ids }, limit: 999999 } as any)
					: of({ data: [] as PurchaseInfo[], total: 0 });

				return forkJoin
				({
					bills: of(response.bills),
					purchases: purchases_obs,
					range_start: of(response.range_start),
					range_end: of(response.range_end),
					billing_data: billing_data_id ? this.rest_billing_data.get(billing_data_id) : of(null)
				});
			})
		)
		.subscribe
		({
			error:(error:any) => this.showError(error),
			next: response =>
			{
				this.billing_data = response.billing_data;
				this.bills_in_range = response.bills.data || [];

				const purchase_map = new Map<number, PurchaseInfo>(
					(response.purchases.data || []).map((pi: PurchaseInfo) => [pi.purchase.id, pi])
				);

				this.report_items = this.generateReport(this.bills_in_range, purchase_map, response.range_start, response.range_end);
				this.calculateTotals();
				this.is_loading = false;
			}
		});
	}

	getProviderBills(provider_user_id: number, end_date: Date)
	{
		return this.rest_bill_info.search({
			eq: { provider_user_id: provider_user_id, status: 'ACTIVE' },
			le: { created: end_date },
			limit: 999999
		});
	}

	generateReport(bills: BillInfo[], purchase_map: Map<number, PurchaseInfo>, range_start: Date, range_end: Date): ReporteItem[]
	{
		let all_items: any[] = [];
		const provider_bill_ids = new Set(bills.map(b => Number(b.bill.id)));
		const bill_folio_map = new Map<number, string>(bills.map(b => [Number(b.bill.id), b.bill.folio || `#${b.bill.id}`]));

		for(const bi of bills)
		{
			const bill_created = bi.bill.created instanceof Date ? bi.bill.created : new Date(bi.bill.created as any);
			const bill_in_range = bill_created >= range_start && bill_created <= range_end;

			if(!bill_in_range)
				continue;

			const purchase = bi.bill.purchase_id != null ? purchase_map.get(bi.bill.purchase_id) : null;

			if(purchase && purchase.details && purchase.details.length > 0)
			{
				let first_detail_idx = all_items.length;

				for(const detail of purchase.details)
				{
					all_items.push({
						fecha: bill_created,
						folio: bi.bill.folio || `#${bi.bill.id}`,
						concepto: 'Compra',
						producto: this.formatProductName(detail.item?.name, detail.purchase_detail.description),
						cantidad: detail.purchase_detail.qty,
						precio_unitario: detail.purchase_detail.unitary_price,
						forma_pago: '',
						metodo_pago: '',
						cargo: detail.purchase_detail.total,
						abono: 0,
						type: 'bill',
						bill_id: bi.bill.id,
						is_first_of_bill: false
					});
				}

				if(all_items.length > first_detail_idx)
				{
					all_items[first_detail_idx].is_first_of_bill = true;
				}
			}
			else
			{
				all_items.push({
					fecha: bill_created,
					folio: bi.bill.folio || `#${bi.bill.id}`,
					concepto: bi.bill.name || 'Factura',
					producto: '',
					cantidad: null,
					precio_unitario: null,
					forma_pago: '',
					metodo_pago: '',
					cargo: bi.bill.total,
					abono: 0,
					type: 'bill',
					bill_id: bi.bill.id,
					is_first_of_bill: true
				});
			}
		}

		// Recolectar pagos deduplicados por bank_movement.id.
		// Un mismo bank_movement puede aparecer varias veces (en cada bill que paga),
		// y su `bank_movement_bill` interno contiene TODOS los bmb del movimiento.
		// Sumamos los bmb cuyas bills pertenecen al proveedor del reporte.
		interface PaymentEntry {
			bank_movement: any;
			fecha: Date;
			amount: number;
			bill_ids: Set<number>;
		}
		const payment_map = new Map<number, PaymentEntry>();

		for(const bi of bills)
		{
			for(const bmi of bi.bank_movements_info || [])
			{
				const bm_id = Number(bmi.bank_movement?.id);
				if(!bm_id) continue;

				const bm_created = bmi.bank_movement.created instanceof Date ? bmi.bank_movement.created : new Date(bmi.bank_movement.created as any);
				if(bm_created < range_start || bm_created > range_end) continue;

				let entry = payment_map.get(bm_id);
				if(!entry)
				{
					entry = { bank_movement: bmi.bank_movement, fecha: bm_created, amount: 0, bill_ids: new Set<number>() };
					payment_map.set(bm_id, entry);
				}

				const inner = (bmi.bank_movement_bill as any)?.bank_movement_bill;
				const bmb_array: any[] = Array.isArray(inner) ? inner : (inner ? [inner] : []);

				for(const bmb of bmb_array)
				{
					const bill_id = Number(bmb?.bill_id);
					if(!bill_id || entry.bill_ids.has(bill_id)) continue;
					if(!provider_bill_ids.has(bill_id)) continue;

					entry.amount += Number(bmb.amount ?? 0) || 0;
					entry.bill_ids.add(bill_id);
				}
			}
		}

		for(const entry of payment_map.values())
		{
			const bill_ids_arr = Array.from(entry.bill_ids);
			let folio_label: string;
			let concepto: string;

			if(bill_ids_arr.length === 1)
			{
				folio_label = bill_folio_map.get(bill_ids_arr[0]) || String(bill_ids_arr[0]);
				concepto = 'Pago';
			}
			else
			{
				folio_label = bill_ids_arr.map(id => bill_folio_map.get(id) || String(id)).join(', ');
				concepto = `Pago (${bill_ids_arr.length} facturas)`;
			}

			all_items.push({
				fecha: entry.fecha,
				folio: folio_label,
				concepto,
				producto: '',
				cantidad: null,
				precio_unitario: null,
				forma_pago: this.getPaymentMethodName(entry.bank_movement.transaction_type),
				metodo_pago: '',
				cargo: 0,
				abono: entry.amount,
				type: 'payment',
				bill_id: bill_ids_arr[0] || 0,
				is_first_of_bill: false
			});
		}

		all_items.sort((a, b) => {
			if (a.fecha < b.fecha) return -1;
			if (a.fecha > b.fecha) return 1;
			if (a.bill_id < b.bill_id) return -1;
			if (a.bill_id > b.bill_id) return 1;
			if (a.type === 'bill' && b.type !== 'bill') return -1;
			if (a.type !== 'bill' && b.type === 'bill') return 1;
			return 0;
		});

		let saldo_acumulado = 0;
		const today = new Date();
		const bill_map = new Map(bills.map(b => [b.bill.id, b]));

		return all_items.map(item =>
		{
			saldo_acumulado = saldo_acumulado + item.cargo - item.abono;

			let dias_vencimiento = 0;
			let metodo_pago = '';
			const bi = bill_map.get(item.bill_id);

			if(bi && item.type === 'bill' && item.is_first_of_bill)
			{
				const is_paid = bi.bill.paid_status === 'PAID' || bi.bill.total <= bi.bill.amount_paid;
				metodo_pago = is_paid ? 'CONTADO' : 'CREDITO';

				if(!is_paid && bi.bill.due_date)
				{
					const fecha_vencimiento = new Date(bi.bill.due_date as any);
					if(today > fecha_vencimiento)
					{
						const diffTime = today.getTime() - fecha_vencimiento.getTime();
						dias_vencimiento = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
					}
				}
			}

			return {
				...item,
				metodo_pago,
				saldo: saldo_acumulado,
				dias_vencimiento
			};
		});
	}

	formatProductName(item_name: string | null | undefined, detail_description: string | null): string
	{
		const parts: string[] = [];
		if(item_name) parts.push(item_name);
		if(detail_description && detail_description !== item_name) parts.push(detail_description);
		return parts.join(' — ');
	}

	getPaymentMethodName(transaction_type: string): string
	{
		switch(transaction_type)
		{
			case 'CASH': return 'Efectivo';
			case 'CREDIT_CARD': return 'Tarjeta de Crédito';
			case 'DEBIT_CARD': return 'Tarjeta de Débito';
			case 'CHECK': return 'Cheque';
			case 'COUPON': return 'Cupón';
			case 'TRANSFER': return 'Transferencia';
			case 'DISCOUNT': return 'Descuento';
			case 'RETURN_DISCOUNT': return 'Descuento por Devolución';
			case 'PAYPAL': return 'Transferencia';
		}
		return transaction_type;
	}

	calculateTotals()
	{
		this.total_cargos = this.report_items.reduce((acc, item) => acc + item.cargo, 0);
		this.total_abonos = this.report_items.reduce((acc, item) => acc + item.abono, 0);
	}

	doSearch()
	{
		const queryParams: any = {};

		if (this.start_date) {
			queryParams.start_date = this.start_date;
		}
		if (this.end_date) {
			queryParams.end_date = this.end_date;
		}
		if (this.selectedProvider) {
			queryParams.provider_user_id = this.selectedProvider.id;
		}
		this.router.navigate([this.path], { queryParams });
	}

	downloadPdf()
	{
		const element = document.getElementById('to_pdf');
		if (!element) return;

		const html = element.innerHTML;
		const payload = {
			html: html,
			orientation: 'P',
			default_font_size: 10,
			download_name: `estado-de-cuenta-${this.selectedProvider?.name}.pdf`
		};

		let url = `${environment.app_settings.pdf_service_url}/index.php`;

		let options = { responseType: 'blob' };
		this.sink = this.rest.callPostApi(url, payload, options).subscribe
		({
			error:(error:any) => this.showError(error),
			next:(response:any) =>
			{
				const blob = new Blob([response], { type: 'application/pdf' });
				const blob_url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = blob_url;
				a.download = `estado-de-cuenta-${this.selectedProvider?.name}.pdf`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(blob_url);
				document.body.removeChild(a);
			}
		});
	}

	formatStoreAddress(store: Store | null): string
	{
		if (!store) return '';
		const addressParts = [store.address, store.city, store.state, store.zipcode];
		return addressParts.filter(part => part).join(', ');
	}
}

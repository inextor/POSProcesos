import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';
import { Store } from '../../modules/shared/RestModels';
import { RestSimple } from '../../modules/shared/services/Rest';
import { LoadingComponent } from '../../components/loading/loading.component';
import { ItemSearchComponent } from '../../modules/shared/components/item-search/item-search.component';
import { CategorySearchComponent } from '../../modules/shared/components/category-search/category-search.component';
import { ExcelUtils } from '../../classes/ExcelUtils';

interface SalesByBatchRow
{
	store_id: number | null;
	store_name: string | null;
	item_id: number;
	item_code: string | null;
	item_name: string;
	item_status: string;
	category_id: number | null;
	batch: string;
	expiration_date: string | null;
	days_to_expire: number | null;
	qty_entered: number;
	first_entry_date: string | null;
	qty_current: number;
	qty_adjusted: number;
	qty_removed: number;
	qty_sold: number;
	sold_subtotal: number;
	sold_total: number;
	sold_tax: number;
	sold_discount: number;
	orders_count: number;
	avg_unit_price: number;
	qty_returned: number;
	pct_sold: number;
	purchase_id: number | null;
	provider_name: string | null;
	purchase_date: string | null;
	purchase_unit_cost: number | null;
}

interface CSalesByBatchRow extends SalesByBatchRow
{
	balance_expected: number;
	is_balanced: boolean;
	expiration_class: string;
}

interface BatchLedgerRow
{
	batch_record_id: number;
	created: string;
	item_id: number;
	item_code: string | null;
	item_name: string;
	store_id: number | null;
	store_name: string | null;
	batch: string;
	expiration_date: string | null;
	movement_type: 'POSITIVE' | 'NEGATIVE' | 'ADJUSTMENT';
	movement_qty: number;
	previous_qty: number;
	qty: number;
	description: string | null;
	is_current: number;
	order_item_id: number | null;
	order_id: number | null;
	order_closed_timestamp: string | null;
	purchase_detail_id: number | null;
	purchase_id: number | null;
	provider_name: string | null;
	shipping_item_id: number | null;
	production_item_id: number | null;
	consignment_received_item_id: number | null;
	consignment_delivered_item_id: number | null;
	created_by_user_name: string | null;
}

interface CBatchLedgerRow extends BatchLedgerRow
{
	signed_qty: number;
	movement_label: string;
	movement_class: string;
}

interface BatchSaleRow
{
	order_id: number;
	store_id: number | null;
	store_name: string | null;
	closed_timestamp: string;
	client_name: string | null;
	client_registered_name: string | null;
	order_item_id: number;
	item_id: number;
	item_code: string | null;
	item_name: string;
	batch: string;
	expiration_date: string | null;
	line_qty: number;
	batch_qty: number;
	unitary_price: number;
	batch_subtotal: number;
	batch_total: number;
	batch_tax: number;
	batch_discount: number;
}

interface CBatchSaleRow extends BatchSaleRow
{
	client_display: string;
}

@Component({
	selector: 'app-sales-by-batch-report',
	standalone: true,
	imports: [CommonModule, FormsModule, LoadingComponent, ItemSearchComponent, CategorySearchComponent],
	templateUrl: './sales-by-batch-report.component.html',
	styleUrl: './sales-by-batch-report.component.css'
})
export class SalesByBatchReportComponent extends BaseComponent implements OnInit
{
	start_date: string = '';
	end_date: string = '';
	store_id: string = 'ALL';
	item_id: number | null = null;
	item_search_str: string = '';
	category_id: number | null = null;
	batch: string = '';
	batch_search: string = '';
	expiring_within_days: number | null = null;

	sort_field: string = 'qty_current';
	sort_direction: 'ASC' | 'DESC' = 'DESC';

	store_array: Store[] = [];
	summary_array: CSalesByBatchRow[] = [];
	has_searched: boolean = false;

	selected_row: CSalesByBatchRow | null = null;
	detail_tab: 'ledger' | 'sales' = 'ledger';
	ledger_array: CBatchLedgerRow[] = [];
	sales_array: CBatchSaleRow[] = [];
	detail_is_loading: boolean = false;

	rest_store: RestSimple<Store> = this.rest.initRestSimple<Store>('store');

	ngOnInit(): void
	{
		this.setTitle('Ventas por Lote');
		this.path = '/sales-by-batch-report';
		this.start_date = this.getDefaultStartDate();
		this.end_date = this.getDefaultEndDate();

		//Un reporte sin filtro de sucursal es valido, pero arrancar en la sucursal del usuario
		//ahorra un clic y evita el 400 de "indique al menos un filtro" cuando no elige nada mas
		if (this.rest.user?.store_id)
		{
			this.store_id = '' + this.rest.user.store_id;
		}

		this.is_loading = true;

		this.subs.sink = forkJoin
		({
			stores: this.rest_store.search({ eq: { status: 'ACTIVE' }, limit: 999999, sort_order: ['name_ASC'] })
		})
		.subscribe
		({
			next: (response) =>
			{
				this.store_array = response.stores.data;
				this.is_loading = false;
			},
			error: (error) => this.showError(error)
		});
	}

	getDefaultStartDate(): string
	{
		const now = new Date();
		now.setDate(now.getDate() - 30);
		now.setHours(0, 0, 0, 0);
		return Utils.getLocalMysqlStringFromDate(now).replace(' ', 'T').substring(0, 16);
	}

	getDefaultEndDate(): string
	{
		const now = new Date();
		now.setHours(23, 59, 0, 0);
		return Utils.getLocalMysqlStringFromDate(now).replace(' ', 'T').substring(0, 16);
	}

	//order.closed_timestamp se guarda en UTC (app.php fija la zona en UTC), asi que la hora local
	//del datetime-local se convierte antes de mandarla. Las fechas de ingreso/existencia son de por
	//vida del lote y no dependen del rango.
	getTimestamp(value: string): string
	{
		if (!value)
		{
			return '';
		}

		const date = Utils.getLocalDateFromMysqlString(value.replace('T', ' '));
		return date ? Utils.getUTCMysqlStringFromDate(date) : '';
	}

	hasNarrowingFilter(): boolean
	{
		return this.item_id !== null
			|| !!this.item_search_str.trim()
			|| this.category_id !== null
			|| !!this.batch.trim()
			|| !!this.batch_search.trim()
			|| (this.store_id !== 'ALL' && this.store_id !== '');
	}

	getSummaryParams(): Record<string, string | number | null>
	{
		return {
			start_timestamp: this.getTimestamp(this.start_date),
			end_timestamp: this.getTimestamp(this.end_date),
			store_id: this.store_id,
			item_id: this.item_id,
			item_search: this.item_id ? null : (this.item_search_str.trim() || null),
			category_id: this.category_id,
			batch: this.batch.trim() || null,
			batch_search: this.batch.trim() ? null : (this.batch_search.trim() || null),
			expiring_within_days: this.expiring_within_days,
			_sort: this.sort_field + ':' + this.sort_direction
		};
	}

	searchSummary(): void
	{
		if (!this.start_date || !this.end_date)
		{
			this.showWarning('Selecciona la fecha inicial y la fecha final.');
			return;
		}

		if (!this.hasNarrowingFilter())
		{
			this.showWarning('Selecciona al menos un filtro: sucursal, artículo, categoría o lote.');
			return;
		}

		this.is_loading = true;
		this.closeDetail();

		this.subs.sink = this.rest.getReportByPath('getSalesByBatch', this.getSummaryParams()).subscribe
		({
			next: (response: any) =>
			{
				const rows: SalesByBatchRow[] = response.data || [];
				this.summary_array = rows.map(row => this.getCSalesByBatchRow(row));
				this.has_searched = true;
				this.is_loading = false;
			},
			error: (error) =>
			{
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

	sortBy(field: string): void
	{
		if (this.sort_field === field)
		{
			this.sort_direction = this.sort_direction === 'ASC' ? 'DESC' : 'ASC';
		}
		else
		{
			this.sort_field = field;
			this.sort_direction = 'DESC';
		}

		this.searchSummary();
	}

	openDetail(row: CSalesByBatchRow): void
	{
		this.selected_row = row;
		this.detail_tab = 'ledger';
		this.ledger_array = [];
		this.sales_array = [];
		this.loadDetail();
	}

	closeDetail(): void
	{
		this.selected_row = null;
		this.ledger_array = [];
		this.sales_array = [];
	}

	showDetailTab(tab: 'ledger' | 'sales'): void
	{
		this.detail_tab = tab;
	}

	loadDetail(): void
	{
		if (!this.selected_row)
		{
			return;
		}

		const row = this.selected_row;
		this.detail_is_loading = true;

		const base_params: Record<string, string | number> = {
			start_timestamp: this.getTimestamp(this.start_date),
			end_timestamp: this.getTimestamp(this.end_date),
			batch: row.batch,
			item_id: row.item_id,
			store_id: row.store_id ?? 'ALL'
		};

		this.subs.sink = forkJoin
		({
			ledger: this.rest.getReportByPath('getSalesByBatch', { ...base_params, detail: 'ledger' }),
			sales: this.rest.getReportByPath('getSalesByBatch', { ...base_params, detail: 'sales' })
		})
		.subscribe
		({
			next: (response: any) =>
			{
				this.ledger_array = (response.ledger.data || []).map((ledger_row: BatchLedgerRow) => this.getCBatchLedgerRow(ledger_row));
				this.sales_array = (response.sales.data || []).map((sale_row: BatchSaleRow) => this.getCBatchSaleRow(sale_row));
				this.detail_is_loading = false;
			},
			error: (error) =>
			{
				this.showError(error);
				this.detail_is_loading = false;
			}
		});
	}

	getCSalesByBatchRow(row: SalesByBatchRow): CSalesByBatchRow
	{
		const balance_expected = (row.qty_entered || 0) + (row.qty_adjusted || 0) - (row.qty_removed || 0);
		const is_balanced = Math.abs(balance_expected - (row.qty_current || 0)) < 0.001;

		let expiration_class = '';

		if (row.days_to_expire !== null && row.days_to_expire !== undefined)
		{
			if (row.days_to_expire < 0)
			{
				expiration_class = 'text-danger fw-bold';
			}
			else if (row.days_to_expire <= 30)
			{
				expiration_class = 'text-warning fw-bold';
			}
		}

		return { ...row, balance_expected, is_balanced, expiration_class };
	}

	getCBatchLedgerRow(row: BatchLedgerRow): CBatchLedgerRow
	{
		let signed_qty = row.movement_qty || 0;
		let movement_label = 'Ajuste';
		let movement_class = 'text-warning';

		if (row.movement_type === 'POSITIVE')
		{
			signed_qty = Math.abs(row.movement_qty || 0);
			movement_label = 'Entrada';
			movement_class = 'text-success';
		}
		else if (row.movement_type === 'NEGATIVE')
		{
			signed_qty = -Math.abs(row.movement_qty || 0);
			movement_label = 'Salida';
			movement_class = 'text-danger';
		}
		else
		{
			//ADJUSTMENT guarda ABS(movement_qty), la direccion sale de qty - previous_qty
			signed_qty = (row.qty || 0) - (row.previous_qty || 0);
		}

		return { ...row, signed_qty, movement_label, movement_class };
	}

	getCBatchSaleRow(row: BatchSaleRow): CBatchSaleRow
	{
		return { ...row, client_display: row.client_name || row.client_registered_name || 'Mostrador' };
	}

	get total_entered(): number
	{
		return this.summary_array.reduce((total, row) => total + (row.qty_entered || 0), 0);
	}

	get total_current(): number
	{
		return this.summary_array.reduce((total, row) => total + (row.qty_current || 0), 0);
	}

	get total_sold(): number
	{
		return this.summary_array.reduce((total, row) => total + (row.qty_sold || 0), 0);
	}

	get total_sold_amount(): number
	{
		return this.summary_array.reduce((total, row) => total + (row.sold_total || 0), 0);
	}

	downloadExcel(): void
	{
		if (!this.summary_array.length)
		{
			return;
		}

		const headers = ['Sucursal', 'Código', 'Artículo', 'Lote', 'Expira', 'Días para expirar',
			'Ingresado', 'Ajustado', 'Retirado', 'Vendido', 'Devuelto', 'Actual', '% Vendido',
			'Pedidos', 'Precio promedio', 'Subtotal vendido', 'Impuesto', 'Descuento', 'Total vendido',
			'Proveedor', 'Costo unitario'];

		const rows = this.summary_array.map(row => ({
			'Sucursal': row.store_name,
			'Código': row.item_code,
			'Artículo': row.item_name,
			'Lote': row.batch,
			'Expira': row.expiration_date,
			'Días para expirar': row.days_to_expire,
			'Ingresado': row.qty_entered,
			'Ajustado': row.qty_adjusted,
			'Retirado': row.qty_removed,
			'Vendido': row.qty_sold,
			'Devuelto': row.qty_returned,
			'Actual': row.qty_current,
			'% Vendido': row.pct_sold,
			'Pedidos': row.orders_count,
			'Precio promedio': row.avg_unit_price,
			'Subtotal vendido': row.sold_subtotal,
			'Impuesto': row.sold_tax,
			'Descuento': row.sold_discount,
			'Total vendido': row.sold_total,
			'Proveedor': row.provider_name,
			'Costo unitario': row.purchase_unit_cost
		}));

		const filename = `ventas_por_lote_${this.start_date.substring(0, 10)}_${this.end_date.substring(0, 10)}.xlsx`;

		ExcelUtils.array2xlsx(rows, filename, headers);
	}
}

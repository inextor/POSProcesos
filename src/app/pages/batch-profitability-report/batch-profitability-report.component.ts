import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';
import { Store } from '../../modules/shared/RestModels';
import { RestSimple } from '../../modules/shared/services/Rest';
import { LoadingComponent } from '../../components/loading/loading.component';
import { ExcelUtils } from '../../classes/ExcelUtils';

interface BatchListOption
{
	batch: string;
	first_entry_date: string | null;
	last_movement_date: string | null;
	items_count: number;
	qty_received: number;
	qty_current: number;
	provider_name: string | null;
	status: string;
}

interface CBatchListOption extends BatchListOption
{
	label_display: string;
}

interface BatchProfitabilitySummary
{
	batch: string;
	date: string | null;
	provider_name: string;
	status: string;
	qty_received: number;
	qty_sold: number;
	qty_merma: number;
	qty_existence: number;
	qty_current_db: number;
	net_sales: number;
	gross_sales: number;
	purchase_cost: number;
	expenses: number;
	estimated_profit: number;
	accounts_receivable: number;
	accounts_payable: number;
	merma_pct: number;
	margin_pct: number;
}

interface CBatchProfitabilitySummary extends BatchProfitabilitySummary
{
	date_display: string;
	status_badge_class: string;
	profit_class: string;
	margin_class: string;
}

interface BatchProfitabilityItemRow
{
	item_id: number;
	item_code: string;
	item_name: string;
	category_id: number | null;
	category_name: string | null;
	purchase_cost: number;
	unit_cost: number;
	qty_received: number;
	qty_sold: number;
	qty_returned: number;
	qty_merma: number;
	qty_existence: number;
	qty_current_db: number;
	net_sales: number;
	gross_sales: number;
	sold_tax: number;
	sold_discount: number;
	expenses: number;
	cost_of_sold: number;
	cost_of_merma: number;
	estimated_profit: number;
	accounts_receivable: number;
	accounts_payable: number;
	merma_pct: number;
	margin_pct: number;
	orders_count: number;
}

interface CBatchProfitabilityItemRow extends BatchProfitabilityItemRow
{
	profit_class: string;
}

interface BatchBillRow
{
	bill_id: number;
	folio: string | null;
	name: string | null;
	note: string | null;
	total: number;
	amount_paid: number;
	pending_amount: number;
	paid_status: string;
	purchase_id: number | null;
	provider_user_id: number | null;
	provider_name: string | null;
	created: string;
	due_date: string | null;
	bill_category: 'COMPRA' | 'GASTO';
}

interface CBatchBillRow extends BatchBillRow
{
	category_badge_class: string;
	paid_status_display: string;
	paid_badge_class: string;
}

@Component({
	selector: 'app-batch-profitability-report',
	standalone: true,
	imports: [CommonModule, FormsModule, LoadingComponent],
	templateUrl: './batch-profitability-report.component.html',
	styleUrl: './batch-profitability-report.component.css'
})
export class BatchProfitabilityReportComponent extends BaseComponent implements OnInit
{
	batch: string = '';
	store_id: string = 'ALL';
	start_date: string = '';
	end_date: string = '';

	store_array: Store[] = [];
	batch_option_array: CBatchListOption[] = [];

	summary: CBatchProfitabilitySummary | null = null;
	item_array: CBatchProfitabilityItemRow[] = [];
	bill_array: CBatchBillRow[] = [];
	has_searched: boolean = false;

	rest_store: RestSimple<Store> = this.rest.initRestSimple<Store>('store');

	ngOnInit(): void
	{
		this.setTitle('Rentabilidad por Lote');
		this.path = '/batch-profitability-report';

		if (this.rest.user?.store_id)
		{
			this.store_id = '' + this.rest.user.store_id;
		}

		this.is_loading = true;

		const initial_batch_params: Record<string, string | number> = {
			action: 'list_batches',
			store_id: this.store_id
		};

		this.subs.sink = forkJoin
		({
			stores: this.rest_store.search({ eq: { status: 'ACTIVE' }, limit: 999999, sort_order: ['name_ASC'] }),
			batches: this.rest.getReportByPath('getBatchProfitability', initial_batch_params).pipe
			(
				catchError((error) =>
				{
					this.showError(error);
					return of({ total: 0, data: [] });
				})
			)
		})
		.subscribe
		({
			next: (response: any) =>
			{
				this.store_array = response.stores.data || [];
				const batch_rows: BatchListOption[] = response.batches?.data || [];
				this.batch_option_array = batch_rows.map(row => this.getCBatchListOption(row));
				this.is_loading = false;
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	onStoreChange(): void
	{
		const params: Record<string, string | number> = {
			action: 'list_batches',
			store_id: this.store_id
		};

		this.subs.sink = this.rest.getReportByPath('getBatchProfitability', params).subscribe
		({
			next: (response: any) =>
			{
				const batch_rows: BatchListOption[] = response.data || [];
				this.batch_option_array = batch_rows.map(row => this.getCBatchListOption(row));

				if (this.batch.trim())
				{
					this.searchReport();
				}
			},
			error: (error) => this.showError(error)
		});
	}

	onSelectBatchOption(selected_batch: string): void
	{
		if (selected_batch)
		{
			this.batch = selected_batch;
			this.searchReport();
		}
	}

	getTimestamp(value: string): string
	{
		if (!value)
		{
			return '';
		}

		const date = Utils.getLocalDateFromMysqlString(value.replace('T', ' '));
		return date ? Utils.getUTCMysqlStringFromDate(date) : '';
	}

	searchReport(): void
	{
		const trimmed_batch = this.batch.trim();
		if (!trimmed_batch)
		{
			this.showWarning('Ingresa o selecciona un código de lote.');
			return;
		}

		this.is_loading = true;

		const params: Record<string, string | number | null> = {
			batch: trimmed_batch,
			store_id: this.store_id,
			start_timestamp: this.start_date ? this.getTimestamp(this.start_date) : null,
			end_timestamp: this.end_date ? this.getTimestamp(this.end_date) : null
		};

		this.subs.sink = this.rest.getReportByPath('getBatchProfitability', params).subscribe
		({
			next: (response: any) =>
			{
				const raw_summary: BatchProfitabilitySummary | null = response.summary || null;
				const raw_items: BatchProfitabilityItemRow[] = response.items || [];
				const raw_bills: BatchBillRow[] = response.bills || [];

				this.summary = raw_summary ? this.getCBatchProfitabilitySummary(raw_summary) : null;
				this.item_array = raw_items.map(row => this.getCBatchProfitabilityItemRow(row));
				this.bill_array = raw_bills.map(row => this.getCBatchBillRow(row));
				this.has_searched = true;
				this.is_loading = false;
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	getCBatchListOption(row: BatchListOption): CBatchListOption
	{
		const provider_part = row.provider_name ? ` - ${row.provider_name}` : '';
		const date_part = row.first_entry_date ? ` (${row.first_entry_date.substring(0, 10)})` : '';
		return {
			...row,
			label_display: `${row.batch}${provider_part}${date_part}`
		};
	}

	getCBatchProfitabilitySummary(summary: BatchProfitabilitySummary): CBatchProfitabilitySummary
	{
		const date_display = summary.date ? summary.date.substring(0, 10) : 'N/A';
		let status_badge_class = 'badge bg-secondary';

		if (summary.status === 'En proceso')
		{
			status_badge_class = 'badge bg-primary';
		}
		else if (summary.status === 'Cerrado')
		{
			status_badge_class = 'badge bg-success';
		}

		const profit_class = summary.estimated_profit >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold';
		const margin_class = summary.margin_pct >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold';

		return {
			...summary,
			date_display,
			status_badge_class,
			profit_class,
			margin_class
		};
	}

	getCBatchProfitabilityItemRow(row: BatchProfitabilityItemRow): CBatchProfitabilityItemRow
	{
		const profit_class = row.estimated_profit >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold';
		return {
			...row,
			profit_class
		};
	}

	getCBatchBillRow(row: BatchBillRow): CBatchBillRow
	{
		const category_badge_class = row.bill_category === 'GASTO' ? 'badge bg-warning text-dark' : 'badge bg-info text-dark';
		const is_paid = row.paid_status === 'PAID' || row.pending_amount <= 0.009;
		const paid_status_display = is_paid ? 'Pagado' : 'Pendiente';
		const paid_badge_class = is_paid ? 'badge bg-success' : 'badge bg-danger';

		return {
			...row,
			category_badge_class,
			paid_status_display,
			paid_badge_class
		};
	}

	downloadExcel(): void
	{
		if (!this.summary || !this.item_array.length)
		{
			return;
		}

		const headers = [
			'Código',
			'Especie / producto',
			'Costo compra ($)',
			'Recibido (kg)',
			'Vendido (kg)',
			'Merma (kg)',
			'Existencia (kg)',
			'Venta neta ($)',
			'Gastos ($)',
			'Utilidad estimada ($)',
			'Por cobrar ($)',
			'Por pagar ($)'
		];

		const rows: Record<string, string | number | null>[] = this.item_array.map(row => ({
			'Código': row.item_code,
			'Especie / producto': row.item_name,
			'Costo compra ($)': row.purchase_cost,
			'Recibido (kg)': row.qty_received,
			'Vendido (kg)': row.qty_sold,
			'Merma (kg)': row.qty_merma,
			'Existencia (kg)': row.qty_existence,
			'Venta neta ($)': row.net_sales,
			'Gastos ($)': row.expenses,
			'Utilidad estimada ($)': row.estimated_profit,
			'Por cobrar ($)': row.accounts_receivable,
			'Por pagar ($)': row.accounts_payable
		}));

		rows.push({
			'Código': '',
			'Especie / producto': 'TOTALES',
			'Costo compra ($)': this.summary.purchase_cost,
			'Recibido (kg)': this.summary.qty_received,
			'Vendido (kg)': this.summary.qty_sold,
			'Merma (kg)': this.summary.qty_merma,
			'Existencia (kg)': this.summary.qty_existence,
			'Venta neta ($)': this.summary.net_sales,
			'Gastos ($)': this.summary.expenses,
			'Utilidad estimada ($)': this.summary.estimated_profit,
			'Por cobrar ($)': this.summary.accounts_receivable,
			'Por pagar ($)': this.summary.accounts_payable
		});

		const safe_batch = this.summary.batch.replace(/[^a-zA-Z0-9_-]/g, '_');
		const filename = `rentabilidad_lote_${safe_batch}.xlsx`;

		ExcelUtils.array2xlsx(rows, filename, headers);
	}
}

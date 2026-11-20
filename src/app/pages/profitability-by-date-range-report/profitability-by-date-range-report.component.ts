import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';
import { Store, Category } from '../../modules/shared/RestModels';
import { RestSimple } from '../../modules/shared/services/Rest';
import { LoadingComponent } from '../../components/loading/loading.component';
import { ExcelUtils } from '../../classes/ExcelUtils';

interface ProfitabilitySummary
{
	start_timestamp: string;
	end_timestamp: string;
	qty_received: number;
	qty_sold: number;
	qty_merma: number;
	qty_existence: number;
	net_sales: number;
	gross_sales: number;
	purchase_cost: number;
	cost_of_sold: number;
	cost_of_merma: number;
	gross_profit: number;
	expenses: number;
	estimated_profit: number;
	accounts_receivable: number;
	accounts_payable: number;
	merma_pct: number;
	margin_pct: number;
	gross_margin_pct: number;
}

interface CProfitabilitySummary extends ProfitabilitySummary
{
	gross_profit_class: string;
	profit_class: string;
	margin_class: string;
}

interface ProfitabilityItemRow
{
	item_id: number;
	item_code: string;
	item_name: string;
	category_id: number | null;
	category_name: string | null;
	cost_source: 'COMPRAS' | 'REFERENCIA' | 'SIN_COSTO';
	unit_cost: number;
	purchase_cost: number;
	qty_received: number;
	qty_sold: number;
	qty_returned: number;
	qty_merma: number;
	qty_existence: number;
	net_sales: number;
	gross_sales: number;
	cost_of_sold: number;
	cost_of_merma: number;
	gross_profit: number;
	accounts_receivable: number;
	accounts_payable: number;
	merma_pct: number;
	margin_pct: number;
	orders_count: number;
}

interface CProfitabilityItemRow extends ProfitabilityItemRow
{
	profit_class: string;
	cost_source_display: string;
	cost_source_badge_class: string;
}

interface ProfitabilityBillRow
{
	bill_id: number;
	folio: string | null;
	name: string | null;
	note: string | null;
	total: number;
	amount_paid: number;
	pending_amount: number;
	paid_status: string;
	provider_name: string | null;
	created: string;
	due_date: string | null;
}

interface CProfitabilityBillRow extends ProfitabilityBillRow
{
	paid_status_display: string;
	paid_badge_class: string;
}

@Component({
	selector: 'app-profitability-by-date-range-report',
	standalone: true,
	imports: [CommonModule, FormsModule, LoadingComponent],
	templateUrl: './profitability-by-date-range-report.component.html',
	styleUrl: './profitability-by-date-range-report.component.css'
})
export class ProfitabilityByDateRangeReportComponent extends BaseComponent implements OnInit
{
	store_id: string = 'ALL';
	category_id: string = 'ALL';
	start_date: string = '';
	end_date: string = '';

	store_array: Store[] = [];
	category_array: Category[] = [];

	summary: CProfitabilitySummary | null = null;
	item_array: CProfitabilityItemRow[] = [];
	bill_array: CProfitabilityBillRow[] = [];
	estimated_cost_count: number = 0;
	has_searched: boolean = false;

	rest_store: RestSimple<Store> = this.rest.initRestSimple<Store>('store');
	rest_category: RestSimple<Category> = this.rest.initRestSimple<Category>('category');

	ngOnInit(): void
	{
		this.setTitle('Rentabilidad por Rango de Fechas');
		this.path = '/profitability-by-date-range-report';

		if (this.rest.user?.store_id)
		{
			this.store_id = '' + this.rest.user.store_id;
		}

		const today = new Date();
		const first_day = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0);
		const last_moment = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
		this.start_date = this.getInputValue(first_day);
		this.end_date = this.getInputValue(last_moment);

		this.is_loading = true;

		this.subs.sink = forkJoin
		({
			stores: this.rest_store.search({ eq: { status: 'ACTIVE' }, limit: 999999, sort_order: ['name_ASC'] }),
			categories: this.rest_category.search({ limit: 999999, sort_order: ['name_ASC'] })
		})
		.subscribe
		({
			next: (response) =>
			{
				this.store_array = response.stores.data || [];
				this.category_array = response.categories.data || [];
				this.is_loading = false;
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	getInputValue(date: Date): string
	{
		const pad = (value: number) => ('' + value).padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	getTimestamp(value: string): string
	{
		const date = Utils.getLocalDateFromMysqlString(value.replace('T', ' '));
		return date ? Utils.getUTCMysqlStringFromDate(date) : '';
	}

	searchReport(): void
	{
		if (!this.start_date || !this.end_date)
		{
			this.showWarning('Selecciona la fecha inicial y la fecha final.');
			return;
		}

		if (this.start_date > this.end_date)
		{
			this.showWarning('La fecha inicial no puede ser mayor a la fecha final.');
			return;
		}

		this.is_loading = true;

		const params: Record<string, string | number | null> = {
			store_id: this.store_id,
			category_id: this.category_id === 'ALL' ? null : this.category_id,
			start_timestamp: this.getTimestamp(this.start_date),
			end_timestamp: this.getTimestamp(this.end_date)
		};

		this.subs.sink = this.rest.getReportByPath('getProfitabilityByDateRange', params).subscribe
		({
			next: (response: any) =>
			{
				const raw_summary: ProfitabilitySummary | null = response.summary || null;
				const raw_items: ProfitabilityItemRow[] = response.items || [];
				const raw_bills: ProfitabilityBillRow[] = response.bills || [];

				this.summary = raw_summary ? this.getCProfitabilitySummary(raw_summary) : null;
				this.item_array = raw_items.map(row => this.getCProfitabilityItemRow(row));
				this.bill_array = raw_bills.map(row => this.getCProfitabilityBillRow(row));
				this.estimated_cost_count = this.item_array.filter(row => row.cost_source !== 'COMPRAS').length;
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

	getCProfitabilitySummary(summary: ProfitabilitySummary): CProfitabilitySummary
	{
		return {
			...summary,
			gross_profit_class: summary.gross_profit >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold',
			profit_class: summary.estimated_profit >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold',
			margin_class: summary.margin_pct >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'
		};
	}

	getCProfitabilityItemRow(row: ProfitabilityItemRow): CProfitabilityItemRow
	{
		let cost_source_display = 'Compras';
		let cost_source_badge_class = 'badge bg-success';

		if (row.cost_source === 'REFERENCIA')
		{
			cost_source_display = 'Estimado';
			cost_source_badge_class = 'badge bg-warning text-dark';
		}
		else if (row.cost_source === 'SIN_COSTO')
		{
			cost_source_display = 'Sin costo';
			cost_source_badge_class = 'badge bg-danger';
		}

		return {
			...row,
			profit_class: row.gross_profit >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold',
			cost_source_display,
			cost_source_badge_class
		};
	}

	getCProfitabilityBillRow(row: ProfitabilityBillRow): CProfitabilityBillRow
	{
		const is_paid = row.paid_status === 'PAID' || row.pending_amount <= 0.009;

		return {
			...row,
			paid_status_display: is_paid ? 'Pagado' : 'Pendiente',
			paid_badge_class: is_paid ? 'badge bg-success' : 'badge bg-danger'
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
			'Producto',
			'Categoría',
			'Origen del costo',
			'Costo unitario ($)',
			'Recibido',
			'Vendido',
			'Merma',
			'Existencia actual',
			'Venta neta ($)',
			'Costo de lo vendido ($)',
			'Costo de merma ($)',
			'Utilidad bruta ($)',
			'Por cobrar ($)',
			'Por pagar ($)'
		];

		const rows: Record<string, string | number | null>[] = this.item_array.map(row => ({
			'Código': row.item_code,
			'Producto': row.item_name,
			'Categoría': row.category_name,
			'Origen del costo': row.cost_source_display,
			'Costo unitario ($)': row.unit_cost,
			'Recibido': row.qty_received,
			'Vendido': row.qty_sold,
			'Merma': row.qty_merma,
			'Existencia actual': row.qty_existence,
			'Venta neta ($)': row.net_sales,
			'Costo de lo vendido ($)': row.cost_of_sold,
			'Costo de merma ($)': row.cost_of_merma,
			'Utilidad bruta ($)': row.gross_profit,
			'Por cobrar ($)': row.accounts_receivable,
			'Por pagar ($)': row.accounts_payable
		}));

		rows.push({
			'Código': '',
			'Producto': 'TOTALES',
			'Categoría': '',
			'Origen del costo': '',
			'Costo unitario ($)': null,
			'Recibido': this.summary.qty_received,
			'Vendido': this.summary.qty_sold,
			'Merma': this.summary.qty_merma,
			'Existencia actual': this.summary.qty_existence,
			'Venta neta ($)': this.summary.net_sales,
			'Costo de lo vendido ($)': this.summary.cost_of_sold,
			'Costo de merma ($)': this.summary.cost_of_merma,
			'Utilidad bruta ($)': this.summary.gross_profit,
			'Por cobrar ($)': this.summary.accounts_receivable,
			'Por pagar ($)': this.summary.accounts_payable
		});

		rows.push({ 'Código': '', 'Producto': 'Gastos del periodo', 'Utilidad bruta ($)': -this.summary.expenses });
		rows.push({ 'Código': '', 'Producto': 'UTILIDAD ESTIMADA', 'Utilidad bruta ($)': this.summary.estimated_profit });

		const filename = `rentabilidad_${this.start_date.substring(0, 10)}_${this.end_date.substring(0, 10)}.xlsx`;

		ExcelUtils.array2xlsx(rows, filename, headers);
	}
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, filter, mergeMap } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';
import { RestSimple } from '../../modules/shared/services/Rest';
import { Commission_Rule, User } from '../../modules/shared/RestModels';
import { AgentCommissionItemRow, AgentCommissionOrderRow, AgentCommissionReport, GeneratedLine, calcPaidRatio, calculateAgentCommissions, toCalcNumber } from '../../modules/shared/CommissionFormula';

interface AgentSummary {
	agent_id: number | string;
	agent_name: string;
	total_cost: number | string;
	total_sale: number | string;
	total_profit: number | string;
	total_paid: number | string;
	total_commission: number | string;
	total_commission_paid: number | string;
	commission_billed_amount: number | string;
	commission_pending_amount: number | string;
}

interface AgentSaleApiRow {
	order_id: number | string;
	order_date: string | null;
	client_name: string | null;
	order_total: number | string;
	payment_id: number | string;
	amount_paid_in_period: number | string;
	commission_id: number | string | null;
	commission_bill_id: number | string | null;
	commission_paid_in_period: number | string;
}

interface AgentItemApiRow extends AgentCommissionItemRow {
	item_name: string;
	total_commission: number | string;
}

interface AgentDetailOrderEntry {
	amount_paid_in_period: number | string;
	order: AgentCommissionOrderRow | null;
	items: AgentItemApiRow[];
}

interface AgentDetailReport {
	agent: { agent_id: number | string; agent_name: string | null } | null;
	summary: AgentSummary | null;
	sales: AgentSaleApiRow[];
	items_by_order: Record<string, AgentDetailOrderEntry>;
}

interface AgentSaleItemRow {
	order_item_id: number;
	item_name: string;
	qty: number;
	unitary_price: number;
	commission_reference: number;
	commission_amount: number;
	rule_id: number | null;
}

interface AgentSaleRow {
	sale_key: string;
	order_id: number;
	payment_id: number;
	client_name: string;
	order_date_display: string;
	order_total: number;
	amount_paid_in_period: number;
	paid_ratio: number;
	commission_amount: number;
	commission_reference: number;
	commission_id: number | null;
	commission_bill_id: number | null;
	expanded: boolean;
	item_rows: AgentSaleItemRow[];
}

@Component({
	selector: 'app-agent-commission-detail',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink],
	templateUrl: './agent-commission-detail.component.html',
	styleUrl: './agent-commission-detail.component.css'
})
export class AgentCommissionDetailComponent extends BaseComponent implements OnInit {

	agent_user_id: string = '';
	agent_user: User | null = null;
	agent_name: string = '';
	start_date: string = '';
	end_date: string = '';
	detail_date_start: string = '';
	detail_date_end: string = '';
	summary: AgentSummary | null = null;
	sale_rows: AgentSaleRow[] = [];
	commission_lines: GeneratedLine[] = [];
	total_calculated: number = 0;
	reference_pending: number = 0;
	calc_errors: string[] = [];

	rest_user: RestSimple<User> = this.rest.initRestSimple('user');
	rest_commission_rule: RestSimple<Commission_Rule> = this.rest.initRestSimple('commission_rule');

	ngOnInit(): void {
		this.setTitle('Detalle de Comisiones del Agente');

		this.subs.sink = this.route.queryParamMap.pipe(
			mergeMap((query_map) => {
				this.agent_user_id = this.route.snapshot.paramMap.get('user_id') || '';
				this.start_date = query_map.get('start_date') || this.getFirstDayOfMonth();
				this.end_date = query_map.get('end_date') || this.getLastDayOfMonth();
				return this.fetchDetail();
			})
		).subscribe({
			next: (result: any) => this.handleDetailResult(result),
			error: (error) => this.handleDetailError(error)
		});
	}

	getFirstDayOfMonth(): string {
		const now = new Date();
		now.setDate(1);
		now.setHours(0, 0, 0, 0);
		return Utils.getLocalMysqlStringFromDate(now).replace(' ', 'T').substring(0, 16);
	}

	getLastDayOfMonth(): string {
		let d = Utils.getEndOfMonth(new Date());
		d.setHours(23, 59, 59, 0);
		return Utils.getLocalMysqlStringFromDate(d).replace(' ', 'T').substring(0, 16);
	}

	applyFilters() {
		this.router.navigate(['/agent-commission-detail', this.agent_user_id], {
			queryParams: { start_date: this.start_date, end_date: this.end_date }
		});
	}

	fetchDetail() {
		this.is_loading = true;
		this.detail_date_start = this.start_date.replace('T', ' ') + ':00';
		this.detail_date_end = this.end_date.replace('T', ' ') + ':59';

		return forkJoin({
			agent: this.rest_user.get(this.agent_user_id).pipe(catchError(() => of(null))),
			report: this.rest.httpPost('reports/getCommissionByAgentByPayment.php', {
				user_id: this.agent_user_id,
				date_start: this.detail_date_start,
				date_end: this.detail_date_end,
				billing_status: 'PENDING'
			}),
			rules: this.rest_commission_rule.search({ limit: 9999 })
		});
	}

	handleDetailResult(result: any) {
		this.is_loading = false;
		const report = result.report as AgentDetailReport;
		const calc_result = calculateAgentCommissions(report as unknown as AgentCommissionReport, result.rules.data || [], this.detail_date_start, this.detail_date_end);

		this.agent_user = result.agent as User | null;
		this.agent_name = report.agent?.agent_name || this.agent_user?.name || '';
		this.summary = report.summary || null;
		this.reference_pending = toCalcNumber(report.summary?.commission_pending_amount);

		const line_by_key = new Map<string, GeneratedLine>();
		calc_result.lines.forEach((line) => line_by_key.set(line.order_id + '-' + line.payment_id, line));

		this.sale_rows = (report.sales || []).map((sale) => this.buildSaleRow(sale, report, line_by_key));
		this.commission_lines = calc_result.lines;
		this.total_calculated = calc_result.total_amount;
		this.calc_errors = calc_result.errors;
	}

	handleDetailError(error: any) {
		this.is_loading = false;
		this.showError(error);
	}

	buildSaleRow(sale: AgentSaleApiRow, report: AgentDetailReport, line_by_key: Map<string, GeneratedLine>): AgentSaleRow {
		const order_id = Number(sale.order_id);
		const payment_id = Number(sale.payment_id);
		const line = line_by_key.get(order_id + '-' + payment_id);
		const entry = report.items_by_order ? report.items_by_order[String(sale.order_id)] : null;
		const order_total = toCalcNumber(sale.order_total);
		const amount_paid_in_period = toCalcNumber(sale.amount_paid_in_period);

		const item_by_id = new Map<number, { amount: number; rule_id: number | null }>();
		(line?.items || []).forEach((item) => item_by_id.set(item.order_item_id, item));

		const item_rows = (entry?.items || []).map((item): AgentSaleItemRow => {
			const calc_item = item_by_id.get(Number(item.order_item_id));
			return {
				order_item_id: Number(item.order_item_id),
				item_name: item.item_name || '',
				qty: toCalcNumber(item.qty),
				unitary_price: toCalcNumber(item.unitary_price),
				commission_reference: toCalcNumber(item.total_commission),
				commission_amount: calc_item ? calc_item.amount : 0,
				rule_id: calc_item ? calc_item.rule_id : null
			};
		});

		return {
			sale_key: order_id + '-' + payment_id,
			order_id: order_id,
			payment_id: payment_id,
			client_name: sale.client_name || '',
			order_date_display: String(sale.order_date || '').substring(0, 16),
			order_total: order_total,
			amount_paid_in_period: amount_paid_in_period,
			paid_ratio: line ? line.paid_ratio : calcPaidRatio(amount_paid_in_period, order_total),
			commission_amount: line ? line.amount : 0,
			commission_reference: toCalcNumber(sale.commission_paid_in_period),
			commission_id: sale.commission_id === null || sale.commission_id === undefined || sale.commission_id === '' ? null : Number(sale.commission_id),
			commission_bill_id: sale.commission_bill_id === null || sale.commission_bill_id === undefined || sale.commission_bill_id === '' ? null : Number(sale.commission_bill_id),
			expanded: false,
			item_rows: item_rows
		};
	}

	toggleSale(sale: AgentSaleRow) {
		sale.expanded = !sale.expanded;
	}

	generateCommissions() {
		if (this.calc_errors.length > 0) {
			this.showError('Corrija los errores de fórmula antes de generar: ' + this.calc_errors[0]);
			return;
		}
		if (this.commission_lines.length === 0) {
			this.showError('No hay líneas pendientes por generar para este agente.');
			return;
		}

		this.subs.sink = this.confirmation
			.showConfirmAlert(null, 'Generar Comisiones', 'Generar ' + this.commission_lines.length + ' comisiones de ' + this.agent_name + ' por ' + this.total_calculated + '?', 'Sí', 'No')
			.pipe(
				filter((x) => x.accepted),
				mergeMap(() => {
					this.is_loading = true;
					return this.rest.httpPost('generate_commission_by_agent.php', {
						user_id: this.agent_user_id,
						date_start: this.detail_date_start,
						date_end: this.detail_date_end,
						lines: this.commission_lines
					});
				})
			)
			.subscribe({
				next: (response: any) => {
					const generated_count = (response.generated_commission_ids || []).length;
					const skipped_count = (response.skipped || []).length;
					this.showSuccess('Comisiones generadas: ' + generated_count + ', omitidas: ' + skipped_count);
					this.subs.sink = this.fetchDetail().subscribe({
						next: (result: any) => this.handleDetailResult(result),
						error: (error) => this.handleDetailError(error)
					});
				},
				error: (error) => {
					this.is_loading = false;
					this.showError(error);
				}
			});
	}
}

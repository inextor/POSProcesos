import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';
import { RestSimple } from '../../modules/shared/services/Rest';
import { Commission_Rule } from '../../modules/shared/RestModels';
import { AgentCommissionReport, GeneratedLine, calculateAgentCommissions } from '../../modules/shared/CommissionFormula';

interface CommissionSummary {
	agent_id: string;
	agent_name: string;
	total_cost: number;
	total_sale: number;
	total_profit: number;
	total_paid: number;
	total_commission: number;
	total_commission_paid: number;
	expanded?: boolean;
	sales?: CommissionSale[];
	loading_sales?: boolean;
	selected?: boolean;
}

interface CommissionSale {
	order_id: string;
	order_date: string;
	client_name: string;
	order_total: number;
	payment_id: string;
	amount_paid_in_period: number;
	commission_id: number | null;
	commission_bill_id: number | null;
	total_cost: number;
	total_sale: number;
	total_profit: number;
	total_commission: number;
	proportional_cost: number;
	proportional_sale: number;
	proportional_profit: number;
	commission_paid_in_period: number;
	expanded?: boolean;
	items?: CommissionItem[];
	loading_items?: boolean;
	selected?: boolean;
}

interface CommissionItem {
	item_name: string;
	qty: number;
	unit_cost: number;
	total_cost: number;
	unit_sale: number;
	total_sale: number;
	profit: number;
	total_commission: number;
	total_commission_paid: number;
	commission_paid_in_period: number;
}

@Component({
	selector: 'app-payment-commission-report',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './payment-commission-report.component.html',
	styleUrls: ['./payment-commission-report.component.css']
})
export class PaymentCommissionReportComponent extends BaseComponent implements OnInit {

	start_date: string = '';
	end_date: string = '';
	billing_status: string = 'PENDING';
	summaries: CommissionSummary[] = [];
	external_base_url: string = '';
	rest_commission_rule: RestSimple<Commission_Rule> = this.rest.initRestSimple('commission_rule');

	show_preview: boolean = false;
	preview_agent_id: string = '';
	preview_agent_name: string = '';
	preview_date_start: string = '';
	preview_date_end: string = '';
	preview_lines: GeneratedLine[] = [];
	preview_total: number = 0;
	preview_reference_total: number = 0;
	preview_errors: string[] = [];

	ngOnInit(): void {
		this.start_date = this.getFirstDayOfMonth();
		this.end_date = this.getLastDayOfMonth();
		this.setTitle('Reporte de Comisiones por Pagos');
		this.external_base_url = this.rest.getExternalAppUrl();
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

	generateReport() {
		this.is_loading = true;
		const date_start = this.start_date.replace('T', ' ') + ':00';
		const date_end = this.end_date.replace('T', ' ') + ':59';

		this.rest.httpPost('reports/getCommissionSummaryByAgentByPayment.php', { 
			date_start, 
			date_end,
			billing_status: this.billing_status 
		})
			.subscribe({
				next: (data: any) => {
					const summaryData = Array.isArray(data) ? data : (data.data || []);
					this.summaries = summaryData.map((s: any) => ({ ...s, expanded: false, sales: [], loading_sales: false, selected: false }));
					this.is_loading = false;
				},
				error: (error) => {
					this.showError(error);
					this.is_loading = false;
				}
			});
	}

	toggleAgent(agent: CommissionSummary) {
		agent.expanded = !agent.expanded;
		if (agent.expanded && (!agent.sales || agent.sales.length === 0)) {
			this.loadSales(agent);
		}
	}

	toggleAgentSelection(agent: CommissionSummary) {
		if (agent.sales) {
			agent.sales.forEach(s => s.selected = agent.selected);
		}
	}

	onSaleSelectionChange(agent: CommissionSummary) {
		if (agent.sales) {
			agent.selected = agent.sales.every(s => s.selected);
		}
	}

	toggleAll(event: any) {
		const isChecked = event.target.checked;
		this.summaries.forEach(agent => {
			agent.selected = isChecked;
			if (agent.sales) {
				agent.sales.forEach(s => s.selected = isChecked);
			}
		});
	}

	loadSales(agent: CommissionSummary) {
		agent.loading_sales = true;
		const date_start = this.start_date.replace('T', ' ') + ':00';
		const date_end = this.end_date.replace('T', ' ') + ':59';

		this.sink = this.rest.httpPost('reports/getCommissionSalesByAgentByPayment.php', { 
			agent_ids: [agent.agent_id], 
			date_start, 
			date_end,
			billing_status: this.billing_status 
		})
			.subscribe({
				next: (data: any) => {
					const salesData = Array.isArray(data) ? data : (data.data || []);
					agent.sales = salesData.map((s: any) => ({ ...s, expanded: false, items: [], loading_items: false, selected: agent.selected || false }));
					agent.loading_sales = false;
				},
				error: (error) => {
					this.showError(error);
					agent.loading_sales = false;
				}
			});
	}

	async processCommissions() {
		const agentsToLoad = this.summaries.filter(a => a.selected && (!a.sales || a.sales.length === 0));

		if (agentsToLoad.length > 0) {
			this.is_loading = true;
			const date_start = this.start_date.replace('T', ' ') + ':00';
			const date_end = this.end_date.replace('T', ' ') + ':59';
			const agent_ids = agentsToLoad.map(a => a.agent_id);

			try {
				const data: any = await this.rest.httpPost('reports/getCommissionSalesByAgentByPayment.php', { 
					agent_ids, 
					date_start, 
					date_end,
					billing_status: this.billing_status 
				}).toPromise();

				const salesData = Array.isArray(data) ? data : (data.data || []);
				
				agentsToLoad.forEach(agent => {
					agent.sales = salesData.filter((s: any) => s.agent_id == agent.agent_id || agent_ids.length === 1)
						.map((s: any) => ({ ...s, expanded: false, items: [], loading_items: false, selected: true }));
				});
			} catch (error) {
				this.showError(error);
			}
			this.is_loading = false;
		}

		const selections = this.summaries.flatMap(a => a.sales || [])
			.filter(s => s.selected && !s.commission_id)
			.map(s => ({ order_id: s.order_id, payment_id: s.payment_id }));

		if (selections.length === 0) {
			this.showError('Seleccione al menos una orden para procesar.');
			return;
		}

		if (!confirm(`¿Está seguro de generar facturas de comisiones para ${selections.length} pagos seleccionados?`)) {
			return;
		}

		this.is_loading = true;
		this.rest.httpPost('generate_commission_bills.php', { selections })
			.subscribe({
				next: () => {
					alert('Comisiones procesadas exitosamente');
					this.generateReport();
				},
				error: (error) => {
					this.showError(error);
					this.is_loading = false;
				}
			});
	}

	calculateAgentFormulas(agent: CommissionSummary) {
		this.is_loading = true;
		this.show_preview = false;
		const date_start = this.start_date.replace('T', ' ') + ':00';
		const date_end = this.end_date.replace('T', ' ') + ':59';

		this.subs.sink = forkJoin({
			report: this.rest.httpPost('reports/getCommissionByAgentByPayment.php', {
				user_id: agent.agent_id,
				date_start: date_start,
				date_end: date_end,
				billing_status: 'PENDING'
			}),
			rules: this.rest_commission_rule.search({ limit: 9999 })
		}).subscribe({
			next: (result: any) => {
				this.is_loading = false;
				const calc_result = calculateAgentCommissions(result.report as AgentCommissionReport, result.rules.data || [], date_start, date_end);
				this.preview_agent_id = agent.agent_id;
				this.preview_agent_name = agent.agent_name;
				this.preview_date_start = date_start;
				this.preview_date_end = date_end;
				this.preview_lines = calc_result.lines;
				this.preview_total = calc_result.total_amount;
				this.preview_reference_total = Number(result.report?.summary?.commission_pending_amount || 0);
				this.preview_errors = calc_result.errors;
				this.show_preview = true;
			},
			error: (error) => {
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	cancelPreview() {
		this.show_preview = false;
		this.preview_lines = [];
		this.preview_errors = [];
	}

	confirmGeneratePreview() {
		if (this.preview_errors.length > 0) {
			this.showError('Corrija los errores de fórmula antes de generar: ' + this.preview_errors[0]);
			return;
		}
		if (this.preview_lines.length === 0) {
			this.showError('No hay líneas pendientes por generar para este agente.');
			return;
		}

		this.subs.sink = this.confirmation
			.showConfirmAlert(null, 'Generar Comisiones', 'Generar ' + this.preview_lines.length + ' comisiones de ' + this.preview_agent_name + ' por ' + this.preview_total + '?', 'Sí', 'No')
			.pipe(
				filter((x) => x.accepted),
				mergeMap(() => {
					this.is_loading = true;
					return this.rest.httpPost('generate_commission_by_agent.php', {
						user_id: this.preview_agent_id,
						date_start: this.preview_date_start,
						date_end: this.preview_date_end,
						lines: this.preview_lines
					});
				})
			)
			.subscribe({
				next: (response: any) => {
					const generated_count = (response.generated_commission_ids || []).length;
					const skipped_count = (response.skipped || []).length;
					this.showSuccess('Comisiones generadas: ' + generated_count + ', omitidas: ' + skipped_count);
					this.cancelPreview();
					this.generateReport();
				},
				error: (error) => {
					this.is_loading = false;
					this.showError(error);
				}
			});
	}

	toggleSale(sale: CommissionSale) {
		sale.expanded = !sale.expanded;
		if (sale.expanded && (!sale.items || sale.items.length === 0)) {
			this.loadItems(sale);
		}
	}

	loadItems(sale: CommissionSale) {
		sale.loading_items = true;
		const date_start = this.start_date.replace('T', ' ') + ':00';
		const date_end = this.end_date.replace('T', ' ') + ':59';

		this.sink = this.rest.httpPost('reports/getCommissionItemsByOrderByPayment.php', { 
			order_id: sale.order_id, 
			date_start, 
			date_end 
		})
			.subscribe({
				next: (data: any) => {
					if (data && data.items && Array.isArray(data.items)) {
						sale.items = data.items;
					} else if (Array.isArray(data)) {
						sale.items = data;
					} else {
						sale.items = [];
					}
					sale.loading_items = false;
				},
				error: (error) => {
					this.showError(error);
					sale.loading_items = false;
				}
			});
	}
}

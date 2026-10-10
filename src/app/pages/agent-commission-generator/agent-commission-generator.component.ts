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
}

@Component({
	selector: 'app-agent-commission-generator',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './agent-commission-generator.component.html',
	styleUrl: './agent-commission-generator.component.css'
})
export class AgentCommissionGeneratorComponent extends BaseComponent implements OnInit {

	start_date: string = '';
	end_date: string = '';
	summaries: CommissionSummary[] = [];
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
		this.setTitle('Generar Comisiones por Fórmula');
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
			billing_status: 'PENDING'
		})
			.subscribe({
				next: (data: any) => {
					const summaryData = Array.isArray(data) ? data : (data.data || []);
					this.summaries = summaryData;
					this.is_loading = false;
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
}

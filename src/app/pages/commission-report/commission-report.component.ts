import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';

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
}

interface CommissionSale {
	order_id: string;
	date: string;
	client_name: string;
	sale_total: number;
	amount_paid: number;
	total_cost: number;
	total_profit: number;
	total_commission: number;
	commission_paid: number;
	expanded?: boolean;
	items?: CommissionItem[];
	loading_items?: boolean;
}

interface CommissionItem {
	item_name: string;
	qty: number;
	unit_cost: number;
	total_cost: number;
	unit_sale: number;
	total_sale: number;
	profit: number;
	commission: number;
	commission_paid: number;
}

@Component({
	selector: 'app-commission-report',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './commission-report.component.html',
	styleUrls: ['./commission-report.component.css']
})
export class CommissionReportComponent extends BaseComponent implements OnInit {

	start_date: string = '';
	end_date: string = '';
	summaries: CommissionSummary[] = [];

	ngOnInit(): void {
		this.start_date = this.getFirstDayOfMonth();
		this.end_date = this.getLastDayOfMonth();
		this.setTitle('Reporte de Comisiones');
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

		this.rest.getReportByPath('getCommissionSummaryByAgent', { date_start, date_end })
			.subscribe({
				next: (data: CommissionSummary[]) => {
					this.summaries = data.map(s => ({ ...s, expanded: false, sales: [], loading_sales: false }));
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

	loadSales(agent: CommissionSummary) {
		agent.loading_sales = true;
		const date_start = this.start_date.replace('T', ' ') + ':00';
		const date_end = this.end_date.replace('T', ' ') + ':59';

		this.rest.getReportByPath('getCommissionSalesByAgent', { agent_id: agent.agent_id, date_start, date_end })
			.subscribe({
				next: (data: CommissionSale[]) => {
					agent.sales = data.map(s => ({ ...s, expanded: false, items: [], loading_items: false }));
					agent.loading_sales = false;
				},
				error: (error) => {
					this.showError(error);
					agent.loading_sales = false;
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
		this.rest.getReportByPath('getCommissionItemsByOrder', { order_id: sale.order_id })
			.subscribe({
				next: (data: CommissionItem[]) => {
					sale.items = data;
					sale.loading_items = false;
				},
				error: (error) => {
					this.showError(error);
					sale.loading_items = false;
				}
			});
	}
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../modules/shared/base/base.component';

interface CommissionAdjustment {
	id: number;
	agent_user_id: number;
	agent_name: string;
	amount: number;
	bill_id: number | null;
	bill_paid_status: string | null;
	concept: string;
	currency_id: string;
	note: string | null;
	store_id: number;
}

interface AgentUser {
	id: number;
	name: string;
}

@Component({
	selector: 'app-manual-commissions',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './manual-commissions.component.html',
	styleUrls: ['./manual-commissions.component.css']
})
export class ManualCommissionsComponent extends BaseComponent implements OnInit {
	manual_adjustments: CommissionAdjustment[] = [];
	manual_form = this.getEmptyManualForm();
	editing_manual_id: number | null = null;
	agent_users: AgentUser[] = [];
	agent_search = '';
	filtered_agent_users: AgentUser[] = [];
	show_agent_dropdown = false;
	stores: { id: number; name: string }[] = [];

	ngOnInit(): void {
		this.setTitle('Comisiones Manuales');
		this.resetManualForm();
		this.loadManualAdjustments();
		this.loadAgentUsers();
		this.loadStores();
	}

	loadStores() {
		this.rest.initRestSimple<{ id: number; name: string }>('store').search({ limit: 9999 })
			.subscribe({
				next: (response: any) => {
					this.stores = (response.data || []).map((s: any) => ({ id: Number(s.id), name: s.name }));
				},
				error: (error) => this.showError(error)
			});
	}

	loadAgentUsers() {
		this.rest.initRestSimple<{ id: number; name: string }>('user').search({ eq: { type: 'USER' } as any, limit: 9999 })
			.subscribe({
				next: (response: any) => {
					const users = response.data || [];
					this.agent_users = users.map((u: any) => ({ id: Number(u.id), name: u.name }));
					this.filterAgentUsers();
				},
				error: (error) => this.showError(error)
			});
	}

	filterAgentUsers() {
		const q = this.agent_search.toLowerCase();
		this.filtered_agent_users = this.agent_users.filter(u =>
			u.name.toLowerCase().includes(q) || String(u.id).includes(q)
		);
	}

	selectAgent(user: AgentUser) {
		this.manual_form.agent_user_id = user.id;
		this.agent_search = user.name;
		this.show_agent_dropdown = false;
		this.filterAgentUsers();
	}

	onAgentSearchFocus() {
		if (this.agent_users.length > 50) {
			this.show_agent_dropdown = true;
		}
	}

	onAgentSearchBlur() {
		setTimeout(() => { this.show_agent_dropdown = false; }, 200);
	}

	setAgentSearchFromId() {
		const found = this.agent_users.find(u => u.id === this.manual_form.agent_user_id);
		this.agent_search = found ? found.name : '';
	}

	getEmptyManualForm() {
		return {
			agent_user_id: 0,
			amount: 0,
			concept: '',
			currency_id: 'MXN',
			note: '',
			store_id: 0
		};
	}

	resetManualForm() {
		this.editing_manual_id = null;
		const currentUser = this.rest.getUserFromSession();
		this.manual_form = this.getEmptyManualForm();
		this.manual_form.agent_user_id = Number(currentUser?.id || 0);
		this.manual_form.store_id = Number(currentUser?.store_id || 0);
		this.setAgentSearchFromId();
	}

	loadManualAdjustments() {
		this.rest.httpPost('commission.php', { action: 'list' })
			.subscribe({
				next: (data: any) => {
					this.manual_adjustments = Array.isArray(data) ? data : (data.data || []);
				},
				error: (error) => this.showError(error)
			});
	}

	saveManualAdjustment() {
		const payload: any = { ...this.manual_form };
		if (this.editing_manual_id) {
			payload.action = 'update';
			payload.id = this.editing_manual_id;
		}

		this.is_loading = true;
		this.rest.httpPost('commission.php', payload)
			.subscribe({
				next: () => {
					this.resetManualForm();
					this.loadManualAdjustments();
					this.is_loading = false;
				},
				error: (error) => {
					this.showError(error);
					this.is_loading = false;
				}
			});
	}

	editManualAdjustment(adjustment: CommissionAdjustment) {
		if (adjustment.bill_id) {
			return;
		}

		this.editing_manual_id = adjustment.id;
		this.manual_form = {
			agent_user_id: Number(adjustment.agent_user_id),
			amount: Number(adjustment.amount),
			concept: adjustment.concept,
			currency_id: adjustment.currency_id,
			note: adjustment.note || '',
			store_id: Number(adjustment.store_id)
		};
		this.setAgentSearchFromId();
	}

	deleteManualAdjustment(adjustment: CommissionAdjustment) {
		if (adjustment.bill_id || !confirm('¿Eliminar esta comisión manual?')) {
			return;
		}

		this.rest.httpPost('commission.php', { action: 'delete', id: adjustment.id })
			.subscribe({
				next: () => this.loadManualAdjustments(),
				error: (error) => this.showError(error)
			});
	}

	generateManualAdjustment(adjustment: CommissionAdjustment) {
		if (adjustment.bill_id || !confirm('¿Generar factura de comisión manual?')) {
			return;
		}

		this.is_loading = true;
		this.rest.httpPost('commission.php', { action: 'generate_bills', ids: [adjustment.id] })
			.subscribe({
				next: () => {
					this.loadManualAdjustments();
					this.is_loading = false;
				},
				error: (error) => {
					this.showError(error);
					this.is_loading = false;
				}
			});
	}
}

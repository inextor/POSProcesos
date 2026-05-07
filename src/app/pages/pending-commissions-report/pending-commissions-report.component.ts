import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Bill, User, Bank_Account, Payment, Bank_Movement } from '../../modules/shared/RestModels';
import { PaymentInfo } from '../../modules/shared/Models';
import { ModalComponent } from '../../components/modal/modal.component';
import { RouterLink } from '@angular/router';
interface BillItem {
	bill_id: number;
	bill_name: string;
	total: number;
	created: string;
	commission_payment_id: number;
	agent_id: number;
	agent_name: string;
	selected?: boolean;
}

interface AgentCommissions {
	agent_id: number;
	agent_name: string;
	bills: BillItem[];
	total: number;
	expanded: boolean;
	selected?: boolean;
}

@Component({
	selector: 'app-pending-commissions-report',
	standalone: true,
	imports: [CommonModule, FormsModule, ModalComponent, RouterLink],
	templateUrl: './pending-commissions-report.component.html',
	styleUrls: ['./pending-commissions-report.component.css']
})
export class PendingCommissionsReportComponent extends BaseComponent implements OnInit {

	agentsCommissions: AgentCommissions[] = [];

	show_payment_modal: boolean = false;
	bank_accounts: Bank_Account[] = [];
	selected_bank_account_id: number | null = null;
	selected_payment_type: string = 'CASH';

	show_menu_commissions: boolean = false;
	can_pay_commissions: boolean = false;
	can_approve_commissions: boolean = false;

	payment_type_dic:Record<string,string> =
	{
		'CASH': 'Efectivo',
		'CREDIT_CARD': 'Tarjeta Credito',
		'DEBIT_CARD' : 'Tarjeta Debito',
		'PAYPAL' : 'Paypal',
		'CHECK'		: 'Cheque',
		'DISCOUNT'	: 'Descuento',
		'RETURN_DISCOUNT':'Descuento por devolución',
		'TRANSFER'	: 'Transferencia',
	};

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit(): void {
		this.setTitle('Comisiones Pendientes de Pago');

		this.show_menu_commissions = this.rest.user_permission.view_commissions
			|| this.rest.user_permission.pay_commissions
			|| this.rest.user_permission.approve_commissions;

		this.can_pay_commissions = this.rest.user_permission.pay_commissions > 0;
		this.can_approve_commissions = this.rest.user_permission.approve_commissions > 0;

		this.loadPendingCommissions();
		this.loadBankAccounts();
	}

	loadBankAccounts() {
		this.subs.sink = this.rest.initRestSimple<Bank_Account>('bank_account').search({ eq: { is_a_payment_method: 'YES' }, limit: 9999 }).subscribe({
			next: (response) => {
				this.bank_accounts = response.data;
			},
			error: (error) => {
				this.showError('Error al cargar cuentas bancarias: ' + error);
			}
		});
	}

	loadPendingCommissions() {
		this.is_loading = true;

		this.subs.sink = this.rest.httpPost('reports/getPendingCommissionBills.php', {}).subscribe({
			next: (data: any) => {
				const rows = Array.isArray(data) ? data : (data.data || []);
				this.groupBillsByAgent(rows);
				this.is_loading = false;
			},
			error: (error) => {
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

	groupBillsByAgent(bills: BillItem[]) {
		const groups: Record<number, AgentCommissions> = {};

		bills.forEach(b => {
			if (!groups[b.agent_id]) {
				groups[b.agent_id] = {
					agent_id: b.agent_id,
					agent_name: b.agent_name,
					bills: [],
					total: 0,
					expanded: false,
					selected: false
				};
			}
			b.selected = false;
			groups[b.agent_id].bills.push(b);
			groups[b.agent_id].total += Number(b.total);
		});

		this.agentsCommissions = Object.values(groups).sort((a, b) => a.agent_name.localeCompare(b.agent_name));
	}

	toggleAgent(ac: AgentCommissions) {
		ac.expanded = !ac.expanded;
	}

	toggleAgentSelection(ac: AgentCommissions) {
		ac.bills.forEach(b => b.selected = ac.selected);
	}

	onBillSelectionChange(ac: AgentCommissions) {
		ac.selected = ac.bills.every(b => b.selected);
	}

	toggleAll(event: any) {
		const isChecked = event.target.checked;
		this.agentsCommissions.forEach(ac => {
			ac.selected = isChecked;
			ac.bills.forEach(b => b.selected = isChecked);
		});
	}

	generateBill() {
		const selectedBills = this.agentsCommissions
			.flatMap(ac => ac.bills)
			.filter(b => b.selected);

		if (selectedBills.length === 0) {
			this.showError('Seleccione al menos una comisión para procesar.');
			return;
		}

		this.show_payment_modal = true;
	}

	confirmGenerateBill() {
		const selectedBills = this.agentsCommissions
			.flatMap(ac => ac.bills)
			.filter(b => b.selected);

		const total = selectedBills.reduce((acc, b) => acc + Number(b.total), 0);
		const currency_id = 'MXN';

		const conceptParts = selectedBills.map(b => {
			const bAny = b as any;
			let parts = [];
			if (bAny.order_id) parts.push(`Orden: ${bAny.order_id}`);
			if (bAny.client_name) parts.push(`Cliente: ${bAny.client_name}`);
			if (bAny.order_total) parts.push(`Total venta: $${bAny.order_total}`);

			if (parts.length === 0 && b.bill_name) {
				return b.bill_name;
			}
			return parts.join(' ');
		});

		let conceptText = conceptParts.join('\n');

		const bank_movement: Partial<Bank_Movement> = {
			amount_received: total,
			bank_account_id: this.selected_bank_account_id,
			created: new Date(),
			currency_id: currency_id,
			status: 'ACTIVE',
			total: total,
			transaction_type: this.selected_payment_type as any,
			type: 'expense',
			updated: new Date(),
			exchange_rate: 1
		};

		const bank_movement_bills = selectedBills.map(b => ({
			bank_movement_bill: {
				bill_id: b.bill_id,
				amount: Number(b.total),
				currency_amount: Number(b.total),
				currency_id: currency_id,
				exchange_rate: 1
			}
		}));

		const payment: Partial<Payment> = {
			type: 'expense',
			tag: 'PAGO DE COMISIONES',
			concept: conceptText,
			payment_amount: total,
			received_amount: total,
			facturado: 'NO',
			store_id: this.rest.user?.store_id || 1,
			currency_id: currency_id,
			change_amount: 0
		};

		const payload = {
			payment,
			movements: [
				{
					bank_movement,
					bank_movement_bills
				}
			]
		};

		this.is_loading = true;
		const rest_payment_info = this.rest.initRest<Payment, PaymentInfo>('payment_info');

		this.subs.sink = rest_payment_info.create(payload as any).subscribe({
			next: (res) => {
				this.is_loading = false;
				this.show_payment_modal = false;
				this.showSuccess('Pago de comisiones registrado correctamente');
				this.loadPendingCommissions();
			},
			error: (err) => {
				this.is_loading = false;
				this.showError('Error al registrar el pago: ' + err);
			}
		});
	}

	debug(item: any) {
		console.log(item);
		alert(JSON.stringify(item, null, 2));
	}
}

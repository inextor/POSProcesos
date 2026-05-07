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

interface PaymentCommissions {
	payment_id: number;
	payment?: PaymentInfo;
	bills: BillItem[];
	total: number;
	expanded: boolean;
	selected?: boolean;
}

@Component({
	selector: 'app-paid-commissions-report',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink],
	templateUrl: './paid-commissions-report.component.html',
	styleUrls: ['./paid-commissions-report.component.css']
})
export class PaidCommissionsReportComponent extends BaseComponent implements OnInit {

	paymentsCommissions: PaymentCommissions[] = [];

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
		this.setTitle('Comisiones Pagadas');

		this.show_menu_commissions = this.rest.user_permission.view_commissions
			|| this.rest.user_permission.pay_commissions
			|| this.rest.user_permission.approve_commissions;

		this.can_pay_commissions = this.rest.user_permission.pay_commissions > 0;
		this.can_approve_commissions = this.rest.user_permission.approve_commissions > 0;

		this.loadPaidCommissions();
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

	loadPaidCommissions() {
		this.is_loading = true;

		this.subs.sink = this.rest.httpPost('reports/getPaidCommissionBills.php', {}).subscribe({
			next: (data: any) => {
				const rows: BillItem[] = Array.isArray(data) ? data : (data.data || []);
				this.loadPaymentsAndGroup(rows);
			},
			error: (error) => {
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

	loadPaymentsAndGroup(bills: BillItem[]) {
		const paymentIds = Array.from(new Set(bills.map(b => b.commission_payment_id).filter(id => id)));

		if (paymentIds.length === 0) {
			this.groupBillsByPayment(bills, []);
			this.is_loading = false;
			return;
		}

		const csvIds = paymentIds as any;

		this.sink = this.rest.initRest<Payment, PaymentInfo>('payment_info').search({
			csv: { id: csvIds },
			limit: 9999,
			sort_order: ['id_DESC']
		}).subscribe({
			next: (response) => {
				this.groupBillsByPayment(bills, response.data);
				this.is_loading = false;
			},
			error: (error) => {
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

	groupBillsByPayment(bills: BillItem[], payments: PaymentInfo[]) {
		const groups: Record<number, PaymentCommissions> = {};

		const paymentMap = new Map<number, PaymentInfo>();
		payments.forEach(p => paymentMap.set(p.payment.id, p));

		bills.forEach(b => {
			if (!b.commission_payment_id) return;
			if (!groups[b.commission_payment_id]) {
				groups[b.commission_payment_id] = {
					payment_id: b.commission_payment_id,
					payment: paymentMap.get(b.commission_payment_id),
					bills: [],
					total: 0,
					expanded: false,
					selected: false
				};
			}
			b.selected = false;
			groups[b.commission_payment_id].bills.push(b);
			groups[b.commission_payment_id].total += Number(b.total);
		});

		this.paymentsCommissions = Object.values(groups).sort((a, b) => b.payment_id - a.payment_id);
	}

	togglePaymentGroup(pc: PaymentCommissions) {
		pc.expanded = !pc.expanded;
	}

	togglePaymentSelection(pc: PaymentCommissions) {
		pc.bills.forEach(b => b.selected = pc.selected);
	}

	onBillSelectionChange(pc: PaymentCommissions) {
		pc.selected = pc.bills.every(b => b.selected);
	}

	toggleAll(event: any) {
		const isChecked = event.target.checked;
		this.paymentsCommissions.forEach(pc => {
			pc.selected = isChecked;
			pc.bills.forEach(b => b.selected = isChecked);
		});
	}

	debug(item: any) {
		console.log(item);
		alert(JSON.stringify(item, null, 2));
	}
}

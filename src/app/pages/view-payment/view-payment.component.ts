import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { of, forkJoin } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { PaymentInfo, MovementInfo } from '../../modules/shared/Models';
import { Payment, Bank_Movement, Bank_Movement_Order, Sat_Factura, Bank_Account, Store_Bank_Account, User, Store } from '../../modules/shared/RestModels';
import { LoadingComponent } from '../../components/loading/loading.component';

interface CTransactionType
{
	value: string;
	label: string;
}

const TRANSACTION_TYPES: CTransactionType[] = [
	{ value: 'CASH', label: 'Efectivo' },
	{ value: 'CREDIT_CARD', label: 'Tarjeta Crédito' },
	{ value: 'DEBIT_CARD', label: 'Tarjeta Débito' },
	{ value: 'CHECK', label: 'Cheque' },
	{ value: 'COUPON', label: 'Cupón' },
	{ value: 'TRANSFER', label: 'Transferencia' },
	{ value: 'DISCOUNT', label: 'Descuento' },
	{ value: 'RETURN_DISCOUNT', label: 'Descuento Devolución' },
	{ value: 'PAYPAL', label: 'PayPal' },
];

@Component({
	selector: 'app-view-payment',
	imports: [CommonModule, FormsModule, RouterModule, LoadingComponent],
	templateUrl: './view-payment.component.html',
	styleUrl: './view-payment.component.css'
})
export class ViewPaymentComponent extends BaseComponent implements OnInit
{
	override path = '/view-payment';
	info: PaymentInfo | null = null;
	bank_accounts: Bank_Account[] = [];
	users: User[] = [];
	store: Store | null = null;
	created_by_user: User | null = null;
	paid_by_user: User | null = null;
	cancelled_by_user: User | null = null;

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit()
	{
		this.setTitle('Pago');

		this.subs.sink = this.route.paramMap
		.pipe(
			mergeMap((params) =>
			{
				let id_str = params.get('id');
				if( !id_str )
				{
					this.router.navigate(['/']);
					return of(null);
				}

				this.is_loading = true;
				let rest = this.rest.initRestSimple<PaymentInfo>('payment_info');
				return forkJoin({
					info: rest.get(parseInt(id_str)),
					bank_accounts: this.rest.initRestSimple<Bank_Account>('bank_account').search({ limit: 999999 }),
					users: this.rest.initRestSimple<User>('user').search({ limit: 999999 }),
					store: this.rest.initRestSimple<Store>('store').get(this.rest.user?.store_id || 0),
				});
			})
		)
		.subscribe({
			next: (response) =>
			{
				if( !response || !response.info ) return;
				this.info = response.info;
				this.bank_accounts = response.bank_accounts.data;
				this.users = response.users.data;
				this.store = response.store;

				this.created_by_user = this.findUser(this.info.payment.created_by_user_id);
				this.paid_by_user = this.findUser(this.info.payment.paid_by_user_id);
				this.cancelled_by_user = this.findUser(this.info.payment.cancelled_by_user_id);

				this.is_loading = false;
			},
			error: (error) => this.showError(error)
		});
	}

	private findUser(id: number | null): User | null
	{
		if( !id ) return null;
		return this.users.find(u => u.id === id) || null;
	}

	getTransactionTypeLabel(value: string | null): string
	{
		if( !value ) return '-';
		let t = TRANSACTION_TYPES.find(x => x.value === value);
		return t ? t.label : value;
	}

	getBankAccountName(bank_account_id: number | null): string
	{
		if( !bank_account_id ) return '-';
		let ba = this.bank_accounts.find(x => x.id === bank_account_id);
		return ba ? (ba.alias || ba.name || ba.account) : '#' + bank_account_id;
	}

	getPaymentTypeLabel(): string
	{
		if( !this.info ) return '';
		return this.info.payment.type === 'income' ? 'Ingreso' : 'Gasto';
	}

	getFacturadoLabel(): string
	{
		if( !this.info ) return '';
		return this.info.payment.facturado === 'YES' ? 'Sí' : 'No';
	}

	getStatusLabel(): string
	{
		if( !this.info ) return '';
		return this.info.payment.status === 'ACTIVE' ? 'Activo' : 'Eliminado';
	}

	getMovementStatusLabel(status: string): string
	{
		return status === 'ACTIVE' ? 'Activo' : 'Eliminado';
	}

	reload()
	{
		if( !this.info ) return;

		this.is_loading = true;
		let rest = this.rest.initRestSimple<PaymentInfo>('payment_info');
		this.subs.sink = rest.get(this.info.payment.id)
		.subscribe({
			next: (response) =>
			{
				this.info = response;
				this.is_loading = false;
			},
			error: (error) => this.showError(error)
		});
	}

	totalAmount(): number
	{
		if( !this.info ) return 0;
		return this.info.movements.reduce((sum, m) => sum + m.bank_movement.total, 0);
	}
}

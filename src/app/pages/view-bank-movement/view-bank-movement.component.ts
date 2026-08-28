import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { of, forkJoin } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { PaymentInfo, MovementInfo, BankMovementBillInfo } from '../../modules/shared/Models';
import {
	Bank_Movement,
	Payment,
	Bank_Account,
	User,
	Order,
	Purchase,
	Bill,
	Bank_Movement_Bill,
	Bank_Movement_Order,
} from '../../modules/shared/RestModels';
import { LoadingComponent } from '../../components/loading/loading.component';

interface BankMovementBillDisplay
{
	bank_movement_bill: Bank_Movement_Bill;
	bill: Bill | null;
	purchase: Purchase | null;
}

interface BankMovementOrderDisplay
{
	bank_movement_order: Bank_Movement_Order;
	order: Order | null;
}

const TRANSACTION_LABELS: Record<string, string> = {
	CASH: 'Efectivo',
	CREDIT_CARD: 'Tarjeta de Crédito',
	DEBIT_CARD: 'Tarjeta de Débito',
	CHECK: 'Cheque',
	COUPON: 'Cupón',
	TRANSFER: 'Transferencia',
	DISCOUNT: 'Descuento',
	RETURN_DISCOUNT: 'Descuento por Devolución',
	PAYPAL: 'PayPal',
	INTERNAL_TRANSFER: 'Traspaso Interno',
};

@Component({
	selector: 'app-view-bank-movement',
	imports: [CommonModule, RouterModule, LoadingComponent],
	templateUrl: './view-bank-movement.component.html',
	styleUrl: './view-bank-movement.component.css',
})
export class ViewBankMovementComponent extends BaseComponent implements OnInit
{
	override path = '/view-bank-movement';

	bank_movement: Bank_Movement | null = null;
	payment: Payment | null = null;
	bank_account: Bank_Account | null = null;

	bm_orders_display_array: BankMovementOrderDisplay[] = [];
	bm_bills_display_array: BankMovementBillDisplay[] = [];

	received_by_user: User | null = null;
	client_user: User | null = null;
	provider_user: User | null = null;

	transaction_type_label: string = '';
	type_label: string = '';
	status_label: string = '';

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit(): void
	{
		this.setTitle('Movimiento Bancario');

		this.subs.sink = this.route.paramMap
		.pipe(
			mergeMap((params) =>
			{
				const id_str = params.get('id');
				if (!id_str)
				{
					this.router.navigate(['/']);
					return of(null);
				}

				this.is_loading = true;

				this.bank_movement = null;
				this.payment = null;
				this.bank_account = null;
				this.bm_orders_display_array = [];
				this.bm_bills_display_array = [];
				this.received_by_user = null;
				this.client_user = null;
				this.provider_user = null;

				const id = parseInt(id_str);
				const rest_bank_movement = this.rest.initRestSimple<Bank_Movement>('bank_movement');
				return rest_bank_movement.get(id).pipe(
					mergeMap((bank_movement) =>
					{
						if (!bank_movement)
						{
							return of(null);
						}

						const user_ids = [
							bank_movement.received_by_user_id,
							bank_movement.client_user_id,
							bank_movement.provider_user_id,
						].filter((value): value is number => value != null && value > 0);

						return forkJoin({
							bank_movement: of(bank_movement),
							payment_info: bank_movement.payment_id
								? this.rest.initRestSimple<PaymentInfo>('payment_info').get(bank_movement.payment_id)
								: of(null),
							bank_account: bank_movement.bank_account_id
								? this.rest.initRestSimple<Bank_Account>('bank_account').get(bank_movement.bank_account_id)
								: of(null),
							users_response: user_ids.length > 0
								? this.rest.initRestSimple<User>('user').search({ csv: { id: user_ids } as any, limit: 9999 })
								: of({ total: 0, data: [] }),
						});
					}),
					mergeMap((response) =>
					{
						if (!response || !response.bank_movement)
						{
							return of(null);
						}

						const movement = this.getMovementInfo(response.payment_info, response.bank_movement.id);

						const bank_movement_orders = movement ? movement.bank_movement_orders || [] : [];
						const order_ids = bank_movement_orders
							.map((bmo) => bmo.order_id)
							.filter((value): value is number => value != null && value > 0);

						const raw_bills: BankMovementBillInfo[] = movement ? movement.bank_movement_bills || [] : [];
						const purchase_ids = raw_bills
							.map((entry) => entry.bill?.purchase_id)
							.filter((value): value is number => value != null && value > 0);

						return forkJoin({
							response: of(response),
							movement: of(movement),
							orders_response: order_ids.length > 0
								? this.rest.initRestSimple<Order>('order').search({ csv: { id: order_ids } as any, limit: 9999 })
								: of({ total: 0, data: [] }),
							purchases_response: purchase_ids.length > 0
								? this.rest.initRestSimple<Purchase>('purchase').search({ csv: { id: purchase_ids } as any, limit: 9999 })
								: of({ total: 0, data: [] }),
						});
					})
				);
			})
		)
		.subscribe({
			next: (response) =>
			{
				if (!response || !response.response || !response.response.bank_movement)
				{
					this.is_loading = false;
					return;
				}

				const bank_movement = response.response.bank_movement;
				const orders = response.orders_response.data || [];
				const purchases = response.purchases_response.data || [];

				this.bank_movement = bank_movement;
				this.bank_account = response.response.bank_account;
				this.payment = response.response.payment_info ? response.response.payment_info.payment : null;

				this.transaction_type_label = TRANSACTION_LABELS[bank_movement.transaction_type] || bank_movement.transaction_type;
				this.type_label = bank_movement.type === 'income' ? 'Ingreso' : 'Egreso';
				this.status_label = bank_movement.status === 'ACTIVE' ? 'Activo' : 'Eliminado';

				const users = response.response.users_response.data || [];
				this.received_by_user = this.findUser(users, bank_movement.received_by_user_id);
				this.client_user = this.findUser(users, bank_movement.client_user_id);
				this.provider_user = this.findUser(users, bank_movement.provider_user_id);

				const is_income = bank_movement.type === 'income';
				const movement_bank_movement_orders = response.movement ? response.movement.bank_movement_orders || [] : [];
				const movement_bank_movement_bills: BankMovementBillInfo[] = response.movement ? response.movement.bank_movement_bills || [] : [];

				this.bm_orders_display_array = (is_income ? movement_bank_movement_orders : [])
					.map((bmo) => ({
						bank_movement_order: bmo,
						order: orders.find((o) => o.id === bmo.order_id) || null,
					}));

				this.bm_bills_display_array = (is_income ? [] : movement_bank_movement_bills)
					.map((entry: BankMovementBillInfo) => {
						const bill: Bill | null = entry.bill || null;
						const purchase: Purchase | null = bill?.purchase_id
							? purchases.find((p) => p.id === bill.purchase_id) || null
							: null;
						return {
							bank_movement_bill: entry.bank_movement_bill as Bank_Movement_Bill,
							bill,
							purchase,
						};
					});

				this.setTitle('Movimiento Bancario #' + bank_movement.id);
				this.is_loading = false;
			},
			error: (error) =>
			{
				this.showError(error);
				this.is_loading = false;
			},
		});
	}

	private getMovementInfo(payment_info: PaymentInfo | null, movement_id: number): MovementInfo | null
	{
		if (!payment_info || !payment_info.movements)
		{
			return null;
		}
		return payment_info.movements.find((m) => m.bank_movement.id === movement_id) || null;
	}

	private findUser(users_array: User[], user_id: number | null | undefined): User | null
	{
		if (user_id == null)
		{
			return null;
		}
		return users_array.find((u) => u.id === user_id) || null;
	}

	goBack(): void
	{
		window.history.back();
	}
}

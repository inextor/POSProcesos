import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Bank_Movement, Bank_Account } from '../../modules/shared/RestModels';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';
import { forkJoin, mergeMap } from 'rxjs';

type MovementWithLabel = Bank_Movement & { transaction_type_label: string; bank_account?: Bank_Account | null };

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
};

@Component({
	selector: 'app-list-bank-movement',
	imports: [CommonModule, RouterModule, FormsModule, ShortDatePipe],
	templateUrl: './list-bank-movement.component.html',
	styleUrl: './list-bank-movement.component.css'
})
export class ListBankMovementComponent extends BaseComponent implements OnInit {
	bank_account_id: number | null = null;
	movement_list: MovementWithLabel[] = [];
	bank_account_list: Bank_Account[] = [];

	editing_movement_id: number | null = null;
	editing_balance: number | null = null;
	editing_paid_date: string | null = null;

	rest_bank_movement: RestSimple<Bank_Movement> = this.rest.initRestSimple('bank_movement', ['id', 'type', 'total', 'balance', 'amount_received', 'transaction_type', 'reference', 'note', 'paid_date', 'status', 'bank_account_id', 'is_checkpoint']);
	rest_bank_account: RestSimple<Bank_Account> = this.rest.initRestSimple('bank_account', ['id', 'name', 'bank']);
	search_bank_movement: SearchObject<Bank_Movement> = this.rest_bank_movement.getEmptySearch();

	ngOnInit(): void {
		this.path = '/list-bank-movement';
		this.subs.sink = this.route.queryParamMap.pipe(
			mergeMap(queryParams => {
				this.search_bank_movement = this.rest_bank_movement.getSearchObject(queryParams);
				const bankAccountIdParam = queryParams.get('bank_account_id');
				if (bankAccountIdParam) {
					this.bank_account_id = +bankAccountIdParam;
					this.search_bank_movement.eq.bank_account_id = this.bank_account_id;
				}
				this.search_bank_movement.limit = this.page_size;
				this.current_page = this.search_bank_movement.page;
				return forkJoin({
					movements: this.rest_bank_movement.searchWithRelations(this.search_bank_movement, [this.rest_bank_account.getRelation('bank_account_id')]),
					bank_accounts: this.rest_bank_account.search({ limit: 99999 })
				});
			})
		).subscribe(response => {
			this.is_loading = false;
			this.movement_list = response.movements.data.map(m => ({
				...m.bank_movement,
				bank_account: m.bank_account,
				transaction_type_label: TRANSACTION_LABELS[m.bank_movement.transaction_type] || m.bank_movement.transaction_type,
			}));
			this.bank_account_list = response.bank_accounts.data;
			this.setPages(this.current_page, response.movements.total);
		});
	}

	loadMovements(): void {
		this.is_loading = true;
		this.subs.sink = this.rest_bank_movement.searchWithRelations(this.search_bank_movement, [this.rest_bank_account.getRelation('bank_account_id')]).subscribe(response => {
			this.is_loading = false;
			this.movement_list = response.data.map((m: any) => ({
				...m.bank_movement,
				bank_account: m.bank_account,
				transaction_type_label: TRANSACTION_LABELS[m.bank_movement.transaction_type] || m.bank_movement.transaction_type,
			}));
			this.setPages(this.current_page, response.total);
		});
	}

	startEdit(m: MovementWithLabel): void {
		this.editing_movement_id = m.id;
		this.editing_balance = m.balance;
		this.editing_paid_date = m.paid_date ? m.paid_date.substring(0, 16) : null;
	}

	cancelEdit(): void {
		this.editing_movement_id = null;
		this.editing_balance = null;
		this.editing_paid_date = null;
	}

	setCheckpoint(movement_id: number): void {
		const payload: any = { id: movement_id };
		if (this.editing_balance !== null) {
			payload.balance = this.editing_balance;
		}
		if (this.editing_paid_date) {
			payload.paid_date = this.editing_paid_date;
		}

		this.is_loading = true;
		this.subs.sink = this.rest.updatePath('set_bank_movement_checkpoint', payload).subscribe({
			next: () => {
				this.cancelEdit();
				this.loadMovements();
				this.rest.showSuccess('Saldo establecido correctamente.');
			},
			error: (err: any) => {
				this.is_loading = false;
				this.showError(err);
			}
		});
	}

}

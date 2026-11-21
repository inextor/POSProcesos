import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, mergeMap } from 'rxjs';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Bank_Account, Store, User, Withdrawal } from '../../modules/shared/RestModels';
import { WithdrawalInfo } from '../../modules/shared/Models';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';
import { LoadingComponent } from '../../components/loading/loading.component';
import { Utils } from '../../modules/shared/Utils';
import { ExcelUtils } from '../../classes/ExcelUtils';

interface CurrencyTotal
{
	currency_id: string;
	total: number;
	count: number;
}

interface CashierTotal
{
	user_name: string;
	totals: CurrencyTotal[];
}

@Component({
	selector: 'app-report-withdrawals',
	imports: [CommonModule, FormsModule, ShortDatePipe, LoadingComponent],
	templateUrl: './report-withdrawals.component.html',
	styleUrl: './report-withdrawals.component.css'
})
export class ReportWithdrawalsComponent extends BaseComponent implements OnInit
{
	rest_withdrawal: Rest<Withdrawal, WithdrawalInfo> = this.rest.initRest<Withdrawal, WithdrawalInfo>('withdrawal_info', ['id', 'store_id', 'created_by_user_id', 'currency_id', 'created']);
	rest_store: RestSimple<Store> = this.rest.initRestSimple<Store>('store', ['id', 'name']);
	rest_user: RestSimple<User> = this.rest.initRestSimple<User>('user', ['id', 'name', 'type', 'store_id']);
	rest_bank_account: RestSimple<Bank_Account> = this.rest.initRestSimple<Bank_Account>('bank_account', ['id', 'name', 'bank']);

	search_withdrawal: SearchObject<Withdrawal> = this.rest_withdrawal.getEmptySearch();

	store_list: Store[] = [];
	user_list: User[] = [];
	bank_account_map: Record<number, Bank_Account> = {};

	withdrawal_list: WithdrawalInfo[] = [];
	total_items_found: number = 0;

	start_date: string = '';
	end_date: string = '';
	note_filter: string = '';

	currency_totals: CurrencyTotal[] = [];
	cashier_totals: CashierTotal[] = [];

	ngOnInit(): void
	{
		this.path = '/report-withdrawals';
		this.setTitle('Reporte de Retiros');

		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map) =>
			{
				this.is_loading = true;
				this.search_withdrawal = this.rest_withdrawal.getSearchObject(param_map);

				// Por default el dia de hoy (la fecha viaja como Date para que se convierta a UTC al consultar)
				if (!this.search_withdrawal.ge['created'])
				{
					let start = new Date();
					start.setHours(0, 0, 0, 0);
					this.search_withdrawal.ge['created'] = start;
				}

				if (!this.search_withdrawal.le['created'])
				{
					let end = new Date();
					end.setHours(23, 59, 59, 0);
					this.search_withdrawal.le['created'] = end;
				}

				this.start_date = this.toDateTimeLocal(this.search_withdrawal.ge['created']);
				this.end_date = this.toDateTimeLocal(this.search_withdrawal.le['created']);
				this.note_filter = (this.search_withdrawal.lk['note'] as string) || '';

				this.search_withdrawal.limit = 999999;
				this.search_withdrawal.sort_order = ['created_DESC'];

				return forkJoin
				({
					withdrawals: this.rest_withdrawal.search(this.search_withdrawal),
					stores: this.rest_store.search({ limit: 99999, eq: { status: 'ACTIVE' } as any }),
					users: this.rest_user.search({ limit: 99999, eq: { type: 'USER' } as any }),
					bank_accounts: this.rest_bank_account.search({ limit: 99999 })
				});
			})
		)
		.subscribe
		({
			next: (response) =>
			{
				this.withdrawal_list = response.withdrawals.data;
				this.total_items_found = response.withdrawals.total;
				this.store_list = response.stores.data;
				this.user_list = response.users.data;
				this.bank_account_map = {};
				response.bank_accounts.data.forEach((b: Bank_Account) => this.bank_account_map[b.id as number] = b);
				this.calculateTotals();
				this.is_loading = false;
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	toDateTimeLocal(value: Date | string | null | undefined): string
	{
		if (!value) return '';
		if (value instanceof Date) return Utils.getLocalMysqlStringFromDate(value).substring(0, 16).replace(' ', 'T');
		return ('' + value).replace(' ', 'T').substring(0, 16);
	}

	getCurrency(info: WithdrawalInfo): string
	{
		return info.withdrawal.currency_id || info.withdrawal.currency || 'MXN';
	}

	getDestinationName(info: WithdrawalInfo): string
	{
		let account = info.transfer ? this.bank_account_map[info.transfer.dest_bank_account_id] : null;
		return account ? account.name : '';
	}

	onNoteChange(value: string): void
	{
		this.note_filter = value;
		(this.search_withdrawal.lk as any)['note'] = value === '' ? null : value;
	}

	performSearch(): void
	{
		this.search(this.search_withdrawal);
	}

	private addTo(list: CurrencyTotal[], currency_id: string, amount: number): void
	{
		let row = list.find(i => i.currency_id === currency_id);

		if (!row)
		{
			row = { currency_id, total: 0, count: 0 };
			list.push(row);
		}

		row.total += amount;
		row.count++;
	}

	calculateTotals(): void
	{
		let by_currency: CurrencyTotal[] = [];
		let by_cashier: Record<string, CashierTotal> = {};

		for (let info of this.withdrawal_list)
		{
			let amount = Number(info.withdrawal.amount) || 0;
			let currency_id = this.getCurrency(info);
			this.addTo(by_currency, currency_id, amount);

			let name = info.created_by_user?.name || ('Usuario #' + info.withdrawal.created_by_user_id);

			if (!by_cashier[name])
			{
				by_cashier[name] = { user_name: name, totals: [] };
			}

			this.addTo(by_cashier[name].totals, currency_id, amount);
		}

		this.currency_totals = by_currency.sort((a, b) => a.currency_id.localeCompare(b.currency_id));
		this.cashier_totals = Object.values(by_cashier).sort((a, b) => a.user_name.localeCompare(b.user_name));
	}

	exportExcel(): void
	{
		const headers = ['ID', 'Fecha', 'Sucursal', 'Usuario', 'Nota', 'Monto', 'Moneda', 'Traspaso a'];

		const rows = this.withdrawal_list.map((info) => ({
			'ID': info.withdrawal.id,
			'Fecha': Utils.getLocalMysqlStringFromDate(info.withdrawal.created),
			'Sucursal': info.store?.name || '',
			'Usuario': info.created_by_user?.name || '',
			'Nota': info.withdrawal.note || '',
			'Monto': Number(info.withdrawal.amount) || 0,
			'Moneda': this.getCurrency(info),
			'Traspaso a': this.getDestinationName(info)
		}));

		ExcelUtils.array2xlsx(rows, 'retiros.xlsx', headers);
	}

	// El ticket (navegador / USB) se imprime desde el POS, donde esta la configuracion de impresora.
	getPrintUrl(info: WithdrawalInfo): string
	{
		return `${this.rest.getExternalAppUrl()}/#/print-withdrawal/${info.withdrawal.id}`;
	}
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple } from '../../modules/shared/services/Rest';
import { Bank_Account, Bank_Movement } from '../../modules/shared/RestModels';

interface BankAccountBalance {
	bank_account: Bank_Account;
	balance: number | null;
}

@Component({
  selector: 'app-reports-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './reports-dashboard.component.html',
  styleUrl: './reports-dashboard.component.css'
})
export class ReportsDashboardComponent extends BaseComponent {
	external_base_url: string = this.rest.getExternalAppUrl();
	bank_accounts_with_balance: BankAccountBalance[] = [];

	private rest_bank_account = this.rest.initRestSimple<Bank_Account>('bank_account');
	private rest_bank_movement = this.rest.initRestSimple<Bank_Movement>('bank_movement', ['id', 'balance', 'bank_account_id']);

	ngOnInit() {
		this.setTitle('Reportes');
		this.loadBankAccounts();
	}

	loadBankAccounts() {
		this.is_loading = true;
		this.sink = this.rest_bank_account.search({ limit: 9999 }).pipe(
			mergeMap(response => {
				const accounts = response.data;
				if (accounts.length === 0) {
					this.is_loading = false;
					return of([]);
				}
				const balanceQueries = accounts.map(ba =>
					this.rest_bank_movement.search({
						eq: { bank_account_id: ba.id } as any,
						sort_order: ['id_DESC'],
						limit: 1
					})
				);
				return forkJoin([of(accounts), forkJoin(balanceQueries)]);
			})
		).subscribe(([accounts, balanceResponses]) => {
			this.is_loading = false;
			this.bank_accounts_with_balance = accounts.map((ba: Bank_Account, i: number) => ({
				bank_account: ba,
				balance: balanceResponses[i].data.length > 0 ? balanceResponses[i].data[0].balance : null
			}));
		});
	}
}

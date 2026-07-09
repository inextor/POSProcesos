import { Component, OnInit } from '@angular/core';
import { Store, Bank_Account, Store_Bank_Account } from '../../modules/shared/RestModels';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { FormsModule } from '@angular/forms';
import { RestSimple } from '../../modules/shared/services/Rest';
import { forkJoin } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';

@Component({
	selector: 'app-save-store-bank-account',
	imports: [FormsModule],
	templateUrl: './save-store-bank-account.component.html',
	styleUrl: './save-store-bank-account.component.css',
	standalone: true,
})
export class SaveStoreBankAccountComponent extends BaseComponent implements OnInit {

	rest_store_bank_account: RestSimple<Store_Bank_Account> = this.rest.initRestSimple<Store_Bank_Account>('store_bank_account');
	rest_store: RestSimple<Store> = this.rest.initRestSimple<Store>('store');
	rest_bank_account: RestSimple<Bank_Account> = this.rest.initRestSimple<Bank_Account>('bank_account');

	record: Partial<Store_Bank_Account> = GetEmpty.store_bank_account();
	store_list: Store[] = [];
	bank_account_list: Bank_Account[] = [];
	transaction_types: string[] = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'TRANSFER', 'DIGITAL_WALLET'];

	ngOnInit()
	{
		this.route.paramMap.subscribe(params => {
			this.is_loading = true;

			if (params.has('id')) {
				this.subs.sink = forkJoin({
					record: this.rest_store_bank_account.search({ eq: { id: parseInt(params.get('id') as string) } }),
					stores: this.rest_store.search({ limit: 9999 }),
					bank_accounts: this.rest_bank_account.search({ limit: 9999 }),
				}).subscribe({
					next: (responses: any) => {
						this.record = responses.record.data[0];
						this.store_list = responses.stores.data;
						this.bank_account_list = responses.bank_accounts.data;
						this.is_loading = false;
					},
					error: (error: any) => this.showError(error)
				});
			} else {
				this.subs.sink = forkJoin({
					stores: this.rest_store.search({ limit: 9999 }),
					bank_accounts: this.rest_bank_account.search({ limit: 9999 }),
				}).subscribe({
					next: (responses: any) => {
						this.store_list = responses.stores.data;
						this.bank_account_list = responses.bank_accounts.data;
						this.is_loading = false;
					},
					error: (error: any) => this.showError(error)
				});
			}
		});
	}

	save()
	{
		this.is_loading = true;

		if (this.record.id) {
			this.subs.sink = this.rest_store_bank_account.update(this.record).subscribe({
				next: () => {
					this.is_loading = false;
					this.showSuccess('Se actualizó exitosamente');
					this.location.back();
				},
				error: (error: any) => this.showError(error)
			});
		} else {
			this.subs.sink = this.rest_store_bank_account.create(this.record).subscribe({
				next: () => {
					this.is_loading = false;
					this.showSuccess('Se guardó exitosamente');
					this.location.back();
				},
				error: (error: any) => this.showError(error)
			});
		}
	}
}

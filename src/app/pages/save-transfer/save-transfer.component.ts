import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple } from '../../modules/shared/services/Rest';
import { Bank_Account } from '../../modules/shared/RestModels';
import { forkJoin, mergeMap, of } from 'rxjs';
import { LoadingComponent } from '../../components/loading/loading.component';

@Component({
	selector: 'app-save-transfer',
	imports: [FormsModule, CommonModule, LoadingComponent],
	templateUrl: './save-transfer.component.html',
	styleUrl: './save-transfer.component.css'
})
export class SaveTransferComponent extends BaseComponent implements OnInit {
	source_bank_account_id: number | null = null;
	dest_bank_account_id: number | null = null;
	amount: number | null = null;
	note: string = '';
	paid_date: string = '';

	bank_account_list: Bank_Account[] = [];
	dest_accounts: Bank_Account[] = [];

	private rest_bank_account = this.rest.initRestSimple<Bank_Account>('bank_account');

	ngOnInit() {
		this.is_loading = true;
		this.sink = this.route.queryParamMap.pipe(
			mergeMap(params => {
				this.source_bank_account_id = params.has('bank_account_id') ? +params.get('bank_account_id')! : null;
				return this.rest_bank_account.search({ limit: 9999 });
			})
		).subscribe(response => {
			this.is_loading = false;
			this.bank_account_list = response.data;
			this.filterDestAccounts();
		});
	}

	filterDestAccounts() {
		this.dest_accounts = this.bank_account_list.filter(ba => ba.id !== this.source_bank_account_id);
	}

	onSourceChange() {
		this.dest_bank_account_id = null;
		this.filterDestAccounts();
	}

	save($event: Event) {
		$event.preventDefault();
		if (!this.source_bank_account_id || !this.dest_bank_account_id || !this.amount || this.amount <= 0) {
			return;
		}

		this.is_loading = true;
		const payload: any = {
			source_bank_account_id: this.source_bank_account_id,
			dest_bank_account_id: this.dest_bank_account_id,
			amount: this.amount,
			note: this.note || null,
		};

		if (this.paid_date) {
			payload.paid_date = this.paid_date.replace('T', ' ') + ':00';
		}

		this.sink = this.rest.httpPost('transfer_info.php', payload).subscribe({
			next: () => {
				this.is_loading = false;
				this.location.back();
			},
			error: (error: any) => {
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}
}

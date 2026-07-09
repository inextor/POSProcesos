import { Component, OnInit } from '@angular/core';

import { RestSimple } from '../../modules/shared/services/Rest';
import { Bank_Account } from '../../modules/shared/RestModels';
import { BaseComponent } from './../../modules/shared/base/base.component';
import { mergeMap, of } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from "../../components/loading/loading.component";
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-save-bank-account',
	imports: [LoadingComponent, FormsModule, CommonModule],
	templateUrl: './save-bank-account.component.html',
	styleUrl: './save-bank-account.component.css'
})
export class SaveBankAccountComponent extends BaseComponent implements OnInit
{
	bank_account: Bank_Account = GetEmpty.bank_account();
	rest_bank_account: RestSimple<Bank_Account> = this.rest.initRestSimple('bank_account', ['id', 'name', 'bank', 'account', 'alias', 'currency', 'is_a_payment_method', 'email', 'bank_rfc', 'user_id']);

	ngOnInit()
	{
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map) =>
			{
				if (param_map.has('id'))
				{
					return this.rest_bank_account.get(param_map.get('id'));
				}

				return of(GetEmpty.bank_account());
			})
		)
		.subscribe
		({
			next: (response: Bank_Account) =>
			{
				this.is_loading = false;
				this.bank_account = response;
			},
			error: (error: any) =>
			{
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}

	save($event: Event)
	{
		this.bank_account.is_a_payment_method = 'NO';

		let on_response =
		{
			next: (response: Bank_Account) =>
			{
				this.is_loading = false;
				this.location.back();
			},
			error: (error: any) =>
			{
				this.is_loading = false;
				this.rest.showError(error);
			}
		}

		this.subs.sink = this.bank_account.id
			? this.rest_bank_account.update(this.bank_account).subscribe(on_response)
			: this.rest_bank_account.create(this.bank_account).subscribe(on_response);
	}
}

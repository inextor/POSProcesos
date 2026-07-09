import { Component, OnInit } from '@angular/core';

import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Bank_Account } from '../../modules/shared/RestModels';
import { mergeMap } from 'rxjs';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-list-bank-account',
	imports: [RouterModule, CommonModule],
	templateUrl: './list-bank-account.component.html',
	styleUrl: './list-bank-account.component.css'
})
export class ListBankAccountComponent extends BaseComponent implements OnInit {
	rest_bank_account: RestSimple<Bank_Account> = this.rest.initRestSimple('bank_account', ['id', 'name', 'bank', 'account', 'alias', 'currency', 'is_a_payment_method']);
	search_bank_account: SearchObject<Bank_Account> = this.rest_bank_account.getEmptySearch();
	bank_account_list: Bank_Account[] = [];

	ngOnInit()
	{
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((paramMap) =>
			{
				this.search_bank_account = this.rest_bank_account.getSearchObject(paramMap);
				this.search_bank_account.limit = this.page_size;
				this.current_page = this.search_bank_account.page;
				return this.rest_bank_account.search(this.search_bank_account);
			})
		).subscribe((response) => {
				this.is_loading = false;
				this.bank_account_list = response.data;
				this.setPages(this.current_page, response.total);
			});
	}
}

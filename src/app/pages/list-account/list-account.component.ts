import { Component, OnInit } from '@angular/core';

import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Account } from '../../modules/shared/RestModels';
import { mergeMap } from 'rxjs';
import { RouterModule } from '@angular/router';
import { ShortDatePipe } from "../../modules/shared/pipes/short-date.pipe";
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-list-account',
    imports: [RouterModule, ShortDatePipe, CommonModule],
    templateUrl: './list-account.component.html',
    styleUrl: './list-account.component.css'
})
export class ListAccountComponent extends BaseComponent implements OnInit {
	rest_account: RestSimple<Account> = this.rest.initRestSimple('account', ['id', 'currency_id', 'balance', 'status', 'created', 'updated']);
	search_account: SearchObject<Account> = this.rest_account.getEmptySearch();
	account_list: Account[] = [];

	ngOnInit()
	{
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((paramMap) =>
			{
				this.search_account = this.rest_account.getSearchObject(paramMap);
				this.search_account.limit = this.page_size;
				this.current_page = this.search_account.page;
				return this.rest_account.search(this.search_account);
			})
		).subscribe((response) => {
				this.is_loading = false;
				this.account_list = response.data;
				this.setPages(this.current_page, response.total);
			});
	}
}

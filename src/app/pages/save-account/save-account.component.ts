import { Component, OnInit } from '@angular/core';

import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Account } from '../../modules/shared/RestModels';
import { BaseComponent } from './../../modules/shared/base/base.component';
import { mergeMap, of} from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from "../../components/loading/loading.component";
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-save-account',
    imports: [LoadingComponent, FormsModule, CommonModule],
    templateUrl: './save-account.component.html',
    styleUrl: './save-account.component.css'
})
export class SaveAccountComponent extends BaseComponent implements OnInit
{

	account:Account = GetEmpty.account();
	rest_account: RestSimple<Account> = this.rest.initRestSimple('account',['id','currency_id','balance','status','created','updated']);

	ngOnInit()
	{
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map)=>
			{
				if( param_map.has('id') )
				{
					return this.rest_account.get(param_map.get('id'));
				}

				return of(GetEmpty.account());
			})
		)
		.subscribe
		({
			next: (response:Account) =>
			{
				this.is_loading = false;
				this.account = response;
			},
			error: (error:any) =>
			{
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}

	save($event: Event)
	{

		let on_response =
		{
			next: (response:Account) =>
			{
				this.is_loading = false;
				this.location.back();
			},
			error: (error:any) =>
			{
				this.is_loading = false;
				this.rest.showError(error);
			}
		}

		this.subs.sink = this.account.id
			? this.rest_account.update(this.account).subscribe( on_response )
			: this.rest_account.create(this.account).subscribe( on_response );

	}
}

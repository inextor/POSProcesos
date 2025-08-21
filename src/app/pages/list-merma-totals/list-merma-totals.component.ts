import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Item, Merma, Store } from '../../modules/shared/RestModels';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest'
import { Utils } from '../../modules/shared/Utils';
import { mergeMap } from 'rxjs/operators';
import { ParamMap } from '@angular/router';
import { forkJoin, of } from 'rxjs';

interface CMermaInfo extends Merma 
{
	item: Item;
	store: Store | null;
	total_qty: number;
	total_price: number;
}

@Component({
	selector: 'app-list-merma-totals',
	templateUrl: './list-merma-totals.component.html',
	styleUrl: './list-merma-totals.component.css',
	imports: [CommonModule, FormsModule],
})
export class ListMermaTotalsComponent extends BaseComponent
{
	rest_store:RestSimple<Store> = this.rest.initRest('store',['id','name','created','updated']);
	merma_search: SearchObject<any> = this.getEmptySearch();
	merma_list: CMermaInfo[] = [];
	current_sort_field: 'total_qty' | 'total_price' | null = null;
	sort_direction: 'asc' | 'desc' = 'asc';
	store_list: Store[] = [];
	start_date: string = '';
	end_date: string = '';
	total_amount: number = 0;
	external_base_url: string = this.rest.getExternalAppUrl();

	ngOnInit(): void 
	{
		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map: ParamMap) =>
			{
				this.setTitle('Merma Totals');
				this.path = '/list-merma-totals';
				this.is_loading = true;
				let fields = ['initial_date', 'final_date'];
				this.merma_search = this.getSearch(param_map, ['store_id'], fields);

				let start: Date;
				let end: Date;

				if (this.merma_search.search_extra['initial_date'])
				{
					start = new Date(this.merma_search.search_extra['initial_date'] as string);
				}
				else
				{
					start = new Date();
					start.setHours(0, 0, 0, 0);
				}

				this.merma_search.search_extra['initial_date'] = start;

				if (this.merma_search.search_extra['final_date'])
				{
					end = new Date(this.merma_search.search_extra['final_date'] as string);
				}
				else
				{
					end = new Date();
					end.setHours(23, 59, 59);
				}

				this.merma_search.search_extra['final_date'] = end;

				this.start_date = Utils.getLocalMysqlStringFromDate(start);
				this.end_date = Utils.getLocalMysqlStringFromDate(end);

				let store_search = this.rest_store.search({limit:999999, eq:{status:'ACTIVE'}});
				let merma_search = this.rest.getReportByPath('getMermasTotals',
				{
					initial_date: this.merma_search.search_extra['initial_date'],
					final_date: this.merma_search.search_extra['final_date'],
					store_id: this.merma_search.eq['store_id']
				});

				return forkJoin([store_search, merma_search]);
			}))
		.subscribe
		({
			next: (response) =>
			{
				this.store_list = response[0].data;
				this.merma_list = response[1].data;
				this.merma_list.forEach(merma => merma.store = response[1].store || null);
				this.calculateTotalAmount();
				
				this.is_loading = false;
			},
			error: (error) =>
			{
				this.showError(error);
			}
		});
	}

	performSearch()
	{
		super.search(this.merma_search);
	}

	calculateTotalAmount()
	{
		this.total_amount = this.merma_list.reduce((sum, merma) => sum + merma.total_price, 0);
	}

	navigateToMermaDetail(item_id: number, store_id: number | null)
	{
		let url = `${this.external_base_url}/#/list-merma?eq.item_id=${item_id}`;
		
		if (this.start_date)
		{
			url += `&ge.created=${this.start_date.replace('T', '%20')}`;
		}
		
		if (this.end_date)
		{
			url += `&lt.created=${this.end_date.replace('T', '%20')}`;
		}
		
		if (store_id)
		{
			url += `&eq.store_id=${store_id}`;
		}
		
		window.location.href = url;
	}

}

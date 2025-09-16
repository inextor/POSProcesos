import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParamMap } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Utils } from '../../modules/shared/Utils';
import { Cash_Count, Store, User } from '../../modules/shared/RestModels';
import { CashCountInfo } from '../../modules/shared/Models';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest'
import { BaseComponent } from '../../modules/shared/base/base.component';

@Component({
  selector: 'app-report-cash-count-totals',
  templateUrl: './report-cash-count-totals.component.html',
  styleUrls: ['./report-cash-count-totals.component.css'],
  imports: [CommonModule, FormsModule]
})
export class ReportCashCountTotalsComponent extends BaseComponent implements OnInit
{
	store_list: Store[] = [];
	rest_store:RestSimple<Store> = this.rest.initRest('store',['id','name','created','updated']);
	cash_count_search: SearchObject<any> = this.getEmptySearch();
	cash_count_list:CashCountInfo[] = [];
	start_date:string = '';
	end_date:string = '';

	ngOnInit(): void
	{
		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map:ParamMap)=>
			{
				this.setTitle('Reporte de totales de conteo de efectivo');
				this.path = '/report-cash-count-totals';
				this.is_loading = true;
				let fields = ['initial_date', 'final_date'];
				this.cash_count_search = this.getSearch(param_map, ['store_id'], fields);
				
				let start:Date;
				let end:Date;

				if (this.cash_count_search.search_extra['initial_date'])
				{
					start = new Date(this.cash_count_search.search_extra['initial_date'] as string);
				} 
				else
				{
					start = new Date();
					start.setHours(0,0,0,0);
				}
				this.cash_count_search.search_extra['initial_date'] = start;

				if (this.cash_count_search.search_extra['final_date'])
				{
					end = new Date(this.cash_count_search.search_extra['final_date'] as string);
				}
				else
				{
					end = new Date();
					end.setHours(23,59,59);
				}
				this.cash_count_search.search_extra['final_date'] = end;

				this.start_date = Utils.getLocalMysqlStringFromDate(start);
				this.end_date = Utils.getLocalMysqlStringFromDate(end);

				let store_search = this.rest_store.search({limit:999999, eq:{status:'ACTIVE'}});
				let cash_count_search = this.rest.getReportByPath('getCashCountTotals', 
				{
					initial_date: this.cash_count_search.search_extra['initial_date'],
					final_date: this.cash_count_search.search_extra['final_date'],
					store_id: this.cash_count_search.eq['store_id']
				});

				return forkJoin([store_search,cash_count_search]);
			}))
		.subscribe
		({
			next: (response)=>
			{
				this.store_list = response[0].data;
				this.cash_count_list = response[1].data;
				this.is_loading = false;
			},
			error: (error) =>
			{
				this.showError(error);
			}
		})
	}

	getTranslatedType(type: string)
	{
		if (type === 'BILL') {
			return 'Billete';
		} else if (type === 'COIN') {
			return 'Moneda';
		} else {
			return type;
		}
	}

	performSearch() {
		super.search(this.cash_count_search);
	}

}


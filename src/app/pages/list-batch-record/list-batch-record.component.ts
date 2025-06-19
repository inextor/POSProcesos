import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Batch_Record, Store } from '../../modules/shared/RestModels';
import { RestResponse, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { forkJoin, mergeMap } from 'rxjs';
import { PaginationComponent } from "../../components/pagination/pagination.component";

@Component({
	selector: 'app-list-batch-record',
	standalone: true,
	imports: [CommonModule, PaginationComponent],
	templateUrl: './list-batch-record.component.html',
	styleUrl: './list-batch-record.component.css'
})
export class ListBatchRecordComponent extends BaseComponent
{

	batch_record_list:Batch_Record[] = [];
	rest_batch_record:RestSimple<Batch_Record> = this.rest.initRestSimple<Batch_Record>('batch_record',['id','batch','item_id','store_id','created','updated']);
	rest_store:RestSimple<Store> = this.rest.initRestSimple<Store>('store',['id','name']);
	batch_record_search:SearchObject<Batch_Record> = this.rest_batch_record.getEmptySearch();
	store_list: Store[] = [];
	fecha_inicial: string = '';

	ngOnInit()
	{
		this.sink = this.getQueryParamObservable()
		.pipe
		(
			mergeMap(([_params, queries]) =>
			{
				this.batch_record_search = this.rest_batch_record.getSearchObject(queries);
				return forkJoin
				({
					batch_records: this.rest_batch_record.searchAll(this.batch_record_search),
					stores: this.rest_store.getAll()
				});
			})
		)
		.subscribe
		({
			error: (error) => this.rest.showError(error),
			next: (response) =>
			{
				this.batch_record_list = response.batch_records.data;
				this.store_list = response.stores.data;
			}
		});
	}
}

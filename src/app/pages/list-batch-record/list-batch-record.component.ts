import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Batch_Record, Store } from '../../modules/shared/RestModels';
import { BatchRecordInfo } from '../../modules/shared/Models';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { forkJoin, switchMap } from 'rxjs';
import { PaginationComponent } from '../../components/pagination/pagination.component';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';
import { LoadingComponent } from '../../components/loading/loading.component';

@Component({
	selector: 'app-list-batch-record',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterModule, PaginationComponent, ShortDatePipe, LoadingComponent],
	templateUrl: './list-batch-record.component.html',
	styleUrl: './list-batch-record.component.css'
})
export class ListBatchRecordComponent extends BaseComponent implements OnInit
{
	rest_batch_record: Rest<Batch_Record, BatchRecordInfo> = this.rest.initRest<Batch_Record, BatchRecordInfo>(
		'batch_record_info',
		['id', 'batch', 'item_id', 'store_id', 'created', 'updated', 'movement_type', 'is_current']
	);
	rest_store: RestSimple<Store> = this.rest.initRestSimple<Store>('store', ['id', 'name']);

	batch_record_search: SearchObject<Batch_Record> = this.getEmptySearch();
	batch_record_info_list: BatchRecordInfo[] = [];
	store_list: Store[] = [];

	type_dic: Record<string, string> = {
		'POSITIVE': 'Entrada',
		'NEGATIVE': 'Salida',
		'ADJUSTMENT': 'Ajuste'
	};

	ngOnInit()
	{
		this.path = '/list-batch-record';
		this.is_loading = true;

		this.sink = forkJoin({
			stores: this.rest_store.getAll()
		}).pipe(
			switchMap((initial) => {
				this.store_list = initial.stores.data;

				return this.route.queryParamMap;
			}),
			switchMap((queryParamMap) => {
				this.batch_record_search = this.getSearch<Batch_Record>(
					queryParamMap,
					['id', 'batch', 'item_id', 'store_id', 'created', 'updated', 'movement_type', 'is_current'],
					['item_name', 'batch', 'is_current']
				);

				// Set default store_id if not set and user doesn't have global permission
				if (!this.batch_record_search.eq.store_id || !this.rest.user_permission.global_add_stock) {
					this.batch_record_search.eq.store_id = this.rest.user?.store_id??undefined;
				}

				this.batch_record_search.limit = this.page_size;
				this.current_page = this.batch_record_search.page;

				return this.rest_batch_record.search(this.batch_record_search);
			})
		).subscribe({
			next: (response) => {
				this.is_loading = false;
				this.batch_record_info_list = response.data;
				this.setPages(this.current_page, response.total);
			},
			error: (error) => {
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}
}

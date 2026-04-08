import { Component, OnInit } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Storage_Type } from '../../modules/shared/RestModels';
import { mergeMap } from 'rxjs';
import { RouterModule } from '@angular/router';
import { ShortDatePipe } from "../../modules/shared/pipes/short-date.pipe";

@Component({
    selector: 'app-list-storage-type',
    imports: [RouterModule, ShortDatePipe],
    templateUrl: './list-storage-type.component.html',
    styleUrl: './list-storage-type.component.css'
})
export class ListStorageTypeComponent extends BaseComponent implements OnInit {
	rest_storage_type: RestSimple<Storage_Type> = this.rest.initRestSimple('storage_type', ['name', 'id', 'created', 'updated', 'sort_weight']);
	search_storage_type: SearchObject<Storage_Type> = this.rest_storage_type.getEmptySearch();
	storage_type_list: Storage_Type[] = [];

	ngOnInit()
	{
		this.is_loading = true;
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((paramMap) =>
			{
				this.search_storage_type = this.rest_storage_type.getSearchObject(paramMap);
				this.search_storage_type.limit = this.page_size;
				this.current_page = this.search_storage_type.page;
				return this.rest_storage_type.search(this.search_storage_type);
			})
		).subscribe({
			next: (response) => {
				this.is_loading = false;
				this.storage_type_list = response.data;
				this.setPages(this.current_page, response.total);
			},
			error: (error) => {
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}
}

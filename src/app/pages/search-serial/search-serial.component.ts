import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { debounceTime, mergeMap, of } from 'rxjs';
import { Serial } from '../../modules/shared/RestModels';
import { SerialInfo } from '../../modules/shared/Models';
import { FormsModule } from '@angular/forms';
import { LoadingComponent } from '../../components/loading/loading.component';
import { PageStructureComponent } from "../../modules/shared/page-structure/page-structure.component";

@Component({
    selector: 'app-search-serial',
    templateUrl: './search-serial.component.html',
    styleUrl: './search-serial.component.css',
    imports: [CommonModule, FormsModule, LoadingComponent, PageStructureComponent]
})
export class SearchSerialComponent extends BaseComponent
{

	rest_serial = this.rest.initRest<Serial,SerialInfo>('serial_info');
	serial_info_list: SerialInfo[] = [];
	serial_search = this.rest_serial.getEmptySearch();

	search_string:string = '';

	ngOnInit()
	{
		this.setTitle('Buscar Serial');
		this.path = '/search-serial';

		this.subs.sink = this.getParamsAndQueriesObservable()
		.pipe
		(
			debounceTime(500),
			mergeMap(params =>
			{
				let serial_search = this.rest_serial.getSearchObject(params.query,['serial_number']);

				let search = params.query.get('lk.serial_number');

				if( search && this.search_string.trim() != search.trim() )
				{
					this.search_string = search;
				}

				return this.rest_serial.search(serial_search);
			})
		)
		.subscribe
		({
			next:(response)=>
			{
				this.serial_info_list = response.data;
			},
			error:(error)=>
			{
				this.showError(error)
			}
		});
	}
	onSearchStringChange(search_string:string)
	{
		this.serial_search.lk['serial_number'] = search_string;
		this.search_string = search_string;
		this.search( this.serial_search );
		this.search_string = search_string;
		this.searchNoForceReload( this.serial_search );
	}
}

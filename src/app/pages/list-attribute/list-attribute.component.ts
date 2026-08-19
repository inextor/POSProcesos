import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Attribute } from '../../modules/shared/RestModels';
import { mergeMap } from 'rxjs';
import { RouterModule } from '@angular/router';
import { ShortDatePipe } from "../../modules/shared/pipes/short-date.pipe";
import { LoadingComponent } from "../../components/loading/loading.component";

@Component({
    selector: 'app-list-attribute',
    imports: [CommonModule, RouterModule, ShortDatePipe, LoadingComponent],
    templateUrl: './list-attribute.component.html',
    styleUrl: './list-attribute.component.css'
})
export class ListAttributeComponent extends BaseComponent implements OnInit {
	rest_attribute: RestSimple<Attribute> = this.rest.initRestSimple('attribute', ['name', 'id', 'created', 'updated']);
	search_attribute: SearchObject<Attribute> = this.rest_attribute.getEmptySearch();
	attribute_list: Attribute[] = [];

	ngOnInit()
	{
		this.is_loading = true;
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((paramMap) =>
			{
				this.search_attribute = this.rest_attribute.getSearchObject(paramMap);
				this.search_attribute.limit = this.page_size;
				this.current_page = this.search_attribute.page;
				return this.rest_attribute.search(this.search_attribute);
			})
		).subscribe({
			next: (response) => {
				this.is_loading = false;
				this.attribute_list = response.data;
				this.setPages(this.current_page, response.total);
			},
			error: (error) => {
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}
}

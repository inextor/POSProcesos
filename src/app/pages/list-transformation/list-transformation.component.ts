import { Component, OnInit } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest, SearchObject } from '../../modules/shared/services/Rest';
import { Transformation } from '../../modules/shared/RestModels';
import { TransformationInfo } from '../../modules/shared/Models';
import { mergeMap } from 'rxjs';
import { RouterModule } from '@angular/router';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';

@Component({
	selector: 'app-list-transformation',
	imports: [RouterModule, ShortDatePipe],
	templateUrl: './list-transformation.component.html',
	styleUrl: './list-transformation.component.css'
})
export class ListTransformationComponent extends BaseComponent implements OnInit {
	rest_transformation: Rest<Transformation, TransformationInfo> = this.rest.initRest('transformation_info', ['name', 'id', 'created', 'updated', 'status', 'provider_user_id', 'reference', 'note']);
	search_transformation: SearchObject<Transformation> = this.rest_transformation.getEmptySearch();
	transformation_info_list: TransformationInfo[] = [];

	ngOnInit() {
		this.sink = this.route.paramMap.pipe(
			mergeMap((paramMap) => {
				this.search_transformation = this.rest_transformation.getSearchObject(paramMap);
				this.search_transformation.limit = this.page_size;
				this.search_transformation.eq.status = 'ACTIVE';
				this.current_page = this.search_transformation.page;
				return this.rest_transformation.search(this.search_transformation);
			})
		).subscribe({
			next: (response) => {
				this.is_loading = false;
				this.transformation_info_list = response.data;
				this.setPages(this.current_page, response.total);
			},
			error: (error) => {
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}
}

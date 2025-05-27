import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Production_Role } from '../../modules/shared/RestModels';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, mergeMap} from 'rxjs';

@Component({
	selector: 'app-save-production-role',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './save-production-role.component.html',
	styleUrl: './save-production-role.component.css'
})
export class SaveProductionRoleComponent extends BaseComponent implements OnInit
{
	rest_production_role: RestSimple<Production_Role> = this.rest.initRestSimple('production_role',['name','id','created','updated']);
	search_production_role:SearchObject<Production_Role> = this.rest_production_role.getEmptySearch();
    production_role_list: Production_Role[] = [];

	ngOnInit()
	{
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((paramMap)=>
			{
				this.search_production_role = this.rest_production_role.getSearchObject(paramMap);
				this.search_production_role.limit = this.page_size;
				this.current_page = this.search_production_role.page;

				return this.rest_production_role.search(this.search_production_role);
			})
		)
		.subscribe((response)=>
		{
			this.is_loading = false;
			this.production_role_list = response.data;
			this.setPages(this.current_page,response.total);
		});
	}
}

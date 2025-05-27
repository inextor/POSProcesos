import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Role, Production_Role_Price } from '../../modules/shared/RestModels';
import { BaseComponent } from './../../modules/shared/base/base.component';
import { forkJoin, mergeMap, of} from 'rxjs';

@Component({
	selector: 'app-save-role',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './save-role.component.html',
	styleUrl: './save-role.component.css'
})
export class SaveRoleComponent extends BaseComponent implements OnInit
{
	rest_role: RestSimple<Role> = this.rest.initRestSimple('role',['name','id','created','updated']);
	search_role:SearchObject<Role> = this.rest_role.getEmptySearch(); // This is for listing roles, not saving a production role price
    role_list: Role[] = [];

	ngOnInit()
	{
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map)=>
			{
				this.search_role = this.rest_role.getSearchObject(param_map);
				this.search_role.limit = this.page_size;
				this.current_page = this.search_production_role.page;

				return this.rest_production_role.search(this.search_production_role);
			})
		)
		.subscribe((response)=>
		{
			this.is_loading = false;
			this.role_list = response.data;
			this.setPages(this.current_page,response.total);
		});
	}
}

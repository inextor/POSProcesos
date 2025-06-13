import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Role } from '../../modules/shared/RestModels';
import { BaseComponent } from './../../modules/shared/base/base.component';
import { forkJoin, mergeMap, of} from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from "../../components/loading/loading.component";
import { FormsModule } from '@angular/forms';

@Component({
	selector: 'app-save-role',
	standalone: true,
	imports: [CommonModule, LoadingComponent,FormsModule],
	templateUrl: './save-role.component.html',
	styleUrl: './save-role.component.css'
})
export class SaveRoleComponent extends BaseComponent implements OnInit
{

	role:Role = GetEmpty.role();
	rest_role: RestSimple<Role> = this.rest.initRestSimple('role',['name','id','created','updated']);
	search_role:SearchObject<Role> = this.rest_role.getEmptySearch(); // This is for listing roles, not saving a production role price

	ngOnInit()
	{
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map)=>
			{
				this.search_role = this.rest_role.getSearchObject(param_map);
				this.search_role.limit = this.page_size;
				this.current_page = this.search_role.page;

				if( param_map.has('id') )
				{
					return this.rest_role.get(param_map.get('id'));
				}

				return of(GetEmpty.role());
			})
		)
		.subscribe
		({
			next: (response:Role) =>
			{
				this.is_loading = false;
				this.role = response;
			},
			error: (error:any) =>
			{
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}

	save($event: Event)
	{

		let on_response =
		{
			next: (response:Role) =>
			{
				this.is_loading = false;
				this.location.back();
			},
			error: (error:any) =>
			{
				this.is_loading = false;
				this.rest.showError(error);
			}
		}

		this.subs.sink = this.role.id
			? this.rest_role.update(this.role).subscribe( on_response )
			: this.rest_role.create(this.role).subscribe( on_response );

	}
}

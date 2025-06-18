import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Role } from '../../modules/shared/RestModels';
import { mergeMap } from 'rxjs';
import { RouterModule } from '@angular/router';
import { ShortDatePipe } from "../../modules/shared/pipes/short-date.pipe";

@Component({
    selector: 'app-list-role',
    imports: [CommonModule, RouterModule, ShortDatePipe],
    templateUrl: './list-role.component.html',
    styleUrl: './list-role.component.css'
})
export class ListRoleComponent extends BaseComponent implements OnInit {
	rest_role: RestSimple<Role> = this.rest.initRestSimple('role', ['name', 'id', 'created', 'updated']);
	search_role: SearchObject<Role> = this.rest_role.getEmptySearch();
	role_list: Role[] = [];

	ngOnInit()
	{
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((paramMap) =>
			{
				this.search_role = this.rest_role.getSearchObject(paramMap);
				this.search_role.limit = this.page_size;
				this.current_page = this.search_role.page;
				return this.rest_role.search(this.search_role);
			})
		).subscribe((response) => {
				this.is_loading = false;
				this.role_list = response.data;
				this.setPages(this.current_page, response.total);
			});
	}
}

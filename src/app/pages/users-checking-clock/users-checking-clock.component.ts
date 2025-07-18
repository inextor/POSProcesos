import { Component, OnInit } from '@angular/core';

import { User,Check_In } from '../../modules/shared/RestModels';
import { mergeMap, of, forkJoin } from 'rxjs';
import { RestResponse } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { FormsModule } from '@angular/forms';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';
import { RouterModule } from '@angular/router';

export interface UserCheckInfo
{
	user:User;
	current_check_in:Check_In | null;
	ordinary_hours: number;
	extra_hours: number;
	permission_hours: number;
}

@Component({
    selector: 'app-users-checking-clock',
    imports: [FormsModule, ShortDatePipe, RouterModule],
    templateUrl: './users-checking-clock.component.html',
    styleUrl: './users-checking-clock.component.css'
})
export class UsersCheckingClockComponent extends BaseComponent implements OnInit
{
	user_checkin_info_list:UserCheckInfo[] = [];
	rest_user = this.rest.initRestSimple<User>('user',['id','username','name','email','type']);
	rest_check_in = this.rest.initRestSimple<Check_In>('check_in',['id','current']);
	current_date = new Date();

	ngOnInit()
	{
		//this.subs.sync =
		this.subs.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map)=>
			{
				this.is_loading = true;
				let search_obj = this.rest_user.getSearchObject(param_map);
				search_obj.eq.type = 'USER';
				search_obj.eq.production_area_id = this.rest.user?.production_area_id;

				return this.rest_user.search(search_obj);
			}),
			mergeMap((response:RestResponse<User>)=>
			{
				if( !response.data.length )
				{
					return forkJoin
					({
						users: of(response),
						check_ins: of({total:0, data:[]} as RestResponse<Check_In>)
					});
				}

				let ids = response.data.map((i:User)=>i.id);
				let search_object = this.rest_check_in.getEmptySearch();

				search_object.csv['user_id'] = ids;
				search_object.eq.current = 1;

				return forkJoin
				({
					users: of( response),
					check_ins: this.rest_check_in.search( search_object )
				});
			}),
			mergeMap((response)=>
			{
				let result:UserCheckInfo[] = [];

				for(let user of response.users.data)
				{
					let current_check_in = response. check_ins. data. find(checkin=>user.id == checkin.user_id ) || null;
					result.push({ user, current_check_in, ordinary_hours: 0, extra_hours: 0, permission_hours: 0});
				}

				return of(result)
			})
		)
		.subscribe((response)=>
		{
			this.user_checkin_info_list = response;
			this.is_loading = false;
		})
	}

	checkInOut(ucil: UserCheckInfo)
	{
		let user_id = ucil.user.id;

		this.subs.sink = this.rest_check_in.create({ user_id })
		.subscribe(
		{
			next:(response)=>
			{
				ucil.current_check_in = response;
				if( response.end_timestamp == null )
				{
					ucil.current_check_in = response;
				}
				else
				{
					ucil.current_check_in = null;
				}
			},
			error:(error:any )=>
			{
				this.showError( error )
			}
		})
	}
}

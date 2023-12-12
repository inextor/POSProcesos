import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User,Check_In } from '../../modules/shared/RestModels';
import { mergeMap, of, forkJoin } from 'rxjs';
import { RestResponse } from '../../modules/shared/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';

export interface UserCheckInfo
{
	user:User;
	current_check_in:Check_In | null;
}

@Component({
	selector: 'app-users-checking-clock',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './users-checking-clock.component.html',
	styleUrl: './users-checking-clock.component.css'
})
export class UsersCheckingClockComponent extends BaseComponent implements OnInit
{
	user_checkin_info_list:UserCheckInfo[] = [];
	rest_user = this.rest.initRestSimple<User>('user',['id','username','name','email','type']);
	rest_check_in = this.rest.initRestSimple<Check_In>('check_in',['id','current']);

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
					result.push({ user, current_check_in });
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
		.subscribe((response)=>
		{
			ucil.current_check_in = response;
			if( response.timestamp_end == null )
			{
				ucil.current_check_in = response;
			}
			else
			{
				ucil.current_check_in = null;
			}
		},(error)=> this.showError( error ))
	}
}

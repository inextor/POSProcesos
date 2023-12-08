import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestService } from '../../modules/shared/services/rest.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin, mergeMap, of } from 'rxjs';
import { Check_In, User } from '../../modules/shared/RestModels';
import { Rest, RestResponse, RestSimple } from '../../modules/shared/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';

interface CUser
{
	user:User;
	check_ins:Check_In[];
	total_seconds:number;
	worked_hours:number;
	worked_seconds:number;
	worked_minutes:number;
}


const ci_fields = ['user_id','timestamp_start','timestamp_end'];


@Component({
	selector: 'app-list-user-attendance',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './list-user-attendance.component.html',
	styleUrl: './list-user-attendance.component.css'
})
export class ListUserAttendanceComponent extends BaseComponent
{
	rest_user: Rest<User,User> = this.rest.initRestSimple<User>('user');
	rest_check_in: RestSimple<Check_In> = this.rest.initRestSimple('check_in',ci_fields);
	check_in_search = this.rest_check_in.getEmptySearch();
	start:Date = new Date();
	end:Date | null = new Date();

	//public initRestSimple<T>(path: string, fields:string[]|undefined = undefined, extra_keys:string[]|undefined = undefined)
	cuser_list:CUser[] = [];

	ngOnInit()
	{
		let d = new Date();
		d.setDate( d.getDate() - 1 );
		d.setHours( 0,0,0,0);

		this.start.setTime( d.getTime() );

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
				if( response.data.length )
				{
					return forkJoin
					({
						users: of(response),
						check_ins: of({total:0, data:[]} as RestResponse<Check_In>)
					});
				}

				let ids = response.data.map((i:User)=>i.id);
				let search_object = this.rest_check_in.getEmptySearch();

				let start = new Date();
				start.setDate(start.getDate() -1 );

				search_object.csv['user_id'] = ids;
				search_object.eq.current = 1;

				search_object.ge.timestamp_start = this.start;
				search_object.le.timestamp_end = this.end;

				return forkJoin
				({
					users: of( response),
					check_ins: this.rest_check_in.search( search_object )
				});
			}),
			mergeMap((response)=>
			{
				let result:CUser[] = [];

				for(let user of response.users.data)
				{
					result.push
					({
						user,
						check_ins: response.check_ins.data.filter(ci=>ci.user_id == user.id ),
						total_seconds:0,
						worked_hours: 0,
						worked_seconds:0,
						worked_minutes:0,
					});
					//current_check_in: response.check_ins.data.find(checkin=>i.id == checkin.user_id ) || null
				}

				return of(result)
			})
		)
		.subscribe((response)=>
		{
		})
	}
}

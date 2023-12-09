import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestService } from '../../modules/shared/services/rest.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin, mergeMap, of } from 'rxjs';
import { Check_In, User } from '../../modules/shared/RestModels';
import { Rest, RestResponse, RestSimple } from '../../modules/shared/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';

interface CUser
{
	user:User;
	check_ins:Check_In[];
	total_seconds:number;
	seconds_by_day:number[];
	worked_hours:string[];
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
					let seconds_by_day = new Array(7);
					seconds_by_day.fill( 0 );

					let worked_hours= new Array(7);
					worked_hours.fill('');


					result.push
					({
						user,
						check_ins: response.check_ins.data.filter(ci=>ci.user_id == user.id ),
						total_seconds:0,
						seconds_by_day,
						worked_hours
					});
					//current_check_in: response.check_ins.data.find(checkin=>i.id == checkin.user_id ) || null
				}


				for(let u of result )
				{
					let total_seconds = 0;

					for(let ci of u.check_ins)
					{
						let seconds = ci.timestamp_end
							? Math.floor( (ci.timestamp_end.getTime() - ci.timestamp_start.getTime() )/1000 )
							: 0;

						total_seconds += seconds;
						u.seconds_by_day[ ci.timestamp_start.getDay() ] += seconds;
					}

					u.seconds_by_day.forEach((v,i)=>{ u.worked_hours[i] = this.getStringHours( v ) });
				}

				return of(result)
			})
		)
		.subscribe((response)=>
		{
			this.cuser_list = response;
		})
	}
	getStringHours(seconds:number)
	{
		if( seconds == 0 )
			return '-';

		const seconds_by_hour = 3600;
		let worked_hours		= Math.floor( seconds/seconds_by_hour );
		let worked_minutes	= Math.floor( seconds/60)%60;
		let worked_seconds	= seconds%60;


		return Utils.zero(worked_hours)
			+':'
			+Utils.zero( worked_minutes )
			+':'
			+Utils.zero(worked_seconds );
	}
}

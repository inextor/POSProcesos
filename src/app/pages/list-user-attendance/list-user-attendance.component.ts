import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, mergeMap, of } from 'rxjs';
import { Check_In, User, Work_Log } from '../../modules/shared/RestModels';
import { Rest, RestResponse, RestSimple } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';
import { FormsModule } from '@angular/forms';

interface CUser
{
	user:User;
	work_log:(Work_Log | null )[];
	total_hours:number;
	extra_hours:number;
	late_arrives:number;
//	check_ins:Check_In[];
//	total_seconds:number;
//	seconds_by_day:number[];
//	worked_hours:string[];
}

const ci_fields = ['user_id','start_timestamp','end_timestamp'];

@Component({
	selector: 'app-list-user-attendance',
	standalone: true,
	imports: [CommonModule,FormsModule],
	templateUrl: './list-user-attendance.component.html',
	styleUrl: './list-user-attendance.component.css'
})
export class ListUserAttendanceComponent extends BaseComponent
{
	rest_user: Rest<User,User> = this.rest.initRestSimple<User>('user');
	rest_check_in: RestSimple<Check_In> = this.rest.initRestSimple('check_in',ci_fields);
	rest_work_log: RestSimple<Work_Log> = this.rest.initRestSimple('work_log',['user_id','date']);

	check_in_search = this.rest_check_in.getEmptySearch();

	start:Date = new Date();
	end:Date | null = new Date();
	start_date:string = '';
	dates:string[] = ',,,,,,'.split(',');
	dates_yymmdd:string[] = new Array();

	//public initRestSimple<T>(path: string, fields:string[]|undefined = undefined, extra_keys:string[]|undefined = undefined)
	cuser_list:CUser[] = [];

	ngOnInit()
	{
		let d = new Date();
		let current_date = d.getDay();

		d.setDate( d.getDate() - d.getDay()	);
		d.setHours( 0,0,0,0);

		this.start.setTime( d.getTime() );

		this.subs.sink = this.route.queryParamMap.pipe
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
						work_log: of({total:0, data:[]} as RestResponse<Work_Log>)
					});
				}

				let ids = response.data.map((i:User)=>i.id);
				let search_object = this.rest_work_log.getEmptySearch();

				let start = new Date();
				start.setDate(start.getDate() -1 );
				search_object.csv['user_id'] = ids;

				this.start_date = Utils.getLocalMysqlStringFromDate( start ).substring(0,10);

				let date_name = 'Lu,Ma,Mi,Ju,Vi,Sa,Do'.split(',');

				this.dates.forEach((x,index)=>
				{
					let d = new Date();
					d.setTime( start.getTime() )
					d.setDate( d.getDate()+index );
					this.dates_yymmdd[index] = Utils.getLocalMysqlStringFromDate( d ).substring(0,10);
					this.dates[index] =date_name[ d.getDay() ]+' '+d.getDate();
				});

				//search_object.eq.current = 1;

				search_object.ge.date = this.start_date;
				search_object.le.date = this.end
					? Utils.getLocalMysqlStringFromDate( this.end ).substring(0,10 )
					: undefined;

				return forkJoin
				({
					users: of( response),
					work_log: this.rest_work_log.search( search_object )
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


					let work_logs:(Work_Log | null)[] = response.work_log.data.filter(ci=>ci.user_id == user.id );

					let total_hours = 0;
					let extra_hours = 0;
					let late_arrives = 0;

					for(let wl of work_logs)
					{
            let x  = wl as Work_Log;
						total_hours += x.hours;
						extra_hours += x.extra_hours;
						late_arrives += x.on_time == "NO" ? 1: 0;
					}

					for(let i=0;i<this.dates_yymmdd.length;i++)
					{
						if(work_logs.length <= i  || work_logs[i]?.date != this.dates_yymmdd[i] )
						{
							//let n_work_log:Work_Log = {
							//	date: this.dates_yymmdd[i],
							//	hours: 0,
							//	extra_hours: 0,
							//	on_time: 'YES',
							//	id: 0,
							//	break_seconds: 0,
							//	disciplinary_actions: null,
							//	docking_pay: 0,
							//	end_timestamp: null,
							//	in_out_count: 0,
							//	seconds_log: 0,
							//	start_timestamp: null,
							//	updated: new Date,
							//	user_id: user.id
							//};

							work_logs.splice(i,0, null );
						}
					}

					result.push
					({
						user,
						work_log: work_logs,
						total_hours:0,
						extra_hours,
						late_arrives
					});
					//current_check_in: response.check_ins.data.find(checkin=>i.id == checkin.user_id ) || null
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

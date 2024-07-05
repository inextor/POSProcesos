import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Check_In, User, Work_Log, Workshift } from '../../modules/shared/RestModels';
import { RestResponse } from '../../modules/shared/services/Rest';
import { forkJoin, mergeMap, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';
import { Utils } from '../../modules/shared/Utils';

interface UserCheckInfo
{
	selected: boolean;
	user:User;
	check_ins:Check_In[];
	work_log: Work_Log;
}

@Component({
	selector: 'app-close-shift',
	standalone: true,
	imports: [CommonModule,FormsModule, ShortDatePipe],
	templateUrl: './close-shift.component.html',
	styleUrl: './close-shift.component.css'
})
export class CloseShiftComponent extends BaseComponent implements OnInit
{
	user_checkin_info_list:UserCheckInfo[] = [];
	rest_user = this.rest.initRestSimple<User>('user',['id','username','name','email','type']);
	rest_check_in = this.rest.initRestSimple<Check_In>('check_in',['id','current']);
	rest_workshift = this.rest.initRestSimple<Workshift>('workshift',['id']);
	current_date = new Date();
	rest_work_log = this.rest.initRestSimple<Work_Log>('work_log',['id','user_id','workshift_id'],['store_id','working_area_id','workshift_id']);
	start_date:Date = this.getStartDate();
	all_checked: boolean = false;
	start_date_string = '';

	getStartDate():Date
	{
		let l = new Date();
		l.setHours(0,0,0,0);
		return l;
	}

	ngOnInit(): void
	{
		this.subs.sink = this.getQueryParamObservable()
		.pipe
		(
			mergeMap((params)=>
			{
				let param_map = params[0];

				if( param_map.has('date') )
				{
					this.start_date_string = param_map.get('date') as string;
				}
				else
				{
					this.start_date_string = Utils.getLocalMysqlStringFromDate( new Date() ).substring(0,10);
				}

				let user = this.rest.user as User;

				let search_obj = this.rest_user.getSearchObject(param_map);
				search_obj.eq.type = 'USER';
				search_obj.eq.store_id = user.store_id;
				search_obj.eq.production_area_id = user.production_area_id;

				return forkJoin
				({
					user: this.rest_user.search(search_obj ),
					date: of( this.start_date_string )
				});
			}),
			mergeMap((response)=>
			{
				let work_shift_ids = response.user.data
					.filter((user:User)=>user.workshift_id)
					.map((user)=>{ user.workshift_id })

				let workshift_obs = this.rest_workshift.search({csv:{ id: work_shift_ids }, limit: 99999 });

				if( !response.user.data.length )
				{
					return forkJoin
					({
						users: of(response.user),
						check_ins: of({total:0, data:[]} as RestResponse<Check_In>),
						workshift: workshift_obs,
						work_logs: of({total:0, data:[]} as RestResponse<Work_Log>)
					});
				}

				let ids = response.user.data.map((i:User)=>i.id);
				let search_object = this.rest_check_in.getEmptySearch();

				search_object.csv['user_id'] = ids;
				search_object.eq.current = 1;

				return forkJoin
				({
					users: of( response.user ),
					check_ins: this.rest_check_in.search( search_object ),
					workshift: workshift_obs,
					work_logs: this.rest_work_log.search
					({
						eq:{ date: response.date },
						csv:{ user_id: ids },
						limit: ids.length
					})
				});
			}),
			mergeMap((response)=>
			{
				let result:UserCheckInfo[] = [];

				for(let user of response.users.data)
				{
					let work_log:Work_Log | undefined = response.work_logs.data.find((wl)=>wl.user_id == user.id );

					let ws_funct = (ws:Workshift)=>ws.id == user.workshift_id;
					let workshift:Workshift | undefined = response.workshift.data.find( ws_funct );
					let check_ins	= response.check_ins.data.filter(checkin=>user.id == checkin.user_id );

					if( !work_log )
						work_log = this.getWorkLog( user, check_ins, workshift );

					result.push
					({
						check_ins,
						user,
						work_log,
						selected: false
					});
				}

				return of(result)
			})
		)
		.subscribe
		({
			next: (response) =>
			{
				this.user_checkin_info_list = response;
			},
			error: (error:any)=>
			{
				this.showError( error );
			}
		})
	}

	getWorkLog(user:User,check_in_list:Check_In[], workshift:Workshift | undefined):Work_Log
	{
		let min_time_func = (p:number |null,check_in:Check_In) => p == null
			? check_in.start_timestamp.getTime()
			: Math.min(p, check_in.end_timestamp.getTime());

		let max_time_func = (p:number |null,check_in:Check_In) =>
			p == null || check_in.end_timestamp== null
			? p
			: Math.max( p, check_in.end_timestamp.getTime() );


		let min_time	= check_in_list.reduce( min_time_func, null);
		let max_time	= check_in_list.reduce( max_time_func, null) || Date.now();

		let start_timestamp:Date | null = null
		let end_timestamp:Date | null = null;
		//let hours = 0;

		let seconds_log = 0;

		for(let check_in of check_in_list)
		{
			let now = Date.now();
			let max = check_in.end_timestamp?.getTime() || now;
			let min = check_in.start_timestamp?.getTime() || now;

			seconds_log += ( max - min );
		}

		if( min_time )
		{
			start_timestamp= new Date();
			start_timestamp.setTime( min_time );

		//	hours = (max_time-min_time/1000)/3600;
		}

		if( min_time && max_time )
		{
			end_timestamp = new Date();
			end_timestamp.setTime( max_time );
		}

		let total_seconds = ( min_time ) ? (max_time - min_time )/1000 : 0;
		let break_seconds = seconds_log;
		let start_date = start_timestamp || new Date();

		console.log( total_seconds/3600 )


		let total_hours = Math.round(seconds_log/36000)/100;
		let extra_hours =this.getExtraHours(start_date ,seconds_log/1000, workshift );
		let hours = Math.round( (total_hours - extra_hours)*100)/100;
		console.log('Total hours', total_hours );

		let work_log:Work_Log = {
			seconds_log,
			start_timestamp,
			id: 0,
			date:this.start_date_string,
			updated: new Date(),
			extra_hours,
			end_timestamp,
			docking_pay: 0,
			on_time: 'YES',
			total_payment: 0,
			break_seconds,
			in_out_count: check_in_list.length,
			disciplinary_actions: null,
			hours,
			user_id: user.id,
			json_values: null
		};

		return work_log;
	}

	onSave(evt: SubmitEvent)
	{
		let wlog_list = this.user_checkin_info_list
		.filter(ucil=>ucil.selected)
		.map((ucil)=>{
			ucil.work_log.date = this.start_date_string;
			return ucil.work_log;
		});


		let start_timestamp = Utils.getLocalDateFromMysqlString( this.start_date_string ) as Date;

		this.subs.sink = this.rest.update('checkOutUsers',{start_timestamp, work_logs: wlog_list }).subscribe
		({
			next:(response)=>
			{
				this.showSuccess('La informacion se guardó exitosamente');
				this.router.navigate(['/users-checking-clock']);
			},
			error:(error)=>
			{
				this.showError( error );
			}
		})
	}

	getExtraHours(date_start:Date, seconds:number, workshift:Workshift | undefined):number
	{
		let hours = seconds/3600;
		console.log('Seconds', seconds );

		let hours_props =
		[
			'sun_hours','mon_hours','tue_hours',
			'wed_hours','thu_hours','fri_hours','sat_hours'
		];

		let day_number = hours_props[ date_start.getDay() ] as keyof Workshift;
		let hours_by_day = workshift  ? workshift[ day_number ] as number : 8;
		console.log('Hours by day',workshift );

		let extra = Math.round(100*( hours > hours_by_day ? hours - hours_by_day : 0) )/1000;
		console.log('Extra', extra);
		return extra;
	}

	toggleValue(uc: UserCheckInfo,evt: MouseEvent)
	{
		let target = evt.target as HTMLInputElement;
		uc.selected = target.checked;
	}

	toggleAll(evt: MouseEvent)
	{
		let target = evt.target as HTMLInputElement;
		this.all_checked = target.checked;

		for(let uc of this.user_checkin_info_list)
		{
			uc.selected = this.all_checked;
		}
	}

	dayChange(date:string)
	{
		this.router.navigate(['/close-shift'],{ queryParams:{date}});
	}
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Payroll, User, Work_Log } from '../../modules/shared/RestModels';
import { FormsModule } from '@angular/forms';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';
import { forkJoin, mergeMap } from 'rxjs';
import { Utils } from '../../modules/shared/Utils';

interface CPayroll extends Payroll
{
	user_name:string;
}

@Component({
  selector: 'app-list-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule ,BaseComponent , RouterOutlet, RouterModule, ShortDatePipe],
  templateUrl: './list-payroll.component.html',
  styleUrl: './list-payroll.component.css'
})
export class ListPayrollComponent extends BaseComponent implements OnInit {

	rest_user:RestSimple<User> = this.rest.initRestSimple<User>('user');
	rest_work_log: RestSimple<Work_Log> = this.rest.initRestSimple<Work_Log>('work_log');
	rest_payroll:RestSimple<Payroll> = this.rest.initRestSimple<Payroll>('payroll');

	search_payroll:SearchObject<Payroll> = this.getEmptySearch();
	
	users_list:User[] = [];
	CPayroll_list:CPayroll[] = [];

	start_date:string = '';
	end_date:string = '';

	user_id:number | null = 0;

	ngOnInit()
	{
		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map)=> 
			{
				this.path = 'list-payroll';
				this.is_loading = true;
				let date = new Date();
				
				this.search_payroll.ge.start_date = param_map.get('ge.start_date') ? (param_map.get('ge.start_date') as string).split(' ')[0] : Utils.getMysqlStringFromDate(date).split(' ')[0] as string;
				this.search_payroll.le.start_date = param_map.get('le.start_date') ? (param_map.get('le.start_date') as string).split(' ')[0] : Utils.getMysqlStringFromDate(date).split(' ')[0] as string;
				this.search_payroll.eq.user_id = param_map.get('eq.user_id') ? parseInt(param_map.get('eq.user_id') as string) : undefined;
				this.search_payroll.sort_order = ['id_DESC']
				this.start_date = this.search_payroll.ge.start_date as string;
				this.end_date = this.search_payroll.le.start_date as string;
				this.user_id = this.search_payroll.eq.user_id ? this.search_payroll.eq.user_id : null;

				let user = this.rest.user as User;
				return forkJoin({
					users: this.rest_user.search({eq:{status: 'ACTIVE', store_id: user.store_id}}),
					payrolls: this.rest_payroll.search(this.search_payroll)
				});
			}),
		)
		.subscribe((responses)=> 
		{
			console.log(responses);
			this.users_list = responses.users.data;
			this.CPayroll_list = responses.payrolls.data.map((payroll)=>
			{
				let user = this.users_list.find((user)=> user.id == payroll.user_id);
				return {...payroll, user_name: user ? user.name : 'Loading...'};
			});
			
		}, (error)=> 
		{
			this.showError(error);
		});
	}

	onUserChange(user_id:number)
	{
		this.search_payroll.eq.user_id = user_id;
	}

	markAsPaid(payroll:Payroll)
	{
		this.subs.sink = this.confirmation.showConfirmAlert(payroll,'Marcar como pagado' ,'Deseas marcar esta nómina como pagada?')
		.subscribe((response)=>
		{
			if(response.accepted)
			{
				this.rest_payroll.update({...payroll, paid_status: 'PAID'})
				.subscribe({
					next: (response)=>
					{
						payroll.paid_status = 'PAID' as const;
						this.showSuccess('Nómina pagada');
					},
					error: (error)=>
					{
						this.showError('Error pagando nómina ' + error);
					}
				});
			}
		})
	}
}

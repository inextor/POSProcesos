import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin } from 'rxjs';
import { Task } from '../../modules/shared/RestModels';
import { TaskInfo } from '../../modules/shared/Models';
import { SearchObject } from '../../modules/shared/Rest';

@Component({
	selector: 'app-list-task',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './list-task.component.html',
	styleUrl: './list-task.component.css'
})
export class ListTaskComponent extends BaseComponent implements OnInit
{
	file:File | null = null;
	show_import:boolean = false;

	task_info_list:TaskInfo[] = [];


	rest_task_info = this.rest.initRest<Task,TaskInfo>('task_info');
	task_search:SearchObject<Task> = this.rest_task_info.getEmptySearch();

	ngOnInit()
	{
		this.path = '/list-task';

		this.subs.sink = this.route.queryParamMap.subscribe((queryParamMap) =>
		{
//			let fields = [ "id","process_id","description","parent_task_id","order_id","item_id","is_done","status","process_status_id","in_charge_user_id","counter","created","updated" ];
//			let extra_keys:Array<string> = []; //['search_param1','project_id','some_id'];
//			this.task_search = this.rest_task.getSearch(queryParamMap );
			this.title_service.setTitle('task');

			this.is_loading = true;
			this.subs.sink = forkJoin({
				task : this.rest_task_info.search(queryParamMap),
			})
			.subscribe((responses)=>
			{
				this.task_info_list = responses.task.data;
				//this.setPages( this.task_search.page, responses.task.total );
				this.is_loading = false;
			});
		});
	}
}

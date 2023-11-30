import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-list-task',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './list-task.component.html',
  styleUrl: './list-task.component.css'
})
export class ListTaskComponent {

export class ListTaskComponent extends BaseComponent implements OnInit {
	file:File | null = null;
	show_import:boolean = false;
	task_search:SearchObject<Task> = this.getEmptySearch();
	task_list:Task[] = [];

	
	process_list:Process[] = [];
	item_list:Item[] = [];
	user_list:User[] = [];
	order_list:Order[] = [];




	ngOnInit()
	{
		this.path = '/list-task';

		this.subs.sink = this.route.queryParamMap.subscribe((queryParamMap) =>
		{
			let fields = [ "id","process_id","description","parent_task_id","order_id","item_id","is_done","status","process_status_id","in_charge_user_id","counter","created","updated" ];
			let extra_keys:Array<string> = []; //['search_param1','project_id','some_id'];
			this.task_search = this.getSearch(queryParamMap, fields, extra_keys );
			this.titleService.setTitle('task');
			this.is_loading = true;

			
			this.is_loading = true;
			this.subs.sink = forkJoin({
				task : this.rest.task.search(this.task_search),
				process : this.rest.process.search({limit:9999}),
				item : this.rest.item.search({limit:9999}),
				user : this.rest.user.search({limit:9999}),
				order : this.rest.order.search({limit:9999})
			})
			.subscribe((responses)=>
			{
				this.task_list = responses.task.data;
				this.setPages( this.task_search.page, responses.task.total );
				this.process_list = responses.process.data;
				this.item_list = responses.item.data;
				this.user_list = responses.user.data;
				this.order_list = responses.order.data;
				this.is_loading = false;
			},(error)=>this.showError(error));
		});
	}

	/*
	onFileChanged(event)
	{
		if (event.target.files.length)
		{
			this.file = event.target.files[0];
		}
	}

	uploadFile()
	{
		this.is_loading = true;
		Utils.xlsx2json( this.file,["id","process_id","description","parent_task_id","order_id","item_id","is_done","status","process_status_id","in_charge_user_id","counter","created","updated"]).then((json)=>
		{
			//Filter json then upload
			this.subs.sink	= this.rest.task.batchUpdate(json).subscribe((result)=>
			{
				if( this.task_list.length == 0 )
				{
					this.setPages( 0, result.length );
					this.task_list = result.slice(0,this.pageSize);
				}
				this.is_loading =  false;
                this.show_import = false;
                this.showSuccess('Imported succesfully '+result.length+' items');

			},(error)=>this.showError(error));
		});
	}

	exportFile()
	{
		this.is_loading = true;
		this.subs.sink	= this.rest.task.search({limit:100000}).subscribe((response)=>
		{
			Utils.array2xlsx(response.data,'task.xlsx',["id","process_id","description","parent_task_id","order_id","item_id","is_done","status","process_status_id","in_charge_user_id","counter","created","updated"])
			this.is_loading = false;
		},(error)=>this.showError(error));
	}
	*/
}

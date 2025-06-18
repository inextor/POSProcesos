import { Component } from '@angular/core';


@Component({
    selector: 'app-save-process-status',
    imports: [],
    templateUrl: './save-process-status.component.html',
    styleUrl: './save-process-status.component.css'
})
export class SaveProcessStatusComponent {

	process_status:Partial<Process_Status>	= {};

	
	process_list:Process[] = [];


	ngOnInit()
	{
		this.route.paramMap.subscribe( params =>
		{
			//this.company = this.rest.getCompanyFromSession();

			

			
				this.is_loading = true;

				if( params.has('id') )
				{
					this.subs.sink = forkJoin({
						process_status : this.rest.process_status.get(  params.get('id')  ),
						process : this.rest.process.search({limit:9999})
					})
					.subscribe((responses)=>
					{
						this.process_status = responses.process_status;
						this.process_list = responses.process.data;

						this.is_loading = false;
					},(error)=>this.showError(error));
				}
				else
				{
					this.subs.sink = this.rest.process.search({limit:9999})
					.subscribe((response)=>
					{
						this.process_list = response.data;
						this.is_loading = false;
					},(error)=>this.showError(error));
				}
		});
	}

	save()
	{
		this.is_loading = true;

		if( this.process_status.id	)
		{
			this.subs.sink	= this.rest.process_status.update( this.process_status ).subscribe((process_status)=>{
				this.is_loading = false;
				this.showSuccess('process status se actualizo exitosamente');
				this.location.back();
			},(error)=>this.showError(error));
		}
		else
		{
			this.subs.sink	= this.rest.process_status.create( this.process_status ).subscribe((process_status)=>{
				this.is_loading = false;
				this.showSuccess('process status se guardo exitosamente');
				this.location.back();
			},(error)=>this.showError(error));
		}
	}
}

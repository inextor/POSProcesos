import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Process, Production_Area } '../../RestModels';


@Component({
  selector: 'app-save-process',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './save-process.component.html',
  styleUrl: './save-process.component.css'
})
export class SaveProcessComponent {

	process:Partial<Process>	= {};
  is_loading:boolean = false;


	production_area_list:Production_Area[] = [];


	ngOnInit()
	{
		this.route.paramMap.subscribe( params =>
		{
			//this.company = this.rest.getCompanyFromSession();




				this.is_loading = true;

				if( params.has('id') )
				{
					this.subs.sink = forkJoin({
						process : this.rest.process.get(  params.get('id')  ),
						production_area : this.rest.production_area.search({limit:9999})
					})
					.subscribe((responses)=>
					{
						this.process = responses.process;
						this.production_area_list = responses.production_area.data;

						this.is_loading = false;
					},(error)=>this.showError(error));
				}
				else
				{
					this.subs.sink = this.rest.production_area.search({limit:9999})
					.subscribe((response)=>
					{
						this.production_area_list = response.data;
						this.is_loading = false;
					},(error)=>this.showError(error));
				}
		});
	}

	save()
	{
		this.is_loading = true;

		if( this.process.id	)
		{
			this.subs.sink	= this.rest.process.update( this.process ).subscribe((process)=>{
				this.is_loading = false;
				this.showSuccess('process se actualizo exitosamente');
				this.location.back();
			},(error)=>this.showError(error));
		}
		else
		{
			this.subs.sink	= this.rest.process.create( this.process ).subscribe((process)=>{
				this.is_loading = false;
				this.showSuccess('process se guardo exitosamente');
				this.location.back();
			},(error)=>this.showError(error));
		}
	}
}

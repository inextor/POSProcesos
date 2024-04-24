import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RestService } from '../../modules/shared/services/rest.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css'
})
export class PaginationComponent implements OnInit{

	@Input() path:string = '';
	@Input() total_pages:number = 1;
	@Input() current_page:number = 0;
	@Input() pages:number[] = [];
	@Output() selectedPage = new EventEmitter<number>();

	constructor( public rest:RestService, public router:Router, public route:ActivatedRoute, public location: Location)
	{

	}

	ngOnInit() {
		
	}

	gotoPage(page:number)
	{
		if( this.path == null )
		{
			this.selectedPage.emit( page );
		}
		else
		{
			let array:string[] = [this.path];

			if( this.path.lastIndexOf('/') !== 0 )
			{
				let foo = this.path.split('/');
				foo[0] = '/'+foo[0];

				array.splice(0,1, ...foo);
			}

			console.log(array);

			let params = { page: page }
			this.router.navigate(array,{queryParams: params,  queryParamsHandling:"merge"});
		}
	}
}

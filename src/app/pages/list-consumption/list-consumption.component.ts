import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Consumption } from '../../modules/shared/RestModels';
import { Rest, RestResponse, RestSimple } from '../../modules/shared/services/Rest';

@Component({
	selector: 'app-list-consumption',
	standalone: true,
	imports: [CommonModule, DatePipe],
	templateUrl: './list-consumption.component.html',
	styleUrls: ['./list-consumption.component.css']
})
export class ListConsumptionComponent extends BaseComponent implements OnInit
{
	public consumption_list: Consumption[] = [];
	rest_consumption:RestSimple<Consumption> = this.rest.initRestSimple<Consumption>('consumption');

	ngOnInit(): void
	{
		this.is_loading = true;
		this.rest_consumption.search({}).subscribe
		({
			next: (response:RestResponse<Consumption>) =>
			{
				this.consumption_list = response.data;
				this.is_loading = false;
			},
			error: error => {
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

}

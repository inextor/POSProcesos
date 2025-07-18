import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Consumption } from '../../modules/shared/RestModels';
import { RestService } from '../../modules/shared/services/rest.service';

@Component({
	selector: 'app-list-consumption',
	standalone: true,
	imports: [CommonModule, DatePipe],
	templateUrl: './list-consumption.component.html',
	styleUrls: ['./list-consumption.component.css']
})
export class ListConsumptionComponent extends BaseComponent implements OnInit
{
	public consumptionList: Consumption[] = [];

	constructor(private rest: RestService) {
		super();
	}

	ngOnInit(): void
	{
		this.is_loading = true;
		this.rest.initRestSimple('consumption').search({}).subscribe({
			next: response => {
				this.consumptionList = response.data;
				this.is_loading = false;
			},
			error: error => {
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

}
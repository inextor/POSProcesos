import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/base/base.component';
import { mergeMap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { GetEmpty } from '../../../shared/GetEmpty';
import { ParamMap } from '@angular/router';

@Component({
	selector: 'app-assign-reservation-item-serials',
	standalone: true,
	imports: [CommonModule,FormsModule],
	templateUrl: './assign-reservation-item-serials.component.html',
	styleUrl: './assign-reservation-item-serials.component.css'
})

export class AssignReservationItemSerialsComponent extends BaseComponent implements OnInit
{
	rest_reservation_item_info = this.rest.initRest('reservation_item_info');
	reservation_item = GetEmpty.reservation_item();

	ngOnInit(): void
	{
		this.path = '/rentals/assign-reservation-item-serials';

		this.subs.sink = this.route.paramMap
		.pipe
		(
			mergeMap((param_map:ParamMap) =>
			{
				this.is_loading = true;
				this.title_service.setTitle('Asignar serie de numeración');
				return this.rest_reservation_item_info.get( param_map.get('id') );
			})
		)
		.subscribe
		({
			next:(response) =>
			{
				this.reservation_item = response.data;
			},
			error:(error) =>
			{
				this.showError(error);
			}
		});
	}

}

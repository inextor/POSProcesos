import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/base/base.component';
import { Rest } from '../../../shared/services/Rest';
import { ExtendedReservation, ReservationInfo } from '../../../shared/Models';
import { ParamMap } from '@angular/router';
import { mergeMap } from 'rxjs';
import { GetEmpty } from '../../../shared/GetEmpty';
import { ShortDatePipe } from "../../../shared/pipes/short-date.pipe";

@Component({
    selector: 'app-view-reservation',
    standalone: true,
    templateUrl: './view-reservation.component.html',
    styleUrl: './view-reservation.component.css',
    imports: [CommonModule, ShortDatePipe]
})
export class ViewReservationComponent extends BaseComponent
{

	rest_reservation_info:Rest<ExtendedReservation, ReservationInfo> = this.rest.initRest('reservation_info');
	reservation_info: ReservationInfo = GetEmpty.getEmptyReservationInfo();
	show_assign_delivery: boolean = false;

	ngOnInit(): void
	{
		this.is_loading = true;
		this.path = '/rentals/view-reservation';
		this.title_service.setTitle('Reservación');

		this.subs.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map:ParamMap) =>
			{
				if( !param_map.has('id') )
				{
					throw new Error('No se encontró la reservación');
				}
				return this.rest_reservation_info.get( param_map.get('id') );
			})
		)
		.subscribe
		({
			next: (response) =>
			{
				this.is_loading = false;
				this.reservation_info = response;
			},
			error: (error:any) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		})
	}
	onSelectDeliveryUser(evt: Event) {

	}
}

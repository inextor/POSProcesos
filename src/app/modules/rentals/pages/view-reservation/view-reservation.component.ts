import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/base/base.component';
import { Rest, RestSimple } from '../../../shared/services/Rest';
import { ExtendedReservation, ReservationInfo } from '../../../shared/Models';
import { ParamMap } from '@angular/router';
import { mergeMap } from 'rxjs';
import { GetEmpty } from '../../../shared/GetEmpty';
import { ShortDatePipe } from "../../../shared/pipes/short-date.pipe";
import { FormsModule } from '@angular/forms';
import { Reservation_Item_Serial } from '../../../shared/RestModels';
import { ModalComponent } from '../../../../components/modal/modal.component';



@Component
({
	selector: 'app-view-reservation',
	standalone: true,
	templateUrl: './view-reservation.component.html',
	styleUrl: './view-reservation.component.css',
	imports: [CommonModule, ShortDatePipe,FormsModule, ModalComponent]
})
export class ViewReservationComponent extends BaseComponent
{

	rest_reservation_info:Rest<ExtendedReservation, ReservationInfo> = this.rest.initRest('reservation_info');
	reservation_info: ReservationInfo = GetEmpty.getEmptyReservationInfo();
	show_assign_delivery: boolean = false;
	scheduled_delivery:string = '';
	scheduled_return: string = '';
	reservation_item_serials:Reservation_Item_Serial[] = [];
	show_assign_serials: boolean = false;
	search_serials: string = '';
	rest_reservation_item_serial: RestSimple<Reservation_Item_Serial> = this.rest.initRest('reservation_item_serial');

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
	onSelectDeliveryUser(evt: Event)
	{

	}

	addSerial(serial:string)
	{
		let ris:Reservation_Item_Serial =
		{
            reservation_item_id: 0,
            serial_id: 0,
            id: 0,
            created: new Date(),
            created_by_user_id: 0,
            delivered_timestamp: null,
            delivery_by_user_id: null,
            end: null,
            minutes_offset: 0,
            note: null,
			serial,
            returned_timestamp: null,
            returned_by_user_id: null,
            schedule_delivery: null,
            schedule_return: null,
            start: null,
            status: 'ACTIVE',
            updated: new Date(),
            updated_by_user_id: 0
        };

		this.subs.sink = this.rest_reservation_item_serial.create( ris ).subscribe
		({
			next:(response)=>
			{
				this.showSuccess('Inventario asignado');
				this.search_serials = '';
				this.reservation_item_serials.push( response );
			},
			error:(error)=>
			{
				this.showError(error);
			}
		});
	}



	updateScheduleDelivery(scheduled_delivery:string)
	{
		let obj = {
			scheduled_delivery:scheduled_delivery.replace('T', ' '),
			reservation_id: this.reservation_info.reservation.id
		};

		this.subs.sink = this.rest
		.reservationUpdates('assignReservationScheduleDelivery', obj )
		.subscribe
		({
			next:(response)=>
			{
				this.showSuccess('Asignación de entrega creada');
				this.scheduled_delivery = scheduled_delivery;

				if( this.reservation_info.reservation._timestamp_next_delivery )
				{
					this.reservation_info.reservation._timestamp_next_delivery = new Date(this.scheduled_delivery);
				}
				this.showSuccess('Asignación de entrega creada');
			},
			error:(error)=>
			{
				this.showError(error);
			}
		});
	}

	updateScheduleReturn(scheduled_return:string)
	{
		let obj = {
			reservation_id: this.reservation_info.reservation.id,
			scheduled_return: scheduled_return.replace('T', ' ')
		};

		return this.rest
		.reservationUpdates('assignReservationScheduledReturn', obj )
		.subscribe
		({
			next:(_response)=>
			{
				this.showSuccess('Asignación de entrega creada');
				this.scheduled_return = scheduled_return;

				if( this.reservation_info.reservation._timestamp_next_delivery )
				{
					this.reservation_info.reservation._timestamp_next_delivery = new Date( this.scheduled_return );
				}
				this.showSuccess('Asignación de entrega creada');
				this.scheduled_return = scheduled_return;
			},
			error:(error)=>
			{
				this.showError(error);
			}
		});
	}

	markAllAsDelivered()
	{
		throw new Error('Method not implemented.');
	}
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/base/base.component';
import { FormsModule } from '@angular/forms';
import { SearchUsersComponent } from '../../../../components/search-users/search-users.component';
import { Delivery_Assignment, Reservation, Reservation_Item, Return_Assignment, User } from '../../../shared/RestModels';
import { Rest, SearchObject } from '../../../shared/services/Rest';
import { ExtendedReservation, ReservationInfo } from '../../../shared/Models';
import { filter, mergeMap } from 'rxjs';
import { RouterModule } from '@angular/router';
import { Utils } from '../../../shared/Utils';
import { ModalComponent} from '../../../../components/modal/modal.component';
import { ShortDatePipe } from "../../../shared/pipes/short-date.pipe";
import { LoadingComponent } from '../../../../components/loading/loading.component';
import { PageStructureComponent } from "../../../shared/page-structure/page-structure.component";

type ReservationFilter = 'ALL' | 'NOT_SCHEDULED' | 'NOT_ASSIGNED' | 'NOT_RETURNED' | 'NEXT_DELIVERIES' | 'NEXT_RETURNS';

interface CReservation extends ExtendedReservation
{
	default_filter: ReservationFilter;
}

@Component({
    selector: 'app-list-reservation',
    standalone: true,
    templateUrl: './list-reservation.component.html',
    styleUrl: './list-reservation.component.css',
    imports: [CommonModule, FormsModule, SearchUsersComponent, RouterModule, ModalComponent, ShortDatePipe, LoadingComponent, PageStructureComponent]
})
export class ListReservationComponent extends BaseComponent implements OnInit
{
	rest_reservation_info:Rest<CReservation, ReservationInfo> = this.rest.initRest('reservation_info');
	reservation_search = this.rest_reservation_info.getEmptySearch();

	initial_date:string = '';
	end_date:string = '';

	reservation_info_list:ReservationInfo[] = [];
	default_filter: ReservationFilter = 'ALL';
	show_assign_delivery: boolean = false;
	show_assign_return: boolean = false;
	rest_delivery_assignment = this.rest.initRestSimple<Delivery_Assignment>('delivery_assignment');
	selected_reservation_info: ReservationInfo | null = null;
    rest_return_assignment = this.rest.initRestSimple<Return_Assignment>('return_assignment');

	ngOnInit(): void
	{
		this.is_loading = true;
		this.path = '/rentals/list-reservation';
		this.title_service.setTitle('Reservaciones');

		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map) =>
			{
				this.is_loading = true;
				let fields = ['created', 'user_id','default_filter','_to_be_returned','_to_be_delivered'];

				this.reservation_search = this.getSearch(param_map, fields, [])

				this.default_filter = (param_map.get('eq.default_filter') ?? 'ALL') as ReservationFilter;


				this.reservation_search.eq.condition = 'ACTIVE';
				this.reservation_search.sort_order = ['start_ASC']
				this.reservation_search.limit = this.page_size;

				this.reservation_search.ge._to_schedule_delivery = undefined; //bueno
				this.reservation_search.ge._to_be_returned = null; //bueno
				this.reservation_search.le._timestamp_next_delivery = null;
				this.reservation_search.le._timestamp_next_return = null;
				this.reservation_search.eq.condition = undefined; //bueno


				if(this.default_filter == 'ALL')
				{

				}
				else if(this.default_filter == 'NOT_SCHEDULED')
				{
					this.reservation_search.ge._to_schedule_delivery = 1; //Bueno
					this.reservation_search.eq.condition = 'ACTIVE'; //Bueno
				}
				else if(this.default_filter == 'NOT_RETURNED')
				{
					this.reservation_search.ge._to_be_returned = 1; //Bueno
					this.reservation_search.eq.condition = 'ACTIVE'; //Bueno
				}
				else if(this.default_filter == 'NEXT_DELIVERIES')
				{
					let next_week = new Date();
					next_week.setDate(next_week.getDate() + 7);
					this.reservation_search.le._timestamp_next_delivery = next_week; //Bueno
					this.reservation_search.eq.condition = 'ACTIVE'; //Bueno
				}
				else if(this.default_filter == 'NEXT_RETURNS')
				{
					let next_week = new Date();
					next_week.setDate(next_week.getDate() + 7);

					this.reservation_search.ge._to_be_returned = 1; //Bueno
					this.reservation_search.le._timestamp_next_return = next_week; //Bueno
					this.reservation_search.eq.condition = 'ACTIVE'; //Bueno
				}

				console.log(JSON.stringify(this.reservation_search));

				return this.rest_reservation_info.search(this.reservation_search);
			}),
		)
		.subscribe
		({
			next: (response) =>
			{
				this.reservation_info_list = response.data;
				this.setPages(this.reservation_search.page, response.total);
				this.is_loading = false;
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		})
	}

	onSelectUser(user:User | null):void
	{
		if(user)
		{
			this.reservation_search.eq.user_id = user.id;
		}
	}
	setFilter(filter:ReservationFilter):void
	{
		this.reservation_search.eq.default_filter = filter;
		console.log(this.reservation_search);

		if( filter == 'NOT_ASSIGNED' )
		{
			this.reservation_search.sort_order = ['start_ASC'];
		}
		if( filter == 'NEXT_DELIVERIES' )
		{
			this.reservation_search.sort_order = ['_timestamp_next_delivery_ASC'];
		}
		else if( filter == 'NEXT_RETURNS' )
		{
			this.reservation_search.sort_order = ['_timestamp_next_delivery_ASC'];
		}

		this.search( this.reservation_search );
	}

	showAssignDelivery(reservation_info:ReservationInfo):void
	{
		this.selected_reservation_info = reservation_info;
		this.show_assign_delivery = true;
	}

	showAssignReturn(reservation_info:ReservationInfo):void
	{
		this.selected_reservation_info = reservation_info;
		this.show_assign_return = true;
	}

	onSelectDeliveryUser(user:User|null)
	{
		console.log('El usuario ', user, this.selected_reservation_info);
		if( user == null || this.selected_reservation_info == null )
		{
			console.log('El usuario o son nulos');
			this.show_assign_delivery = false;
			return;
		}

		let ri_array = this.selected_reservation_info.items.map
		(
			(rii)=>
			{
				return {
					reservation_item_id: rii.reservation_item.id,
					user_id: user.id
				}
			}
		);

		console.log("Que pedo");

		this.subs.sink = this.rest_delivery_assignment
		.batchCreate( ri_array )
		.subscribe
		({
			next:(response)=>
			{
				console.log("Que pedo");
				this.showSuccess('Asignación de entrega creada');
				this.router.navigate(['/rentals/list-reservation']);
				this.show_assign_delivery = false;
			},
			error:(error)=>
			{
				this.showError(error);
			}
		});
	}

	onSelectReturnUser(user:User|null)
	{
		if( user == null )
		{
			this.show_assign_delivery = false;
			return;
		}

		if( this.selected_reservation_info == null )
		{
			this.showError('No se ha seleccionado una renta');
			return;
		}

		let ri_array = this.selected_reservation_info.items.map
		(
			(rii)=>
			{
				return {
					reservation_item_id: rii.reservation_item.id,
					user_id: user.id
				}
			}
		);

		this.subs.sink = this.rest_return_assignment
		.batchCreate( ri_array )
		.subscribe
		({
			next:(response)=>
			{
				this.showSuccess('Asignación de entrega creada');
				this.router.navigate(['/rentals/list-reservation']);
				this.show_assign_delivery = false;
			},
			error:(error)=>
			{
				this.showError(error);
			}
		});
	}

	closeReservation(reservation_info:ReservationInfo):void
	{
		this.subs.sink = this.confirmation
		.showConfirmAlert(reservation_info, 'Cerrar Reservación', 'Esta seguro que desea cerrar esta reservación')
		.pipe
		(
			filter(response => response.accepted),
			mergeMap(() =>
			{
				//Aqui la funcion de cerrar la reservacion
				return this.rest.reservationUpdates('closeReservation',{reservation_id:reservation_info.reservation.id})
			})
		)
		.subscribe
		({
			next:(response)=>
			{
				this.showSuccess('Reservación cerrada');
				reservation_info.reservation.condition = 'CLOSED';
			},
			error:(error)=>
			{
				this.showError(error);
			}
		});
	}
}

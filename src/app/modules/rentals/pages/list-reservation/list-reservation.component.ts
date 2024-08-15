import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/base/base.component';
import { FormsModule } from '@angular/forms';
import { SearchUsersComponent } from '../../../../components/search-users/search-users.component';
import { Delivery_Assignment, Reservation, User } from '../../../shared/RestModels';
import { Rest, SearchObject } from '../../../shared/services/Rest';
import { ExtendedReservation, ReservationInfo } from '../../../shared/Models';
import { mergeMap } from 'rxjs';
import { RouterModule } from '@angular/router';
import { Utils } from '../../../shared/Utils';
import { ModalComponent} from '../../../../components/modal/modal.component';

type ReservationFilter = 'ALL' | 'NOT_SCHEDULED' | 'NOT_ASSIGNED' | 'NOT_RETURNED' | 'NEXT_DELIVERIES' | 'NEXT_RETURNS';

interface CReservation extends ExtendedReservation
{
	default_filter: ReservationFilter;
}

@Component({
	selector: 'app-list-reservation',
	standalone: true,
	imports: [CommonModule, FormsModule, SearchUsersComponent, RouterModule, ModalComponent],
	templateUrl: './list-reservation.component.html',
	styleUrl: './list-reservation.component.css'
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

	ngOnInit(): void
	{
		this.is_loading = true;
		this.path = '/rentals/list-reservation';
		this.title_service.setTitle('Reservaciones');

		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map) =>
			{
				let fields = ['created', 'user_id','default_filter','_to_be_returned','_to_be_delivered'];

				this.reservation_search = this.getSearch(param_map, fields, [])

				let start = new Date();
				let end = new Date();

				this.default_filter = (param_map.get('eq.default_filter') ?? 'ALL') as ReservationFilter;


				this.reservation_search.eq.condition = 'ACTIVE';
				this.reservation_search.sort_order = ['start_ASC']
				this.reservation_search.limit = this.page_size;

				if(this.default_filter == 'ALL')
				{
					this.reservation_search.eq._to_assign = null;
				}
				else if(this.default_filter == 'NOT_ASSIGNED')
				{
					this.reservation_search.eq._to_assign = 1;
					this.reservation_search.eq._timestamp_next_delivery = null;
					this.reservation_search.eq._to_be_returned = null;
					this.reservation_search.eq._to_be_delivered = null;

				}
				else if(this.default_filter == 'NOT_RETURNED')
				{
					this.reservation_search.eq._to_assign = null;
					this.reservation_search.eq._timestamp_next_delivery = new Date();
					this.reservation_search.eq._to_be_returned = 1;
					this.reservation_search.eq._to_be_delivered = null;
				}
				else if(this.default_filter == 'NEXT_DELIVERIES')
				{
					this.reservation_search.eq._to_assign = null;
					this.reservation_search.eq._timestamp_next_delivery = new Date();
					this.reservation_search.eq._to_be_returned = null;
					this.reservation_search.eq._to_be_delivered = 1;
				}
				else if(this.default_filter == 'NEXT_RETURNS')
				{
					this.reservation_search.eq._timestamp_next_return = new Date();
					this.reservation_search.eq._timestamp_next_delivery = null;
					this.reservation_search.eq._to_be_returned = 1;
					this.reservation_search.eq._to_assign = null;
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
		this.search( this.reservation_search );
	}

	showAssignDelivery():void
	{
		this.show_assign_delivery = true;
	}

	showAssignReturn():void
	{
		this.show_assign_return = true;
	}
	onSelectDeliveryUser(user:User|null)
	{
		if( user )
		{
			this.subs.sink = this.rest_delivery_assignment.create
			({

			}).subscribe({
				next:(response)=>
				{
					this.showSuccess('Asignación de entrega creada');
					this.router.navigate(['/rentals/list-reservation']);
				},
				error:(error)=>
				{
					this.showError(error);
				}
			});


		}
	}
}

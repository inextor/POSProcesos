import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/base/base.component';
import { FormsModule } from '@angular/forms';
import { SearchUsersComponent } from '../../../../components/search-users/search-users.component';
import { Reservation, User } from '../../../shared/RestModels';
import { Rest, SearchObject } from '../../../shared/services/Rest';
import { ReservationInfo } from '../../../shared/Models';
import { mergeMap } from 'rxjs';
import { RouterModule } from '@angular/router';
import { Utils } from '../../../shared/Utils';

@Component({
  selector: 'app-list-reservation',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchUsersComponent, RouterModule],
  templateUrl: './list-reservation.component.html',
  styleUrl: './list-reservation.component.css'
})
export class ListReservationComponent extends BaseComponent implements OnInit
{
	rest_reservation_info:Rest<Reservation, ReservationInfo> = this.rest.initRest('reservation_info');
	reservation_search:SearchObject<Reservation> = this.rest_reservation_info.getEmptySearch();

	initial_date:string = '';
	end_date:string = '';

	reservation_info_list:ReservationInfo[] = [];
	
    ngOnInit(): void
	{
		this.is_loading = true;
		this.path = '/rentals/list-reservation';
		this.title_service.setTitle('Reservaciones');

		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map) =>
			{
				let fields = ['created', 'user_id']
				this.reservation_search = this.getSearch(param_map, fields, [])
				console.log(this.reservation_search);
				let start = new Date();
				let end = new Date();
				
				if(!param_map.has('ge.created'))
				{
					start.setHours(0, 0, 0, 0);
					this.reservation_search.ge.created = start;
				}
				this.initial_date =  Utils.getLocalMysqlStringFromDate(this.reservation_search.ge.created as Date);
					
				if(!param_map.has('le.created'))
				{
					end.setHours(23, 59, 59);
					this.reservation_search.le.created = end;
				}
				this.end_date = Utils.getLocalMysqlStringFromDate(this.reservation_search.le.created as Date);

				if(param_map.has('user_id'))
				{
					
				}

				this.reservation_search.eq.status = 'ACTIVE';
				this.reservation_search.sort_order = ['id_DESC']
				this.reservation_search.limit = this.page_size;

				return this.rest_reservation_info.search(this.reservation_search);
			}),
		)
		.subscribe({
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
}

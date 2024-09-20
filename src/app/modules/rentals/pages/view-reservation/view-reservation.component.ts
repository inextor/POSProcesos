import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/base/base.component';
import { Rest, RestSimple } from '../../../shared/services/Rest';
import { ExtendedReservation, ItemInfo, ReservationInfo, ReservationItemInfo, ReservationItemSerialInfo } from '../../../shared/Models';
import { ParamMap, RouterModule } from '@angular/router';
import { mergeMap } from 'rxjs';
import { GetEmpty } from '../../../shared/GetEmpty';
import { ShortDatePipe } from "../../../shared/pipes/short-date.pipe";
import { FormsModule } from '@angular/forms';
import { Delivery_Assignment, Price, Reservation_Item, Reservation_Item_Serial, Return_Assignment, User } from '../../../shared/RestModels';
import { ModalComponent } from '../../../../components/modal/modal.component';
import { LoadingComponent } from '../../../../components/loading/loading.component';
import { SearchItemsComponent } from "../../../../components/search-items/search-items.component";
import { ItemNamePipe } from "../../../shared/pipes/item-name.pipe";
import { Utils } from '../../../shared/Utils';
import { SearchUsersComponent } from "../../../../components/search-users/search-users.component";

interface CReservation_Item_Serial extends Reservation_Item_Serial
{
	reservation_id: number;
}

@Component
({
	selector: 'app-view-reservation',
	standalone: true,
	templateUrl: './view-reservation.component.html',
	styleUrl: './view-reservation.component.css',
	imports: [CommonModule, ShortDatePipe, FormsModule, ModalComponent, LoadingComponent, RouterModule, SearchItemsComponent, ItemNamePipe, SearchUsersComponent]
})
export class ViewReservationComponent extends BaseComponent
{

	rest_reservation_info:Rest<ExtendedReservation, ReservationInfo> = this.rest.initRest('reservation_info');
	reservation_info: ReservationInfo = GetEmpty.getEmptyReservationInfo();
	show_assign_delivery: boolean = false;
	scheduled_delivery:string = '';
	scheduled_return: string = '';
	reservation_item_serial_array:Reservation_Item_Serial[] = [];
	show_assign_serials: boolean = false;
	search_serials: string = '';
	rest_reservation_item_serial: Rest<CReservation_Item_Serial,Reservation_Item_Serial> = this.rest.initRest('reservation_item_serial');
	selected_reservation_item: Reservation_Item | null = null;
	show_add_item: boolean = false;
	new_item_info: ItemInfo | null = null;
	new_item_qty: number = 1;
	client_user: User | null = null;

	rest_reservation_item: RestSimple<Reservation_Item> = this.rest.initRest('reservation_item');
	rest_delivery_assignment = this.rest.initRestSimple<Delivery_Assignment>('delivery_assignment');
	rest_return_assignment = this.rest.initRestSimple<Return_Assignment>('return_assignment');
	show_assign_return: boolean = false;

	ngOnInit(): void
	{
		this.is_loading = true;
		this.path = '/rentals/view-reservation';
		this.title_service.setTitle('Reservación');

		this.subs.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map:ParamMap) =>
			{
				this.is_loading = true;
				if( !param_map.has('id') )
				{
					throw new Error('No se encontró la reservación');
				}

				let reservation_id = parseInt( param_map.get('id') as string ) as number;

				this.subs.sink = this.rest_reservation_item_serial.search({ eq: { reservation_id } }).subscribe
				({
					next: (response) =>
					{
						this.reservation_item_serial_array = response.data;
					},
					error: (error: any) =>
					{
						console.error('Error al cargar informacion de seriales',error);
					}
				});

				return this.rest_reservation_info.get( reservation_id );
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

	addSerial(serial:string)
	{
		if( this.selected_reservation_item == null )
		{
			console.error('No se ha seleccionado un Elemento de la reservación');
			return;
		}

		let serial_found_fun = (ris:Reservation_Item_Serial)=>
		{
			return ris.serial == serial;
		}

		let x = this.reservation_item_serial_array.find(serial_found_fun);

		if( x )
		{
			this.showError('Ya existe un Serial asignado a este Elemento');
			console.log( x );
			return;
		}

		let ris:Reservation_Item_Serial =
		{
			reservation_item_id: this.selected_reservation_item.id,
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
				this.reservation_item_serial_array.push( response );
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

	}

	showAssignSerials(rii: ReservationItemInfo)
	{
		this.selected_reservation_item = rii.reservation_item;
		this.show_assign_serials = true;
	}
	showAddItem()
	{
		this.show_add_item = true;

	}

	onItemSelected(item_info: ItemInfo)
	{
		this.new_item_qty = 1;
		this.new_item_info = item_info;
	}


	addNewItem(submit_event:Event)
	{
		submit_event.preventDefault();

		if( this.new_item_info == null )
			return;

		let user = this.rest.user as User;
		let find_fun = (price:Price)=>
		{
			return price.price_type_id == this.reservation_info.reservation.price_type_id;
		};

		let price = this.new_item_info.prices.find( find_fun );


		let reservation_item:Reservation_Item = GetEmpty.reservation_item();
		reservation_item.reservation_id = this.reservation_info.reservation.id;
		reservation_item.item_id = this.new_item_info.item.id;
		reservation_item.qty = this.new_item_qty;
		reservation_item.start = Utils.getLocalMysqlStringFromDate(new Date());
		reservation_item.end = Utils.getLocalMysqlStringFromDate(new Date());
		reservation_item.last_period_id = null;
		reservation_item.period_type = 'ONCE_ONLY';
		reservation_item.price = price ? price.price : 1;
		reservation_item.tax_included = price ? price.tax_included : 'YES';
		reservation_item.delivered_qty = this.new_item_qty;


		this.subs.sink = this.rest_reservation_item
		.create( reservation_item )
		.subscribe
		({
			next:(response)=>
			{
				this.showSuccess('Elemento agregado');
				//this.reservation_info.items.push( response );
				this.new_item_info = null;

				this.subs.sink = this.rest_reservation_info
				.get( this.reservation_info.reservation.id )
				.subscribe
				({
					next:(response)=>
					{
						this.reservation_info = response;
					},
					error:(_error)=>
					{
						this.showError('Ocurrio un error al recargar la informacion de la reservación');
					}
				});
			},
			error:(error)=>
			{
				this.showError(error);
			}
		});
	}
	onSelectDeliveryUser(user:User|null)
	{
		if( user == null )
		{
			console.log('El usuario o son nulos');
			this.show_assign_delivery = false;
			return;
		}

		let ri_array = this.reservation_info.items.map
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
				//this.router.navigate(['/rentals/list-reservation']);
				//this.show_assign_delivery = false;
				this.reloadReservationInfo();
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

		let ri_array = this.reservation_info.items.map
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
				//this.showSuccess('Asignación de entrega creada');
				//this.router.navigate(['/rentals/list-reservation']);
				this.show_assign_delivery = false;
				this.reloadReservationInfo();
			},
			error:(error)=>
			{
				this.showError(error);
			}
		});
	}

	markReservationItemAsDelivered(reservatio_item_info: ReservationItemInfo)
	{
		this.is_loading = true;

		let obj = { reservation_item_id: reservatio_item_info.reservation_item.id };

		this.subs.sink = this.rest.reservationUpdates('setReservationItemAsDelivered', obj )
		.pipe
		(
			mergeMap((response:any)=>
			{
				this.showSuccess('Se marcaron todos los artículos como entregados');
				return this.rest_reservation_info.get( this.reservation_info.reservation.id );
			})
		)
		.subscribe
		({
			next:(_response)=>
			{
				this.reservation_info = _response
			},
			error:(error:any)=>
			{
				this.showError(error);
			}
		});
	}

	markReservationItemAsReturned(reservatio_item_info: ReservationItemInfo)
	{
		let reservation_item_id = reservatio_item_info.reservation_item.id;

		this.subs.sink = this.rest
		.reservationUpdates('setReservationItemAsReturned',{ reservation_item_id, user_id: this.rest?.user?.id })
		.subscribe
		({
			next:(response)=>
			{
				this.showSuccess('Se marcaron todos los artículos como devueltos');
				this.reloadReservationInfo();

			},
			error:(error)=>
			{
				this.showError(error);
			}
		});
	}


	markReservationItemSerialAsDelivered(ris:ReservationItemSerialInfo)
	{
		let id = ris.reservation_item_serial.id;

		this.subs.sink = this.rest
		.reservationUpdates('setReservationItemSerialAsDelivered',{ id })
		.subscribe
		({
			next:(response)=>
			{
				this.reloadReservationInfo();
			},
			error:(error)=>
			{
				this.showError(error);
			}
		});
	}

	reloadReservationInfo()
	{
		this.subs.sink = this.rest_reservation_info.get( this.reservation_info.reservation.id ).subscribe
		({
			next:(response)=>
			{
				this.reservation_info = response;
			},
			error:(error)=>
			{
				this.showError("Ocurrio un error al recargar la informacion de la reservación");
			}
		});
	}

	markReservationItemSerialAsReturned(ris:ReservationItemSerialInfo)
	{
		let id = ris.reservation_item_serial.id;

		this.subs.sink = this.rest
		.reservationUpdates('setReservationItemSerialAsReturned',{ id })
		.subscribe
		({
			next:(response)=>
			{
				this.showSuccess('Se marco il artículo como entregado');
				this.reloadReservationInfo();
			},
			error:(error)=>
			{
				this.showError(error);
			}
		});
	}

	markAllAsReturned()
	{
		this.subs.sink = this.rest
		.reservationUpdates('setAllReservationItemsSerialsAsReturned', { reservation_id: this.reservation_info.reservation.id } )
		.subscribe
		({
			next:(response)=>
			{
				this.showSuccess('Se marcaron todos los artículos como devueltos');
				this.reloadReservationInfo();
			},
			error:(error)=>
			{
				this.showError(error);
			}
		});
	}

	showAssignDelivery(reservation_info:ReservationInfo):void
	{
		this.show_assign_delivery = true;
	}

	showAssignReturn(reservation_info:ReservationInfo):void
	{
		this.show_assign_return = true;
	}

}

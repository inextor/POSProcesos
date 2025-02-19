import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/base/base.component';
import { forkJoin, mergeMap, of } from 'rxjs';
import { ParamMap, RouterModule } from '@angular/router';
import { Address, Currency_Rate, Price_Type, Reservation, Reservation_Item, Store, User } from '../../../shared/RestModels';
import { GetEmpty } from '../../../shared/GetEmpty';
import { ItemInfo, ReservationInfo, ReservationItemInfo } from '../../../shared/Models';
import { Rest, RestSimple } from '../../../shared/services/Rest';
import { FormsModule } from '@angular/forms';
import { SearchUsersComponent } from '../../../../components/search-users/search-users.component';
import { SearchItemsComponent } from '../../../../components/search-items/search-items.component';
import { Utils } from '../../../shared/Utils';


@Component({
	selector: 'app-save-reservation',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterModule, SearchUsersComponent, SearchItemsComponent],
	templateUrl: './save-reservation.component.html',
	styleUrl: './save-reservation.component.css'
})
export class SaveReservationComponent extends BaseComponent implements OnInit
{
	rest_reservation_info: Rest<Reservation, ReservationInfo> = this.rest.initRest('reservation_info');
	rest_currency_rate: RestSimple<Currency_Rate> = this.rest.initRest('currency_rate');
	rest_address: RestSimple<Address> = this.rest.initRest('address');
	rest_store: RestSimple<Store> = this.rest.initRest('store');
	reservation_info: ReservationInfo = GetEmpty.reservation_info();
	client_search_str: string = '';
	selected_store: Store | null = null;

	currency_rate_list: Currency_Rate[] = [];
	address_user_list: Address[] = [];
	price_type_list: Price_Type[] = [];
	store_list: Store[] = [];
	rest_user:RestSimple<User> = this.rest.initRest('user');

	ngOnInit(): void
	{
		this.subs.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map: ParamMap) =>
			{
				this.setTitle('Reservaciones');

				let id: number = 0;

				if (param_map.has('id'))
				{
					this.setTitle('Editar reservación');
					id = parseInt(param_map.get('id') ?? '0');
				}

				let reservation_obs = id != 0 ? this.rest_reservation_info.get(id) : of(GetEmpty.reservation_info());

				return forkJoin
				({
					reservation_info: reservation_obs,
					currency_rates: this.rest_currency_rate.search({ limit: 99999 }),
					price_types: this.rest.getPriceTypes(),
					stores: this.rest_store.search({ eq: { sales_enabled: 1 }, limit: 99999 }),
				});
			}),
			mergeMap((responses) =>
			{
				let reservation_client_id = 0;

				if (responses.reservation_info.reservation.id)
				{
					reservation_client_id = responses.reservation_info.reservation.user_id as number;
				}

				let address_obs = reservation_client_id
					? this.rest_address.search({ eq: { user_id: reservation_client_id } })
					: of({ total: 0, data: [] });

				return forkJoin({
					reservation_info: of(responses.reservation_info),
					currency_rates: of(responses.currency_rates),
					price_types: of(responses.price_types),
					stores: of(responses.stores),
					address_user: address_obs,
				});
			})
		)
		.subscribe
		({
			next: (responses) =>
			{
				this.address_user_list = responses.address_user.data;
				this.price_type_list = responses.price_types.data;
				this.store_list = responses.stores.data;
				this.reservation_info = responses.reservation_info;

				let user = this.rest.user as User;

				let price_type = this.price_type_list[0];


				if (this.reservation_info.reservation.id == 0)
				{
					this.reservation_info.reservation =
					{
						...this.reservation_info.reservation,
						price_type_id: price_type.id,
						start: '',
						store_id: user.store_id as number,
						status: 'ACTIVE',
					};
				}

				if (responses.currency_rates.total > 0)
				{
					this.currency_rate_list = responses.currency_rates.data;
				}
			},
			error: (error) =>
			{
				this.showError(error);
			}
		});
	}

	saveReservation(evt: Event) {
		evt.preventDefault();

		let user = this.rest.user as User;
		this.reservation_info.reservation =
		{
			...this.reservation_info.reservation,
			created_by_user_id: user.id,
			updated_by_user_id: user.id,
			status: 'ACTIVE'
		};

		if (this.reservation_info.reservation.id == 0)
		{
			this.sink =this.rest_reservation_info.create(this.reservation_info)
			.subscribe
			({
				next: (response) =>
				{
					this.showSuccess('Reservación guardada');
					this.router.navigate(['/rentals/list-reservation']);
				},
				error: (error) =>
				{
					this.showError(error);
				}
			});
		}
		else
		{
			this.sink = this.rest_reservation_info.update(this.reservation_info)
			.subscribe
			({
				next: (response) =>
				{
					this.showSuccess('Reservación actualizada');
					this.router.navigate(['/rentals/list-reservation']);
				},
				error: (error) =>
				{
					this.showError(error);
				}
			});
		}
	}

	onClientStrChange(search_str: string): void
	{
		this.client_search_str = search_str;
		this.reservation_info.reservation.client_name = search_str;
	}

	onSelectUser(user: User | null): void
	{
		if (user == null)
		{
			this.reservation_info.reservation.user_id = null;
			this.sink = this.rest_user.create({ name: this.client_search_str, type: 'CLIENT', status: 'ACTIVE' })
			.subscribe
			({
				next: (response) =>
				{
					this.showSuccess('Cliente ' + this.client_search_str + ' Registrado');
					this.reservation_info.reservation.user_id = response.id;
				},
				error: (error: any) =>
				{
					this.showError(error);
				}
			});
		}

		if (user)
		{
			let price_type_id = user?.price_type_id || this.price_type_list[0].id;
			this.reservation_info.reservation =
			{
				...this.reservation_info.reservation,
				user_id: user.id,
				price_type_id: price_type_id,
				client_name: user.name,
				address_id: null
			};

			this.searchClientAddress(user.id);
		}
	}

	searchClientAddress(user_id: number): void
	{
		this.sink = this.rest_address.search({ eq: { user_id, status: 'ACTIVE' }, limit: 99999 })
		 .subscribe
		 ({
			 next: (response) =>
			 {
				 this.address_user_list = response.data;
			 },
			 error: (error) =>
			 {
				 this.showError(error);
			 }
		 });
	}

	onItemSelected(item_info: ItemInfo): void
	{
		//validate if the item is already in the list
		let index = this.reservation_info.items.findIndex((ri) => ri.item.id == item_info.item.id);
		if (index >= 0) {
			this.showError('El item ya ha sido agregado');
			return;
		}

		//validate if the item has prices
		if (item_info.prices == null) {
			this.showError('El item no tiene precios');
		}

		this.selected_store = this.store_list.find((s) => s.id == this.reservation_info.reservation.store_id) as Store;

		if (this.selected_store == null) {
			this.showError('Seleccione una tienda');
			return;
		}

		let price = 0;
		let tax_included: "YES" | "NO" = "NO";

		if (item_info.prices)
		{
			item_info.prices.forEach((p) =>
			{
				//really bad way to get the price
				//price must be, from the price list of the store, and also, the first price type, already sorted by priority
				if (this.selected_store && p.price_list_id == this.selected_store.price_list_id && p.price_type_id == this.price_type_list[0].id) {
					price = p.price;
					tax_included = p.tax_included;
				}
			});
		}

		let reservation_item: Reservation_Item = GetEmpty.reservation_item();

		let start_date = new Date();
		start_date.setSeconds(0);
		let start = this.reservation_info.reservation.start || Utils.getLocalMysqlStringFromDate(start_date);

		reservation_item =
		{
			...reservation_item,
			item_id: item_info.item.id,
			price,
			tax_included,
			period_type: item_info.item.period_type ?? "MONTHLY",
			reservation_id: this.reservation_info.reservation.id,
			start,
		};

		let reservation_item_info: ReservationItemInfo = GetEmpty.reservation_item_info();

		reservation_item_info =
		{
			...reservation_item_info,
			reservation_item,
			category: item_info.category,
			item: item_info.item,
		};

		this.reservation_info.items.push(reservation_item_info);
		console.log(this.reservation_info.items);
	}

	onStartDateChange(start: string): void
	{
		for (let rii of this.reservation_info.items)
		{
			rii.reservation_item.start = start;
		}
	}

	removeItem(index: number): void
	{
		this.reservation_info.items.splice(index, 1);
	}
}


import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { ConsignmentReceivedInfo, ConsignmentReceivedItemInfo } from '../../modules/shared/Models';
import { Consignment_Received, Consignment_Received_Item, Store, User } from '../../modules/shared/RestModels';
import { ItemInfo } from '../../modules/shared/Models';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from '../../components/loading/loading.component';
import { SearchItemsComponent } from '../../components/search-items/search-items.component';

@Component({
	selector: 'app-save-consignment-received',
	imports: [CommonModule, FormsModule, RouterModule, LoadingComponent, SearchItemsComponent],
	templateUrl: './save-consignment-received.component.html',
	styleUrl: './save-consignment-received.component.css'
})
export class SaveConsignmentReceivedComponent extends BaseComponent implements OnInit
{
	override path = '/save-consignment-received';
	info: ConsignmentReceivedInfo = this.getEmpty();
	store_list: Store[] = [];
	is_saving = false;
	isEditing = false;
	provider_search: string = '';
	show_provider_list: boolean = false;
	provider_user_list: User[] = [];
	show_new_provider: boolean = false;

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit()
	{
		this.setTitle('Consignación Recibida');

		let rest_store = this.rest.initRestSimple<Store>('store');
		let rest_cr = this.rest.initRestSimple<ConsignmentReceivedInfo>('consignment_received_info');

		this.subs.sink = this.route.paramMap
		.pipe(
			mergeMap((params) =>
			{
				this.is_loading = true;
				let id_str = params.get('id');

				return forkJoin({
					stores: rest_store.search({ limit: 9999, sort_order: ['name_ASC'] }),
					cr: id_str ? rest_cr.get(parseInt(id_str)) : of(this.getEmpty())
				});
			})
		)
		.subscribe({
			next: (response) =>
			{
				this.store_list = response.stores.data;
				this.info = response.cr;
				this.isEditing = !!this.info.consignment_received.id;

				if (this.isEditing)
				{
					this.router.navigate(['/view-consignment-received', this.info.consignment_received.id]);
					return;
				}

				if (!this.info.consignment_received.store_id && this.rest.user?.store_id)
				{
					this.info.consignment_received.store_id = this.rest.user.store_id;
				}

				this.is_loading = false;
			},
			error: (error) => this.showError(error)
		});
	}

	searchProvider(provider_name: string)
	{
		this.show_provider_list = true;
		this.provider_search = provider_name;
		this.info.consignment_received.provider_user_id = null;

		if (provider_name.length < 1)
		{
			this.provider_user_list = [];
			return;
		}

		let rest_user = this.rest.initRestSimple<User>('user');
		this.subs.sink = rest_user.search({
			start: { name: provider_name },
			eq: { status: 'ACTIVE' },
			search_extra: { 'user_permission.is_provider': 1 },
			limit: 20
		}).subscribe((response) =>
		{
			this.provider_user_list = response.data;
		});
	}

	userProviderSelected(user: User)
	{
		this.show_provider_list = false;
		this.provider_search = user.name;
		this.info.consignment_received.provider_user_id = user.id;
		this.info.provider = user;
		this.provider_user_list = [];
	}

	addNewProvider(provider_name: string)
	{
		this.is_loading = true;
		this.show_provider_list = false;

		let user: Partial<User> = {
			name: provider_name,
			email: provider_name,
			store_id: undefined,
			type: 'USER',
			credit_days: 0,
			credit_limit: 0,
			price_type_id: undefined,
		};

		let user_permission = GetEmpty.user_permission();
		user_permission.is_provider = 1;

		let rest_user = this.rest.initRestSimple<User>('user');
		let rest_user_permission = this.rest.initRestSimple<any>('user_permission');

		this.subs.sink = rest_user.create(user).pipe(
			mergeMap((response) =>
			{
				user_permission.user_id = response.id;
				this.info.consignment_received.provider_user_id = response.id;
				return rest_user_permission.update(user_permission);
			})
		).subscribe({
			next: () =>
			{
				this.is_loading = false;
				this.showSuccess('Proveedor registrado exitosamente');
				this.provider_search = provider_name;
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	onItemSelected(item_info: ItemInfo)
	{
		if (this.info.items.some(i => i.consignment_received_item.item_id == item_info.item.id))
			return;

		let cri: Consignment_Received_Item = {
			id: 0,
			consignment_received_id: this.info.consignment_received.id,
			item_id: item_info.item.id,
			qty: 1,
			settled_qty: 0,
			returned_qty: 0,
			unitary_cost: item_info.item.reference_price || 0,
			total: 0,
			created: new Date(),
			updated: new Date()
		};

		this.info.items.push({
			consignment_received_item: cri,
			item: item_info.item,
			category: item_info.category
		});

		this.updateTotal();
	}

	removeItem(index: number)
	{
		this.info.items.splice(index, 1);
		this.updateTotal();
	}

	updateTotal()
	{
	}

	getTotal(): number
	{
		return this.info.items.reduce((sum, i) => sum + (i.consignment_received_item.qty * i.consignment_received_item.unitary_cost), 0);
	}

	save()
	{
		if (this.info.items.length == 0)
		{
			this.showError('Debe agregar al menos un artículo');
			return;
		}

		if (!this.info.consignment_received.provider_user_id)
		{
			this.showError('Debe seleccionar un proveedor existente de la lista o registrar uno nuevo');
			return;
		}

		this.is_saving = true;
		let rest = this.rest.initRestSimple<ConsignmentReceivedInfo>('consignment_received_info');

		let obs = this.info.consignment_received.id
			? rest.update(this.info)
			: rest.create(this.info);

		this.subs.sink = obs.subscribe({
			next: () =>
			{
				this.showSuccess('Consignación guardada exitosamente');
				this.router.navigate(['/list-consignment-received']);
			},
			error: (error) =>
			{
				this.is_saving = false;
				this.showError(error);
			}
		});
	}

	getEmpty(): ConsignmentReceivedInfo
	{
		let cr: Consignment_Received = {
			id: 0,
			provider_user_id: null,
			store_id: 0,
			reference: null,
			total: 0,
			stock_status: 'PENDING',
			status: 'ACTIVE',
			closed_timestamp: null,
			created: new Date(),
			updated: new Date(),
			created_by_user_id: null,
			updated_by_user_id: null
		};

		return {
			consignment_received: cr,
			items: [],
			provider: null,
			store: null
		};
	}
}

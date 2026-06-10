import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { ConsignmentDeliveredInfo, ConsignmentDeliveredItemInfo } from '../../modules/shared/Models';
import { Consignment_Delivered, Consignment_Delivered_Item, Store, User } from '../../modules/shared/RestModels';
import { ItemInfo } from '../../modules/shared/Models';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from '../../components/loading/loading.component';
import { SearchItemsComponent } from '../../components/search-items/search-items.component';

@Component({
	selector: 'app-save-consignment-delivered',
	imports: [CommonModule, FormsModule, RouterModule, LoadingComponent, SearchItemsComponent],
	templateUrl: './save-consignment-delivered.component.html',
	styleUrl: './save-consignment-delivered.component.css'
})
export class SaveConsignmentDeliveredComponent extends BaseComponent implements OnInit
{
	override path = '/save-consignment-delivered';
	info: ConsignmentDeliveredInfo = this.getEmpty();
	store_list: Store[] = [];
	seller_list: User[] = [];
	seller_search: string = '';
	is_saving = false;
	isEditing = false;

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit()
	{
		this.setTitle('Consignación Entregada');

		let rest_store = this.rest.initRestSimple<Store>('store');
		let rest_cd = this.rest.initRestSimple<ConsignmentDeliveredInfo>('consignment_delivered_info');

		this.subs.sink = this.route.paramMap
		.pipe(
			mergeMap((params) =>
			{
				this.is_loading = true;
				let id_str = params.get('id');

				return forkJoin({
					stores: rest_store.search({ limit: 9999, sort_order: ['name_ASC'] }),
					cd: id_str ? rest_cd.get(parseInt(id_str)) : of(this.getEmpty())
				});
			})
		)
		.subscribe({
			next: (response) =>
			{
				this.store_list = response.stores.data;
				this.info = response.cd;
				this.isEditing = !!this.info.consignment_delivered.id;

				if (this.isEditing)
				{
					this.router.navigate(['/view-consignment-delivered', this.info.consignment_delivered.id]);
					return;
				}

				if (!this.info.consignment_delivered.store_id && this.rest.user?.store_id)
				{
					this.info.consignment_delivered.store_id = this.rest.user.store_id;
				}

				this.is_loading = false;
			},
			error: (error) => this.showError(error)
		});
	}

	searchSeller(term: string)
	{
		if (term.length < 2)
		{
			this.seller_list = [];
			return;
		}

		let rest_user = this.rest.initRestSimple<User>('user');
		this.subs.sink = rest_user.search({
			start: { name: term },
			eq: { status: 'ACTIVE' },
			limit: 20
		}).subscribe((response) =>
		{
			this.seller_list = response.data;
		});
	}

	selectSeller(user: User)
	{
		this.info.consignment_delivered.seller_user_id = user.id;
		this.info.seller = user;
		this.seller_search = user.name;
		this.seller_list = [];
	}

	onItemSelected(item_info: ItemInfo)
	{
		if (this.info.items.some(i => i.consignment_delivered_item.item_id == item_info.item.id))
			return;

		let cdi: Consignment_Delivered_Item = {
			id: 0,
			consignment_delivered_id: this.info.consignment_delivered.id,
			item_id: item_info.item.id,
			qty: 1,
			sold_qty: 0,
			returned_qty: 0,
			unitary_price: 0,
			total: 0,
			created: new Date(),
			updated: new Date()
		};

		this.info.items.push({
			consignment_delivered_item: cdi,
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
		return this.info.items.reduce((sum, i) => sum + (i.consignment_delivered_item.qty * i.consignment_delivered_item.unitary_price), 0);
	}

	save()
	{
		if (this.info.items.length == 0)
		{
			this.showError('Debe agregar al menos un artículo');
			return;
		}

		if (!this.info.consignment_delivered.seller_user_id)
		{
			this.showError('Debe seleccionar un vendedor');
			return;
		}

		this.is_saving = true;
		let rest = this.rest.initRestSimple<ConsignmentDeliveredInfo>('consignment_delivered_info');

		let obs = this.info.consignment_delivered.id
			? rest.update(this.info)
			: rest.create(this.info);

		this.subs.sink = obs.subscribe({
			next: () =>
			{
				this.showSuccess('Consignación guardada exitosamente');
				this.router.navigate(['/list-consignment-delivered']);
			},
			error: (error) =>
			{
				this.is_saving = false;
				this.showError(error);
			}
		});
	}

	getEmpty(): ConsignmentDeliveredInfo
	{
		let cd: Consignment_Delivered = {
			id: 0,
			seller_user_id: null,
			store_id: 0,
			total: 0,
			status: 'ACTIVE',
			closed_timestamp: null,
			created: new Date(),
			updated: new Date(),
			created_by_user_id: null,
			updated_by_user_id: null
		};

		return {
			consignment_delivered: cd,
			items: [],
			seller: null,
			store: null
		};
	}
}

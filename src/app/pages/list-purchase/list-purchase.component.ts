import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SearchObject } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Currency_Rate, Purchase, Store, User } from '../../modules/shared/RestModels';
import { PurchaseDetailInfo, PurchaseInfo, ShippingItemInfo, ShippingInfo } from '../../modules/shared/Models';
import { forkJoin, of } from 'rxjs';
import { Utils } from '../../modules/shared/Utils';
import { filter, mergeMap } from 'rxjs/operators';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from '../../components/loading/loading.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { PaginationComponent } from '../../components/pagination/pagination.component';

interface CPurchaseInfo extends PurchaseInfo
{
	store:Store;
}

@Component({
	selector: 'app-list-purchase',
	imports: [
		CommonModule,
		FormsModule,
		RouterModule,
		LoadingComponent,
		ModalComponent,
		PaginationComponent
	],
	templateUrl: './list-purchase.component.html',
	styleUrl: './list-purchase.component.css'
})
export class ListPurchaseComponent extends BaseComponent implements OnInit
{
	file:File | null = null;
	show_import:boolean = false;
	purchase_search:SearchObject<Purchase> = this.getEmptySearch();
	purchase_info_list:CPurchaseInfo[] = [];
	currency_rate_list:Currency_Rate[] = [];
	provider_list:User[] = [];
	store_list: Store[] = [];

	shipping_guide:string = '';
	shipping_date:string = '';
	shipping_company:string = '';
	search_start:string = '';
	search_end:string = '';
	selected_purchase_info: CPurchaseInfo | null = null;
	show_create_shipping:boolean = false;
	mark_as_sent:boolean = false;

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit()
	{
		this.path = '/list-purchase';

		this.subs.sink = this.route.queryParamMap.subscribe((queryParamMap) =>
		{
			this.is_loading = true;

			let fields = [ "provider_user_id","created","store_id" ];
			let extra_keys = ["paid_status"];
			this.purchase_search = this.getSearch(queryParamMap, fields, extra_keys );
			this.purchase_search.sort_order = ['id_DESC'];
			this.purchase_search.eq.status = 'ACTIVE';

			let start = new Date();
			let end = new Date();

			if(!queryParamMap.has('ge.created'))
			{
				start.setDate(1);
				start.setHours(0,0,0,0);
				this.purchase_search.ge.created = start;
			}
			this.search_start = Utils.getLocalMysqlStringFromDate(this.purchase_search.ge.created!);

			if(!queryParamMap.has('le.created'))
			{
				let end_date = Utils.getEndOfMonth(end);
				end_date.setHours(23,59,0);
				this.purchase_search.le.created = end_date;
			}

			this.search_end = Utils.getLocalMysqlStringFromDate(this.purchase_search.le.created!);
			this.setTitle('Ordenes de compra');
			this.current_page = this.purchase_search.page;

			let rest_purchase_info = this.rest.initRestSimple<PurchaseInfo>('purchase_info');
			let rest_store = this.rest.initRestSimple<Store>('store');
			let rest_currency_rate = this.rest.initRestSimple<Currency_Rate>('currency_rate');
			let rest_user = this.rest.initRestSimple<User>('user');

			this.subs.sink = forkJoin
			({
				purchase_info: rest_purchase_info.search( this.purchase_search as any ),
				store: rest_store.search({eq:{status:'ACTIVE'},limit:99999}),
				currency_rate: rest_currency_rate.search({limit:99999}),
				providers: rest_user.search({eq:{type: 'USER'}, search_extra:{'user_permission.is_provider':1},limit:99999})
			})
			.subscribe((response)=>
			{
				this.setPages( this.purchase_search.page, response.purchase_info.total );
				this.store_list = response.store.data;

				response.providers.data.sort((a,b)=>{
					return a.name > b.name ? 1: -1;
				});

				this.provider_list = response.providers.data;

				for( let purchase_info of response.purchase_info.data )
				{
					purchase_info.purchase.total = this.getPurchaseInfoTotal(purchase_info);
				}

				this.purchase_info_list = response.purchase_info.data.map((pi:PurchaseInfo)=>
				{
					let store = this.store_list.find((s:Store)=>s.id == pi.purchase.store_id) || GetEmpty.store();
					return { ...pi, store };
				});

				this.currency_rate_list = response.currency_rate.data;
				this.is_loading = false;
			},(error)=>this.showError(error));
		});
	}

	addToStock(purchase_info:CPurchaseInfo)
	{
		this.subs.sink = this.confirmation.showConfirmAlert
		(
			purchase_info,
			'Agregar Inventario',
			'La orden de compra se agregara al inventario actual de la sucursal '+purchase_info.store.name+', esta seguro que desea continuar',
		)
		.pipe
		(
			filter((response)=>
			{
				return response.accepted;
			}),
			mergeMap((response)=>
			{
				return this.rest.update('addPurchaseToStock',{purchase_id:purchase_info.purchase.id});
			})
		)
		.subscribe
		({
			next:(response)=>
			{
				purchase_info.purchase.stock_status = 'ADDED_TO_STOCK';
			},
			error:(error)=>
			{

			}
		})
	}

	markAsSentChange(evt:Event)
	{
		let input = evt.target as HTMLInputElement;
		this.mark_as_sent = input.checked;
	}

	showCreateShipping( purchase_info:CPurchaseInfo )
	{
		this.selected_purchase_info = purchase_info;
		this.show_create_shipping = true;
	}

	createShipping(evt:Event)
	{
		let rest_purchase_info = this.rest.initRestSimple<PurchaseInfo>('purchase_info');
		let rest_shipping_info = this.rest.initRestSimple<ShippingInfo>('shipping_info');

		this.subs.sink = rest_purchase_info.get( this.selected_purchase_info!.purchase.id )
		.pipe
		(
			mergeMap((pi:PurchaseInfo)=>
			{
				let shipping_info:ShippingInfo = {
					shipping: {
						to_store_id: pi.purchase.store_id,
						from_store_id: null,
						shipping_guide:this.shipping_guide,
						shipping_company:this.shipping_company,
						date: this.shipping_date,
						purchase_id: pi.purchase.id
					},
					items: []
				};

				pi.details.forEach((pdi:PurchaseDetailInfo)=>
				{
					let si:Partial<ShippingItemInfo> = {
						shipping_item:
						{
							item_id: pdi.purchase_detail.item_id,
							qty: pdi.purchase_detail.qty,
							serial_number: pdi.purchase_detail.serial_number,
							received_qty: 0
						} as any
					};

					shipping_info.items.push(si);
				});

				return rest_shipping_info.create( shipping_info );
			})
		)
		.subscribe((response)=>
		{
			this.selected_purchase_info!.purchase.stock_status = 'SHIPPING_CREATED';
			this.showSuccess('El envio se registro con exito');

			if( this.mark_as_sent )
			{
				this.subs.sink = this.rest.update
				(
					'markShippingAsSent',
					{shipping_id:response.shipping.id}
				)
				.subscribe(()=>
				{
					this.showSuccess('El envio se marco como enviado');
					this.show_create_shipping = false;
				},(error)=>
				{
					this.showSuccess('El envio se registro con exito pero no se pudo marcar como enviado');
					this.showError(error);
					this.mark_as_sent = false;
					this.show_create_shipping = false;
				})
			}
			else
			{
				this.show_create_shipping = false;
				this.mark_as_sent = false;
				this.show_create_shipping = false;

				let form = evt.target as HTMLFormElement;
				form.reset();

			}
		},(error)=>this.showError(error));
	}

	getPurchaseInfoTotal(purchase_info:PurchaseInfo):number
	{
		let total = 0;

		for( let detail of purchase_info.details )
		{
			total += (detail.purchase_detail.unitary_price*detail.purchase_detail.qty);
		}

		return total;
	}

	deletePurchase(purchase_info: CPurchaseInfo)
	{
		let rest_purchase_info = this.rest.initRestSimple<PurchaseInfo>('purchase_info');

		this.subs.sink = this.confirmation.showConfirmAlert
		(
			purchase_info,
			'Eliminar Compra',
			'La orden de compra se eliminara, esta seguro que desea continuar',
		)
		.pipe
		(
			mergeMap((response) =>
			{
				if( response.accepted )
				{
					purchase_info.purchase.status = 'DELETED';
					return rest_purchase_info.update(purchase_info);
				}
				return of(purchase_info);
			})
		)
		.subscribe
		({
			next:(response) =>
			{
				this.showSuccess('La compra se elimino con exito');
				this.purchase_info_list = this.purchase_info_list.filter(p => p.purchase.id != purchase_info.purchase.id);
			}
		})
	}
}

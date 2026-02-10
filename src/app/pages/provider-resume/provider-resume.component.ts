import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParamMap } from '@angular/router';
import { mergeMap } from 'rxjs/operators';
import { Utils } from '../../modules/shared/Utils';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Purchase, Shipping, User } from '../../modules/shared/RestModels';
import { PurchaseInfo, ShippingInfo } from '../../modules/shared/Models';
import { forkJoin, of } from 'rxjs';
import { RouterLink } from '@angular/router';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';

interface ItemSummary
{
	item_id: number;
	item_name: string;
	item_code: string | null;
	category_name: string | null;
	qty_purchased: number;
	qty_received: number;
	qty_merma: number;
	unitary_price: number;
	total_purchased: number;
}

interface CPurchaseInfo extends PurchaseInfo
{
	shippings: ShippingInfo[];
}

@Component({
	selector: 'app-provider-resume',
	templateUrl: './provider-resume.component.html',
	styleUrl: './provider-resume.component.css',
	imports: [CommonModule, FormsModule, RouterLink, ShortDatePipe],
})
export class ProviderResumeComponent extends BaseComponent implements OnInit
{
	purchase_search: SearchObject<Purchase> = this.getEmptySearch();
	start_date: string = '';
	end_date: string = '';

	rest_user: RestSimple<User> = this.rest.initRestSimple('user', ['id', 'name']);
	rest_purchase_info: RestSimple<PurchaseInfo> = this.rest.initRestSimple('purchase_info', ['id']);
	rest_shipping_info: RestSimple<ShippingInfo> = this.rest.initRestSimple('shipping_info', ['id']);

	providers: User[] = [];
	selected_provider: User | null = null;
	purchase_list: CPurchaseInfo[] = [];
	item_summary_list: ItemSummary[] = [];

	sortColumn: string = '';
	sortDirection: 'asc' | 'desc' = 'asc';

	get totalPurchased(): number
	{
		return this.item_summary_list.reduce((sum, item) => sum + (item.qty_purchased || 0), 0);
	}

	get totalReceived(): number
	{
		return this.item_summary_list.reduce((sum, item) => sum + (item.qty_received || 0), 0);
	}

	get totalMerma(): number
	{
		return this.item_summary_list.reduce((sum, item) => sum + (item.qty_merma || 0), 0);
	}

	get totalAmount(): number
	{
		return this.item_summary_list.reduce((sum, item) => sum + (item.total_purchased || 0), 0);
	}

	ngOnInit(): void
	{
		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map: ParamMap) =>
			{
				let providers_obs = this.providers.length
					? of({ total: this.providers.length, data: this.providers })
					: this.rest_user.search({ eq: { type: 'USER' }, search_extra: { 'user_permission.is_provider': 1 }, limit: 999999 });

				return forkJoin
				({
					providers: providers_obs,
					param_map: of(param_map),
				});
			}),
			mergeMap((response) =>
			{
				this.providers = response.providers.data;
				this.providers.sort((a, b) => a.name > b.name ? 1 : -1);

				let param_map = response.param_map;

				this.setTitle('Resumen de Proveedor');
				this.path = '/provider-resume';
				this.is_loading = true;

				let fields = ['provider_user_id', 'created'];
				this.purchase_search = this.getSearch(param_map, fields);
				this.purchase_search.eq.status = 'ACTIVE';

				// Set default dates to current month
				let start = new Date();
				let end = new Date();

				if (!param_map.has('ge.created'))
				{
					start.setDate(1);
					start.setHours(0, 0, 0, 0);
					this.purchase_search.ge.created = start;
				}

				if (!param_map.has('le.created'))
				{
					end = Utils.getEndOfMonth(new Date());
					this.purchase_search.le.created = end;
				}

				this.start_date = Utils.getLocalMysqlStringFromDate(this.purchase_search.ge.created!);
				this.end_date = Utils.getLocalMysqlStringFromDate(this.purchase_search.le.created!);

				// Update selected provider
				if (this.purchase_search.eq.provider_user_id)
				{
					this.selected_provider = this.providers.find(p => p.id === this.purchase_search.eq.provider_user_id) || null;
				}
				else
				{
					this.selected_provider = null;
				}

				// If no provider selected, return empty
				if (!this.purchase_search.eq.provider_user_id)
				{
					this.is_loading = false;
					return of({ purchases: [] as PurchaseInfo[], shippings: [] as ShippingInfo[] });
				}

				// Fetch purchases for the provider within date range
				return this.rest_purchase_info.search(this.purchase_search as any).pipe(
					mergeMap((purchasesResponse) =>
					{
						const purchases = purchasesResponse.data;

						// Check if any purchase needs shipping data
						const purchaseIdsWithShipping = purchases
							.filter((p: PurchaseInfo) => p.purchase.stock_status === 'SHIPPING_CREATED')
							.map((p: PurchaseInfo) => p.purchase.id);

						// Only fetch shippings if there are purchases with SHIPPING_CREATED status
						if (purchaseIdsWithShipping.length > 0)
						{
							return forkJoin({
								purchases: of(purchases),
								shippings: this.rest_shipping_info.search({
									csv: { purchase_id: purchaseIdsWithShipping },
									limit: 999999
								} as any)
							}).pipe(
								mergeMap((result) => of({
									purchases: result.purchases,
									shippings: result.shippings.data
								}))
							);
						}

						// No shippings needed
						return of({
							purchases: purchases,
							shippings: [] as ShippingInfo[]
						});
					})
				);
			})
		)
		.subscribe
		({
			error: (error) => this.showError(error),
			next: (response) =>
			{
				this.is_loading = false;

				// Map shippings to purchases
				this.purchase_list = response.purchases.map((p: PurchaseInfo) =>
				{
					const purchaseShippings = response.shippings.filter((s: ShippingInfo) => s.shipping.purchase_id === p.purchase.id);
					return { ...p, shippings: purchaseShippings } as CPurchaseInfo;
				});

				// Build item summary
				this.buildItemSummary();
			}
		});
	}

	buildItemSummary(): void
	{
		const itemMap = new Map<number, ItemSummary>();

		// First, add all purchased items
		for (const purchase of this.purchase_list)
		{
			const isAddedDirectlyToStock = purchase.purchase.stock_status === 'ADDED_TO_STOCK';

			for (const detail of purchase.details)
			{
				const itemId = detail.item.id;

				if (!itemMap.has(itemId))
				{
					itemMap.set(itemId, {
						item_id: itemId,
						item_name: detail.item.name,
						item_code: detail.item.code,
						category_name: detail.category?.name || null,
						qty_purchased: 0,
						qty_received: 0,
						qty_merma: 0,
						unitary_price: detail.purchase_detail.unitary_price,
						total_purchased: 0
					});
				}

				const summary = itemMap.get(itemId)!;
				summary.qty_purchased += detail.purchase_detail.qty;
				summary.total_purchased += detail.purchase_detail.total;

				// If purchase was added directly to stock, count as received
				if (isAddedDirectlyToStock)
				{
					summary.qty_received += detail.purchase_detail.qty;
				}
			}

			// Add received and merma from shippings (only for purchases with SHIPPING_CREATED status)
			if (purchase.purchase.stock_status === 'SHIPPING_CREATED')
			{
				for (const shipping of purchase.shippings)
				{
					for (const shippingItem of shipping.items)
					{
						if (!shippingItem.item || !shippingItem.shipping_item) continue;

						const itemId = shippingItem.item.id;

						// If item was not in purchase, add it (shouldn't happen but just in case)
						if (!itemMap.has(itemId))
						{
							itemMap.set(itemId, {
								item_id: itemId,
								item_name: shippingItem.item.name,
								item_code: shippingItem.item.code,
								category_name: shippingItem.category?.name || null,
								qty_purchased: 0,
								qty_received: 0,
								qty_merma: 0,
								unitary_price: 0,
								total_purchased: 0
							});
						}

						const summary = itemMap.get(itemId)!;
						summary.qty_received += shippingItem.shipping_item.received_qty || 0;
						summary.qty_merma += shippingItem.shipping_item.shrinkage_qty || 0;
					}
				}
			}
		}

		this.item_summary_list = Array.from(itemMap.values());
	}

	performSearch(): void
	{
		super.search(this.purchase_search);
	}

	sortBy(column: string): void
	{
		if (this.sortColumn === column)
		{
			this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
		}
		else
		{
			this.sortColumn = column;
			this.sortDirection = 'asc';
		}

		this.item_summary_list.sort((a, b) =>
		{
			let aValue: any;
			let bValue: any;

			switch (column)
			{
				case 'item_name':
					aValue = a.item_name?.toLowerCase() || '';
					bValue = b.item_name?.toLowerCase() || '';
					break;
				case 'item_code':
					aValue = a.item_code?.toLowerCase() || '';
					bValue = b.item_code?.toLowerCase() || '';
					break;
				case 'category_name':
					aValue = a.category_name?.toLowerCase() || '';
					bValue = b.category_name?.toLowerCase() || '';
					break;
				case 'qty_purchased':
					aValue = a.qty_purchased || 0;
					bValue = b.qty_purchased || 0;
					break;
				case 'qty_received':
					aValue = a.qty_received || 0;
					bValue = b.qty_received || 0;
					break;
				case 'qty_merma':
					aValue = a.qty_merma || 0;
					bValue = b.qty_merma || 0;
					break;
				case 'total_purchased':
					aValue = a.total_purchased || 0;
					bValue = b.total_purchased || 0;
					break;
				default:
					return 0;
			}

			if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
			if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
			return 0;
		});
	}
}

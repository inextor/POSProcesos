import { Component, OnInit } from '@angular/core';
import { forkJoin, mergeMap, of } from 'rxjs';
import { filter } from 'rxjs/operators';

import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple } from '../../modules/shared/services/Rest';
import { Item, Offer, Store } from '../../modules/shared/RestModels';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { RouterModule } from '@angular/router';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';
import { LoadingComponent } from '../../components/loading/loading.component';
import { ConfirmationResult, ConfirmationService } from '../../modules/shared/services/confirmation.service';

@Component({
	selector: 'app-view-offer',
	imports: [RouterModule, ShortDatePipe, LoadingComponent],
	templateUrl: './view-offer.component.html',
	styleUrl: './view-offer.component.css'
})
export class ViewOfferComponent extends BaseComponent implements OnInit
{
	rest_offer: RestSimple<Offer> = this.rest.initRestSimple('offer', ['id', 'category_id', 'coupon_code', 'created_by_user_id', 'created', 'gift_item_id', 'hour_end', 'hour_start', 'is_valid_friday', 'is_valid_monday', 'is_valid_saturday', 'is_valid_sunday', 'is_valid_thursday', 'is_valid_tuesday', 'is_valid_wednesday', 'item_id', 'qty', 'store_id', 'type', 'updated_by_user_id', 'updated', 'valid_from', 'valid_thru', 'price_type_id', 'status', 'batch', 'expiration_thru', 'expiration_days']);
	rest_store: RestSimple<Store> = this.rest.initRestSimple('store', ['id', 'name']);
	rest_item: RestSimple<Item> = this.rest.initRestSimple('item', ['id', 'name']);

	offer: Offer = GetEmpty.offer();
	store_name: string = 'Todas';
	item_name: string = '';
	spanish_name: string = '';
	active_days: string = '';

	ngOnInit()
	{
		this.is_loading = true;
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map) =>
			{
				let offer_id = param_map.get('id') as string;

				return forkJoin
				({
					offer: this.rest_offer.get(offer_id),
					store: this.rest_store.search({ eq: { status: 'ACTIVE' }, limit: 999999 })
				});
			}),
			mergeMap((response) =>
			{
				let item_ids: number[] = [];

				if (response.offer.item_id)
					item_ids.push(response.offer.item_id);

				if (response.offer.gift_item_id)
					item_ids.push(response.offer.gift_item_id);

				return forkJoin
				({
					offer: of(response.offer),
					store: of(response.store),
					item: item_ids.length
						? this.rest_item.search({ csv: { id: item_ids }, limit: item_ids.length })
						: of({ total: 0, data: [] })
				});
			})
		)
		.subscribe(
		{
			next: (response) =>
			{
				this.is_loading = false;
				this.offer = response.offer;

				if (this.offer.store_id)
				{
					let store = response.store.data.find((store) => store.id == this.offer.store_id) as Store | undefined;
					this.store_name = store?.name || 'Todas';
				}

				if (this.offer.item_id)
				{
					let item = response.item.data.find((i) => i.id == this.offer.item_id);
					this.item_name = item?.name || '';
				}

				let names: Record<string, string> = {
					'N_X_M': 'Compra X llevate Z',
					'PERCENT_DISCOUNT': 'Porciento de descuento',
					'AMOUNT_DISCOUNT': 'Monto de descuento',
					'GIFT': 'Regalo',
					'FIXED_PRICE': 'Precio fijo',
				};

				this.spanish_name = names[this.offer.type] || this.offer.type;

				this.active_days = (this.offer.is_valid_sunday ? 'D' : '-') +
					(this.offer.is_valid_monday ? 'L' : '-') +
					(this.offer.is_valid_tuesday ? 'M' : '-') +
					(this.offer.is_valid_wednesday ? 'M' : '-') +
					(this.offer.is_valid_thursday ? 'J' : '-') +
					(this.offer.is_valid_friday ? 'V' : '-') +
					(this.offer.is_valid_saturday ? 'S' : '-');
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}

	deactivate()
	{
		this.sink = this.confirmation.showConfirmAlert(this.offer, 'Desactivar Oferta', '¿Estás seguro de que quieres desactivar esta oferta?', 'Sí', 'No').pipe
		(
			filter((x: ConfirmationResult) => x.accepted),
			mergeMap(() => this.rest_offer.delete({ id: this.offer.id }))
		)
		.subscribe(
		{
			next: () =>
			{
				this.offer.status = 'DELETED';
				this.showSuccess('La oferta se desactivó exitosamente');
			},
			error: (error) =>
			{
				this.rest.showError(error);
			}
		});
	}
}

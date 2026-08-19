import { Component, OnInit } from '@angular/core';
import { forkJoin, mergeMap, of } from 'rxjs';

import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Item, Offer, Store } from '../../modules/shared/RestModels';
import { RouterModule } from '@angular/router';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';
import { PaginationComponent } from '../../components/pagination/pagination.component';
import { LoadingComponent } from '../../components/loading/loading.component';
import { ConfirmationResult, ConfirmationService } from '../../modules/shared/services/confirmation.service';
import { filter } from 'rxjs/operators';

interface CustomOffer extends Offer
{
	active_days: string;
	store_name: string;
	item_name: string;
	spanish_name: string;
	batch_criteria: string;
}

@Component({
	selector: 'app-list-offer',
	imports: [RouterModule, ShortDatePipe, PaginationComponent, LoadingComponent],
	templateUrl: './list-offer.component.html',
	styleUrl: './list-offer.component.css'
})
export class ListOfferComponent extends BaseComponent implements OnInit
{
	rest_offer: RestSimple<Offer> = this.rest.initRestSimple('offer', ['id', 'category_id', 'coupon_code', 'created_by_user_id', 'created', 'gift_item_id', 'hour_end', 'hour_start', 'is_valid_friday', 'is_valid_monday', 'is_valid_saturday', 'is_valid_sunday', 'is_valid_thursday', 'is_valid_tuesday', 'is_valid_wednesday', 'item_id', 'qty', 'store_id', 'type', 'updated_by_user_id', 'updated', 'valid_from', 'valid_thru', 'price_type_id', 'status', 'batch', 'expiration_thru', 'expiration_days']);
	rest_store: RestSimple<Store> = this.rest.initRestSimple('store', ['id', 'name']);
	rest_item: RestSimple<Item> = this.rest.initRestSimple('item', ['id', 'name']);

	search_offer: SearchObject<Offer> = this.rest_offer.getEmptySearch();
	offer_list: CustomOffer[] = [];
	store_list: Store[] = [];

	ngOnInit()
	{
		this.is_loading = true;
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map) =>
			{
				this.search_offer = this.rest_offer.getSearchObject(param_map);
				this.search_offer.limit = this.page_size;
				this.current_page = this.search_offer.page;

				return forkJoin
				({
					offer: this.rest_offer.search(this.search_offer),
					store: this.rest_store.search({ eq: { status: 'ACTIVE' }, limit: 999999 })
				});
			}),
			mergeMap((response) =>
			{
				let item_ids: number[] = [];

				response.offer.data.forEach((offer) =>
				{
					if (offer.item_id && !item_ids.includes(offer.item_id))
						item_ids.push(offer.item_id);

					if (offer.gift_item_id && !item_ids.includes(offer.gift_item_id))
						item_ids.push(offer.gift_item_id);
				});

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
				this.store_list = response.store.data;

				this.offer_list = response.offer.data.map((offer) =>
				{
					let active_days = (offer.is_valid_sunday ? 'D' : '-') +
						(offer.is_valid_monday ? 'L' : '-') +
						(offer.is_valid_tuesday ? 'M' : '-') +
						(offer.is_valid_wednesday ? 'M' : '-') +
						(offer.is_valid_thursday ? 'J' : '-') +
						(offer.is_valid_friday ? 'V' : '-') +
						(offer.is_valid_saturday ? 'S' : '-');

					let store_name = 'Todas';

					if (offer.store_id)
					{
						let store = this.store_list.find((store) => store.id == offer.store_id) as Store | undefined;
						store_name = store?.name || 'Todas';
					}

					let item_name = '';

					if (offer.item_id)
					{
						let item = response.item.data.find((i) => i.id == offer.item_id);
						item_name = item?.name || '';
					}

					let names: Record<string, string> = {
						'N_X_M': 'Compra X llevate Z',
						'PERCENT_DISCOUNT': 'Porciento de descuento',
						'AMOUNT_DISCOUNT': 'Monto de descuento',
						'GIFT': 'Regalo',
						'FIXED_PRICE': 'Precio fijo',
					};

					let spanish_name = names[offer.type] || offer.type;

					let batch_criteria = '';

					if (offer.batch)
						batch_criteria = 'Lote: ' + offer.batch;

					if (offer.expiration_thru)
						batch_criteria = (batch_criteria ? batch_criteria + ' ' : '') + 'Caduca: ' + offer.expiration_thru;

					if (offer.expiration_days)
						batch_criteria = (batch_criteria ? batch_criteria + ' ' : '') + 'Caduca en ' + offer.expiration_days + ' días';

					return { ...offer, active_days, store_name, item_name, spanish_name, batch_criteria };
				});

				this.setPages(this.current_page, response.offer.total);
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}

	delete(offer: CustomOffer)
	{
		this.sink = this.confirmation.showConfirmAlert(offer, 'Desactivar Oferta', '¿Estás seguro de que quieres desactivar esta oferta?', 'Sí', 'No').pipe
		(
			filter((x: ConfirmationResult) => x.accepted),
			mergeMap(() => this.rest_offer.delete({ id: offer.id }))
		)
		.subscribe(
		{
			next: () =>
			{
				this.offer_list = this.offer_list.filter(o => o.id !== offer.id);
				this.showSuccess('La oferta se desactivó exitosamente');
			},
			error: (error) =>
			{
				this.rest.showError(error);
			}
		});
	}
}

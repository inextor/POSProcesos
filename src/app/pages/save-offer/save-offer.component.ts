import { Component, OnInit } from '@angular/core';

import { RestSimple } from '../../modules/shared/services/Rest';
import { Offer } from '../../modules/shared/RestModels';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from '../../components/loading/loading.component';
import { FormsModule } from '@angular/forms';
import { StoreSearchComponent } from '../../modules/shared/components/store-search/store-search.component';
import { PriceTypeSearchComponent } from '../../modules/shared/components/price-type-search/price-type-search.component';
import { ItemSearchComponent } from '../../modules/shared/components/item-search/item-search.component';
import { RouterModule } from '@angular/router';

type DayKey = 'is_valid_sunday' | 'is_valid_monday' | 'is_valid_tuesday' | 'is_valid_wednesday' | 'is_valid_thursday' | 'is_valid_friday' | 'is_valid_saturday';

@Component({
	selector: 'app-save-offer',
	imports: [LoadingComponent, FormsModule, StoreSearchComponent, PriceTypeSearchComponent, ItemSearchComponent, RouterModule],
	templateUrl: './save-offer.component.html',
	styleUrl: './save-offer.component.css'
})
export class SaveOfferComponent extends BaseComponent implements OnInit
{
	offer: Offer = GetEmpty.offer();
	rest_offer: RestSimple<Offer> = this.rest.initRestSimple('offer', ['id', 'category_id', 'coupon_code', 'created_by_user_id', 'created', 'gift_item_id', 'hour_end', 'hour_start', 'is_valid_friday', 'is_valid_monday', 'is_valid_saturday', 'is_valid_sunday', 'is_valid_thursday', 'is_valid_tuesday', 'is_valid_wednesday', 'item_id', 'qty', 'store_id', 'type', 'updated_by_user_id', 'updated', 'valid_from', 'valid_thru', 'price_type_id', 'status', 'batch', 'expiration_thru', 'expiration_days']);

	ngOnInit()
	{
		this.is_loading = false;
	}

	save($event: Event)
	{
		if (!this.offer.item_id && !this.offer.category_id && !this.offer.tag && !this.offer.batch && !this.offer.expiration_thru && !this.offer.expiration_days)
		{
			this.rest.showError('Se debe especificar al menos uno de: Artículo, Categoría, Etiqueta, Lote o Caducidad');
			return;
		}

		if (this.offer.expiration_thru && this.offer.expiration_days)
		{
			this.rest.showError('No se puede especificar una fecha de caducidad y un número de días a la vez');
			return;
		}

		if (!this.offer.coupon_code)
		{
			this.rest.showError('El código del cupón es obligatorio');
			return;
		}

		this.is_loading = true;

		this.subs.sink = this.rest_offer.create(this.offer).subscribe(
		{
			next: () =>
			{
				this.is_loading = false;
				this.showSuccess('La oferta se guardó exitosamente');
				this.location.back();
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}

	toggleValue(key: DayKey)
	{
		if (this.offer[key])
		{
			this.offer[key] = 0;
		}
		else
		{
			this.offer[key] = 1;
		}
	}
}

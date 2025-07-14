import { Component, OnInit, OnDestroy, Injector } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestService } from '../../modules/shared/services/rest.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { OrderInfo } from '../../modules/shared/Models';
import { Order } from '../../modules/shared/RestModels';
import { SearchObject, Rest } from '../../modules/shared/services/Rest';
import { filter, mergeMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { LoadingComponent } from '../../components/loading/loading.component';
import { PaginationComponent } from '../../components/pagination/pagination.component';
import { ConfirmationResult, ConfirmationService } from '../../modules/shared/services/confirmation.service';

@Component({
	selector: 'app-list-ecommerce-order',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterModule, HeaderComponent, LoadingComponent, PaginationComponent],
	templateUrl: './list-ecommerce-order.component.html',
	styleUrl: './list-ecommerce-order.component.css'
})
export class ListEcommerceOrderComponent extends BaseComponent implements OnInit, OnDestroy {

	public rest_ecommerce_order: Rest<Order,OrderInfo> = this.rest.initRest<Order,OrderInfo>('order_info',['id','client_name','store_id','created','closed']);
	public ecommerce_orders: OrderInfo[] = [];
	public search_object: SearchObject<Order> = this.rest_ecommerce_order.getEmptySearch();



	ngOnInit(): void
{
		this.path = 'list-ecommerce-order';
		this.titleService.setTitle('Listado de Ordenes de Ecommerce');
		this.subs.sink = this.route.queryParamMap.subscribe(queryParams => {
			this.search_object = this.rest_ecommerce_order.getSearchObject(queryParams);
			this.search(this.search_object);
		});
	}

	override search(search_object: SearchObject<OrderInfo>): void {
		this.is_loading = true;
		this.sink = this.rest_ecommerce_order.search(search_object).subscribe
		({
			next: (response: any) => {
				this.ecommerce_orders = response.data;
				this.setPages(response.current_page, response.total_items);
				this.is_loading = false;
			},
			error: (error: any) => {
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

	delete(id: number): void
	{
		this.sink = this.confirmation.showConfirmAlert(null, 'Confirmación', '¿Estás seguro de que quieres eliminar esta orden?', 'Sí', 'No').pipe
		(
			filter((x: ConfirmationResult)=>x.accepted),
			mergeMap((response)=>this.rest_ecommerce_order.delete({id: id} as Order))
		)
		.subscribe
		({
			next: () =>
			{
				this.showSuccess('Orden eliminada exitosamente');
				this.search(this.search_object);
			},
			error: (error: any) =>
			{
				this.showError(error);
				this.is_loading = false;
			}
		});

	}
}

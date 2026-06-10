import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { filter, mergeMap } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { ConsignmentReceivedInfo } from '../../modules/shared/Models';
import { LoadingComponent } from '../../components/loading/loading.component';
import { PaginationComponent } from '../../components/pagination/pagination.component';

@Component({
	selector: 'app-list-consignment-received',
	imports: [CommonModule, FormsModule, RouterModule, LoadingComponent, PaginationComponent],
	templateUrl: './list-consignment-received.component.html',
	styleUrl: './list-consignment-received.component.css'
})
export class ListConsignmentReceivedComponent extends BaseComponent implements OnInit
{
	list: ConsignmentReceivedInfo[] = [];

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit()
	{
		this.path = '/list-consignment-received';
		this.setTitle('Consignaciones Recibidas');

		this.subs.sink = this.route.queryParamMap.subscribe(() =>
		{
			this.is_loading = true;
			let rest = this.rest.initRestSimple<ConsignmentReceivedInfo>('consignment_received_info');

			this.subs.sink = rest.search({ limit: 99999, sort_order: ['id_DESC'] })
			.subscribe((response) =>
			{
				this.list = response.data;
				this.setPages(0, response.total);
				this.is_loading = false;
			}, (error) => this.showError(error));
		});
	}

	addToStock(cr: ConsignmentReceivedInfo)
	{
		this.subs.sink = this.confirmation.showConfirmAlert(
			cr,
			'Agregar Inventario',
			'Los artículos se agregarán al inventario de la sucursal. ¿Continuar?'
		)
		.pipe(
			filter((r) => r.accepted),
			mergeMap(() => this.rest.update('addConsignmentToStock', { consignment_received_id: cr.consignment_received.id }))
		)
		.subscribe({
			next: () =>
			{
				cr.consignment_received.stock_status = 'ADDED_TO_STOCK';
				this.showSuccess('Inventario agregado exitosamente');
			},
			error: (error) => this.showError(error)
		});
	}

	onPageChange(page: number)
	{
		this.router.navigate([], { queryParams: { page }, queryParamsHandling: 'merge' });
	}
}

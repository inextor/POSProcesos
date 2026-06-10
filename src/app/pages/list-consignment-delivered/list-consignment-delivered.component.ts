import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { ConsignmentDeliveredInfo } from '../../modules/shared/Models';
import { LoadingComponent } from '../../components/loading/loading.component';
import { PaginationComponent } from '../../components/pagination/pagination.component';

@Component({
	selector: 'app-list-consignment-delivered',
	imports: [CommonModule, FormsModule, RouterModule, LoadingComponent, PaginationComponent],
	templateUrl: './list-consignment-delivered.component.html',
	styleUrl: './list-consignment-delivered.component.css'
})
export class ListConsignmentDeliveredComponent extends BaseComponent implements OnInit
{
	list: ConsignmentDeliveredInfo[] = [];

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit()
	{
		this.path = '/list-consignment-delivered';
		this.setTitle('Consignaciones Entregadas');

		this.subs.sink = this.route.queryParamMap.subscribe(() =>
		{
			this.is_loading = true;
			let rest = this.rest.initRestSimple<ConsignmentDeliveredInfo>('consignment_delivered_info');

			this.subs.sink = rest.search({ limit: 99999, sort_order: ['id_DESC'] })
			.subscribe((response) =>
			{
				this.list = response.data;
				this.setPages(0, response.total);
				this.is_loading = false;
			}, (error) => this.showError(error));
		});
	}

	onPageChange(page: number)
	{
		this.router.navigate([], { queryParams: { page }, queryParamsHandling: 'merge' });
	}
}

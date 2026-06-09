import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { ConsignmentReport } from '../../modules/shared/Models';
import { Store } from '../../modules/shared/RestModels';
import { LoadingComponent } from '../../components/loading/loading.component';

@Component({
	selector: 'app-consignment-report',
	imports: [CommonModule, FormsModule, RouterModule, LoadingComponent],
	templateUrl: './consignment-report.component.html',
	styleUrl: './consignment-report.component.css'
})
export class ConsignmentReportComponent extends BaseComponent implements OnInit
{
	override path = '/consignment-report';
	report: ConsignmentReport | null = null;
	store_list: Store[] = [];
	filter_store_id: number | null = null;
	filter_start: string = '';
	filter_end: string = '';

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit()
	{
		this.setTitle('Reporte de Consignaciones');

		let rest_store = this.rest.initRestSimple<Store>('store');
		this.subs.sink = rest_store.search({ limit: 9999, sort_order: ['name_ASC'] })
		.subscribe((response) =>
		{
			this.store_list = response.data;
			this.search();
		});
	}

	override search()
	{
		this.is_loading = true;
		let rest_ca = this.rest.initRestSimple<any>('consignment_actions');

		let params: any = { action: 'getConsignmentReport' };

		if (this.filter_store_id)
			params.store_id = this.filter_store_id;

		if (this.filter_start)
			params.start_date = this.filter_start;

		if (this.filter_end)
			params.end_date = this.filter_end;

		this.subs.sink = rest_ca.search(params)
		.subscribe((response: any) =>
		{
			this.report = response.data;
			this.is_loading = false;
		}, (error: any) =>
		{
			this.showError(error);
			this.is_loading = false;
		});
	}
}

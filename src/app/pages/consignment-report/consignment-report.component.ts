import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { ConsignmentReport, ConsignmentDeliveredInfo, ConsignmentReceivedInfo } from '../../modules/shared/Models';
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

		let rest_received = this.rest.initRestSimple<ConsignmentReceivedInfo>('consignment_received_info');
		let rest_delivered = this.rest.initRestSimple<ConsignmentDeliveredInfo>('consignment_delivered_info');

		let search_params = { limit: 99999, sort_order: ['id_DESC'] };

		this.subs.sink = forkJoin({
			received_response: rest_received.search(search_params),
			delivered_response: rest_delivered.search(search_params)
		})
		.subscribe({
			next: ({ received_response, delivered_response }) =>
			{
				let received_infos: ConsignmentReceivedInfo[] = received_response.data || [];
				let delivered_infos: ConsignmentDeliveredInfo[] = delivered_response.data || [];

				let start: Date | null = this.filter_start ? new Date(this.filter_start + 'T00:00:00') : null;
				let end: Date | null = this.filter_end ? new Date(this.filter_end + 'T23:59:59') : null;

				if (this.filter_store_id)
				{
					received_infos = received_infos.filter(r => r.consignment_received.store_id === this.filter_store_id);
					delivered_infos = delivered_infos.filter(d => d.consignment_delivered.store_id === this.filter_store_id);
				}

				if (start)
				{
					received_infos = received_infos.filter(r => new Date(r.consignment_received.created) >= start!);
					delivered_infos = delivered_infos.filter(d => new Date(d.consignment_delivered.created) >= start!);
				}

				if (end)
				{
					received_infos = received_infos.filter(r => new Date(r.consignment_received.created) <= end!);
					delivered_infos = delivered_infos.filter(d => new Date(d.consignment_delivered.created) <= end!);
				}

				this.report = {
					received: received_infos.map(r => r.consignment_received),
					received_items: received_infos.flatMap(r => r.items.map(i => i.consignment_received_item)),
					delivered: delivered_infos.map(d => d.consignment_delivered),
					delivered_items: delivered_infos.flatMap(d => d.items.map(i => i.consignment_delivered_item))
				};

				this.is_loading = false;
			},
			error: (error: any) =>
			{
				this.showError(error);
				this.is_loading = false;
			}
		});
	}
}

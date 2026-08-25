import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RequisitionItemInfo, RequisitionInfo } from '../../modules/shared/Models';
import { Utils } from '../../modules/shared/Utils';
import { LoadingComponent } from '../../components/loading/loading.component';

interface CViewRequisitionItem extends RequisitionItemInfo
{
	item_name: string;
	item_code: string | null;
	category_name: string | null;
	requisition_item_status_label: string;
}

interface CViewRequisitionInfo extends RequisitionInfo
{
	requisition_id: number;
	status_label: string;
	status_class: string;
	approved_status_label: string;
	required_by_display: string;
	created_display: string;
	created_by_display: string;
	items: CViewRequisitionItem[];
}

const STATUS_LABELS: Record<string, string> =
{
	PENDING: 'Pendiente',
	APPROVED: 'Aprobada',
	SHIPPED: 'Enviada',
	CLOSED: 'Cerrada',
	CANCELLED: 'Cancelada',
	NOT_APPROVED: 'No aprobada',
};

const STATUS_CLASSES: Record<string, string> =
{
	PENDING: 'badge bg-warning text-dark',
	APPROVED: 'badge bg-primary',
	SHIPPED: 'badge bg-info text-dark',
	CLOSED: 'badge bg-secondary',
	CANCELLED: 'badge bg-danger',
	NOT_APPROVED: 'badge bg-danger',
};

const ITEM_STATUS_LABELS: Record<string, string> =
{
	ACTIVE: 'Activo',
	DELETED: 'Eliminado',
};

@Component({
	selector: 'app-view-requisition',
	templateUrl: './view-requisition.component.html',
	styleUrl: './view-requisition.component.css',
	imports: [CommonModule, RouterModule, LoadingComponent],
})
export class ViewRequisitionComponent extends BaseComponent implements OnInit
{
	override path = '/view-requisition';
	info: CViewRequisitionInfo | null = null;

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit()
	{
		this.setTitle('Requisición');

		this.subs.sink = this.route.paramMap
		.pipe(
			mergeMap((params) =>
			{
				let id_str = params.get('id');
				if (!id_str)
				{
					this.router.navigate(['/']);
					return of(null);
				}

				this.is_loading = true;
				let rest = this.rest.initRestSimple<RequisitionInfo>('requisition_info');
				return rest.get(parseInt(id_str));
			})
		)
		.subscribe({
			next: (response) =>
			{
				if (!response) return;

				let requisition = response.requisition;
				let status = requisition.status || '';
				let approved_status = requisition.approved_status || '';

				this.info =
				{
					...response,
					requisition_id: requisition.id,
					status_label: STATUS_LABELS[status] || status,
					status_class: STATUS_CLASSES[status] || 'badge bg-secondary',
					approved_status_label: STATUS_LABELS[approved_status] || approved_status,
					required_by_display: this.formatTimestamp(requisition.required_by_timestamp),
					created_display: this.formatTimestamp(requisition.created),
					created_by_display: response.user?.name || '',
					items: (response.items || []).map((item) =>
					({
						...item,
						item_name: item.item?.name || '',
						item_code: item.item?.code || null,
						category_name: item.category?.name || null,
						requisition_item_status_label: ITEM_STATUS_LABELS[item.requisition_item?.status || ''] || (item.requisition_item?.status || ''),
					})),
				};

				this.setTitle('Requisición #' + requisition.id);
				this.is_loading = false;
			},
			error: (error) =>
			{
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

	get totalQty(): number
	{
		if (!this.info) return 0;
		return this.info.items.reduce((sum, item) => sum + (item.requisition_item?.qty || 0), 0);
	}

	private formatTimestamp(value: string | Date | null | undefined): string
	{
		if (!value) return '';
		if ((value as any) instanceof Date) return Utils.getLocalMysqlStringFromDate(value as any);
		return ('' + value).replace('T', ' ');
	}

	goBack()
	{
		window.history.back();
	}
}

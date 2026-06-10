import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { ConsignmentReceivedInfo } from '../../modules/shared/Models';
import { LoadingComponent } from '../../components/loading/loading.component';

interface SettleItem {
	id: number;
	item_name: string;
	qty: number;
	unitary_cost: number;
	settled_qty: number;
	returned_qty: number;
}

@Component({
	selector: 'app-view-consignment-received',
	imports: [CommonModule, FormsModule, RouterModule, LoadingComponent],
	templateUrl: './view-consignment-received.component.html',
	styleUrl: './view-consignment-received.component.css'
})
export class ViewConsignmentReceivedComponent extends BaseComponent implements OnInit
{
	override path = '/view-consignment-received';
	info: ConsignmentReceivedInfo | null = null;

	show_settle_form: boolean = false;
	settle_items: SettleItem[] = [];
	purchase_folio: string = '';
	purchase_due_date: string = '';
	is_settling: boolean = false;

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit()
	{
		this.setTitle('Consignación Recibida');

		this.subs.sink = this.route.paramMap
		.pipe(
			mergeMap((params) =>
			{
				let id_str = params.get('id');
				if( !id_str )
				{
					this.router.navigate(['/list-consignment-received']);
					return of(null);
				}

				this.is_loading = true;
				let rest = this.rest.initRestSimple<ConsignmentReceivedInfo>('consignment_received_info');
				return rest.get(parseInt(id_str));
			})
		)
		.subscribe({
			next: (response) =>
			{
				if( !response ) return;
				this.info = response;
				this.is_loading = false;
			},
			error: (error) => this.showError(error)
		});
	}

	addToStock()
	{
		if( !this.info ) return;

		this.subs.sink = this.confirmation.showConfirmAlert(
			this.info,
			'Agregar Inventario',
			'Los artículos se agregarán al inventario de la sucursal. ¿Continuar?'
		)
		.pipe(
			filter((r) => r.accepted),
			mergeMap(() => this.rest.update('addConsignmentToStock', { consignment_received_id: this.info!.consignment_received.id }))
		)
		.subscribe({
			next: (response: any) =>
			{
				if( this.info )
				{
					this.info.consignment_received.stock_status = 'ADDED_TO_STOCK';
				}
				this.showSuccess('Inventario agregado exitosamente');
			},
			error: (error) => this.showError(error)
		});
	}

	openSettleForm()
	{
		if( !this.info ) return;

		this.settle_items = this.info.items.map((i) => ({
			id: i.consignment_received_item.id,
			item_name: i.item?.name || 'N/A',
			qty: i.consignment_received_item.qty,
			unitary_cost: i.consignment_received_item.unitary_cost,
			settled_qty: i.consignment_received_item.qty,
			returned_qty: 0
		}));

		this.purchase_folio = this.info.consignment_received.reference || '';
		this.purchase_due_date = '';
		this.show_settle_form = true;
	}

	cancelSettle()
	{
		this.show_settle_form = false;
		this.settle_items = [];
		this.purchase_folio = '';
		this.purchase_due_date = '';
	}

	getSettleTotal(): number
	{
		return this.settle_items.reduce((sum, i) => sum + (i.settled_qty * i.unitary_cost), 0);
	}

	getItemRemaining(item: SettleItem): number
	{
		return item.qty - item.settled_qty - item.returned_qty;
	}

	isSettleValid(): boolean
	{
		if( this.settle_items.length == 0 ) return false;
		if( this.getSettleTotal() > 0 && !this.purchase_folio ) return false;
		for( const item of this.settle_items )
		{
			if( this.getItemRemaining(item) < 0 ) return false;
		}
		return true;
	}

	settle()
	{
		if( !this.info || !this.isSettleValid() ) return;

		const total_settled = this.getSettleTotal();
		const items_with_action = this.settle_items.filter(i => i.settled_qty > 0 || i.returned_qty > 0);

		if( items_with_action.length == 0 )
		{
			this.showError('Debe liquidar o devolver al menos un artículo');
			return;
		}

		const payload: any = {
			consignment_received_id: this.info.consignment_received.id,
			return_items: items_with_action.map(i => ({
				id: i.id,
				settled_qty: i.settled_qty,
				returned_qty: i.returned_qty
			}))
		};

		if( total_settled > 0 )
		{
			payload.purchase = {
				folio: this.purchase_folio,
				due_date: this.purchase_due_date || null,
				store_id: this.info.consignment_received.store_id,
				provider_user_id: this.info.consignment_received.provider_user_id,
				note: 'Liquidación de consignación recibida #' + this.info.consignment_received.id
			};
		}

		this.is_settling = true;

		this.subs.sink = this.confirmation.showConfirmAlert(
			payload,
			'Liquidar Consignación',
			`Se liquidarán los artículos marcados. ¿Continuar?`
		)
		.pipe(
			filter((r) => r.accepted),
			mergeMap(() => this.rest.update('settleConsignmentReceived', payload))
		)
		.subscribe({
			next: (response: any) =>
			{
				this.showSuccess('Consignación liquidada exitosamente');
				this.is_settling = false;
				this.show_settle_form = false;
				this.reload();
			},
			error: (error) =>
			{
				this.is_settling = false;
				this.showError(error);
			}
		});
	}

	reload()
	{
		if( !this.info ) return;

		this.is_loading = true;
		let rest = this.rest.initRestSimple<ConsignmentReceivedInfo>('consignment_received_info');
		this.subs.sink = rest.get(this.info.consignment_received.id)
		.subscribe({
			next: (response) =>
			{
				this.info = response;
				this.is_loading = false;
			},
			error: (error) => this.showError(error)
		});
	}

	getStatusText(): string
	{
		if( !this.info ) return '';
		const s = this.info.consignment_received.status;
		return s == 'ACTIVE' ? 'Activa' : s == 'SETTLED' ? 'Liquidada' : 'Eliminada';
	}

	getStockStatusText(): string
	{
		if( !this.info ) return '';
		const s = this.info.consignment_received.stock_status;
		return s == 'ADDED_TO_STOCK' ? 'En inventario' : 'Pendiente';
	}
}

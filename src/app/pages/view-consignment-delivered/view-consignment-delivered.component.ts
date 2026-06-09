import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { ConsignmentDeliveredInfo, OrderInfo } from '../../modules/shared/Models';
import { LoadingComponent } from '../../components/loading/loading.component';

interface SettleItemDelivered {
	id: number;
	item_name: string;
	qty: number;
	unitary_price: number;
	sold_qty: number;
	returned_qty: number;
	partial_sale: 'YES' | 'NO';
}

@Component({
	selector: 'app-view-consignment-delivered',
	imports: [CommonModule, FormsModule, RouterModule, LoadingComponent],
	templateUrl: './view-consignment-delivered.component.html',
	styleUrl: './view-consignment-delivered.component.css'
})
export class ViewConsignmentDeliveredComponent extends BaseComponent implements OnInit
{
	override path = '/view-consignment-delivered';
	info: ConsignmentDeliveredInfo | null = null;
	linked_order_info: OrderInfo | null = null;

	show_settle_form: boolean = false;
	settle_items: SettleItemDelivered[] = [];
	is_settling: boolean = false;

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit()
	{
		this.setTitle('Consignación Entregada');

		this.subs.sink = this.route.paramMap
		.pipe(
			mergeMap((params) =>
			{
				let id_str = params.get('id');
				if( !id_str )
				{
					this.router.navigate(['/list-consignment-delivered']);
					return of(null);
				}

				this.is_loading = true;
				let rest = this.rest.initRestSimple<ConsignmentDeliveredInfo>('consignment_delivered_info');
				return rest.get(parseInt(id_str));
			})
		)
		.subscribe({
				next: (response) =>
				{
					if( !response ) return;
					this.info = response;
					this.loadLinkedOrder();
					this.is_loading = false;
				},
			error: (error) => this.showError(error)
		});
	}

	openSettleForm()
	{
		if( !this.info ) return;

		this.settle_items = this.info.items.map((i) => ({
			id: i.consignment_delivered_item.id,
			item_name: i.item?.name || 'N/A',
			qty: i.consignment_delivered_item.qty,
			unitary_price: i.consignment_delivered_item.unitary_price,
			sold_qty: i.consignment_delivered_item.sold_qty,
			returned_qty: i.consignment_delivered_item.returned_qty,
			partial_sale: i.item?.partial_sale ?? 'NO'
		}));

		this.show_settle_form = true;
	}

	cancelSettle()
	{
		this.show_settle_form = false;
		this.settle_items = [];
	}

	getSoldTotal(): number
	{
		return this.settle_items.reduce((sum, i) => sum + (i.sold_qty * i.unitary_price), 0);
	}

	getItemRemaining(item: SettleItemDelivered): number
	{
		return item.qty - item.sold_qty - item.returned_qty;
	}

	isSettleValid(): boolean
	{
		if( this.settle_items.length == 0 ) return false;
		for( const item of this.settle_items )
		{
			if( this.getItemRemaining(item) < 0 ) return false;
		}
		return true;
	}

	settle()
	{
		if( !this.info || !this.isSettleValid() ) return;

		const items_with_action = this.settle_items.filter(i => i.sold_qty > 0 || i.returned_qty > 0);

		if( items_with_action.length == 0 )
		{
			this.showError('Debe marcar al menos un artículo como vendido o devuelto');
			return;
		}

		const payload: any = {
			consignment_delivered_id: this.info.consignment_delivered.id,
			return_items: items_with_action.map(i => ({
				id: i.id,
				sold_qty: i.sold_qty,
				returned_qty: i.returned_qty
			}))
		};

		this.is_settling = true;

		this.subs.sink = this.confirmation.showConfirmAlert(
			payload,
			'Liquidar Consignación',
			'Se liquidarán los artículos vendidos y se devolverán los no vendidos al inventario. ¿Continuar?'
			)
			.pipe(
				filter((r) => r.accepted),
				mergeMap(() => this.rest.updatePath('consignment_delivered_info.php?action=settle', payload))
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
		let rest = this.rest.initRestSimple<ConsignmentDeliveredInfo>('consignment_delivered_info');
		this.subs.sink = rest.get(this.info.consignment_delivered.id)
		.subscribe({
				next: (response) =>
				{
					this.info = response;
					this.loadLinkedOrder();
					this.is_loading = false;
				},
			error: (error) => this.showError(error)
		});
	}

	getStatusText(): string
	{
		if( !this.info ) return '';
		const s = this.info.consignment_delivered.status;
		return s == 'ACTIVE' ? 'Activa' : s == 'SETTLED' ? 'Liquidada' : 'Eliminada';
	}

	loadLinkedOrder()
	{
		this.linked_order_info = null;

		if( !this.info?.consignment_delivered?.id )
			return;

		let rest = this.rest.initRestSimple<OrderInfo>('order_info');
		this.subs.sink = rest.search({
			search_extra: {
				consignment_delivered_id: this.info.consignment_delivered.id
			},
			limit: 1
		})
		.subscribe({
			next: (response) =>
			{
				this.linked_order_info = response.data.length ? response.data[0] : null;
			},
			error: (error) => this.showError(error)
		});
	}
}

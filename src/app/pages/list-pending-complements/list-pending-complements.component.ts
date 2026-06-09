import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';
import { LoadingComponent } from '../../components/loading/loading.component';
import { ModalComponent } from '../../components/modal/modal.component';

export interface PendingComplement
{
	payment_id: number;
	payment_amount: number;
	payment_date: string;
	payment_created: string;
	order_id: number;
	order_total: number;
	order_discount: number;
	sat_factura_id: number;
	sat_receptor_rfc: string;
	sat_razon_social: string;
	sat_receptor_email: string;
	store_consecutive: number;
	sat_serie: string;
	sat_serie_consecutive: number;
}

@Component({
	selector: 'app-list-pending-complements',
	templateUrl: './list-pending-complements.component.html',
	styleUrls: ['./list-pending-complements.component.css'],
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		LoadingComponent,
		ModalComponent
	]
})
export class ListPendingComplementsComponent extends BaseComponent implements OnInit
{
	pending_complements: PendingComplement[] = [];
	external_base_url: string = this.rest.getExternalAppUrl();

	selected_pago: PendingComplement | null = null;
	show_facturar_pago: boolean = false;
	fecha_pago: string = '';
	sat_serie: string = '';
	pago_factura_email: string = '';

	ngOnInit(): void
	{
		this.setTitle('Complementos de Pago Pendientes');
		this.is_loading = true;
		this.loadPendingComplements();
	}

	loadPendingComplements()
	{
		this.is_loading = true;
		this.subs.sink = this.rest.getPendingComplements().subscribe({
			next: (data: any[]) => {
				this.pending_complements = data as PendingComplement[];
				this.is_loading = false;
			},
			error: (error) => {
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

	showFacturarPago(p: PendingComplement)
	{
		this.selected_pago = p;
		
		let fecha = p.payment_date ? new Date(p.payment_date) : new Date(p.payment_created);
		fecha.setSeconds(0);
		this.fecha_pago = Utils.getLocalMysqlStringFromDate(fecha).replace(' ', 'T');

		this.sat_serie = p.sat_serie || 'A';
		this.pago_factura_email = p.sat_receptor_email || '';
		this.show_facturar_pago = true;
	}

	facturarElPago(evt: Event)
	{
		evt.preventDefault();
		if (!this.selected_pago) return;

		let d = Utils.getLocalDateFromMysqlString(this.fecha_pago);
		if (!d) {
			this.showError('La fecha de pago no es válida');
			return;
		}
		let fecha_de_pago = Utils.getMysqlStringFromLocalDate(d);
		fecha_de_pago = fecha_de_pago.replace(' ','T');

		this.is_loading = true;
		this.subs.sink = this.rest.updatePath('facturar_pago', {
			payment_id: this.selected_pago.payment_id,
			email: this.pago_factura_email,
			fecha_de_pago,
			sat_serie: this.sat_serie
		}).subscribe({
			next: (result) => {
				this.is_loading = false;
				this.show_facturar_pago = false;
				this.showSuccess('El complemento de pago se facturó correctamente');
				this.loadPendingComplements();
			},
			error: (error) => {
				this.is_loading = false;
				this.showError(error);
			}
		});
	}
}

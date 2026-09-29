import { Component, Injector, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { filter, mergeMap } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple } from '../../modules/shared/services/Rest';
import { Order, Sat_Factura } from '../../modules/shared/RestModels';
import { AttachmentInfo } from '../../modules/shared/Models';
import { LoadingComponent } from '../loading/loading.component';
import { AttachmentUploaderComponent } from '../attachment-uploader/attachment-uploader.component';

export interface CrearSatFacturaResponse {
	success: boolean;
	sat_factura_id: number;
	order_id: number;
	type: Sat_Factura['type'];
	uuid: string;
	serie: string | null;
	folio: string | null;
	message: string;
}

interface FacturaXmlInfo {
	uuid: string;
	serie: string;
	folio: string;
}

interface COrder extends Order {
	client_display_name: string;
}

@Component({
	selector: 'app-crear-sat-factura',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		LoadingComponent,
		AttachmentUploaderComponent
	],
	templateUrl: './crear-sat-factura.component.html',
	styleUrl: './crear-sat-factura.component.css'
})
export class CrearSatFacturaComponent extends BaseComponent implements OnInit {
	@Input() initial_order_id: number | null = null;

	search_order: string | number = '';
	searching: boolean = false;
	is_creating: boolean = false;

	selected_order: COrder | null = null;
	show_order_warning: boolean = false;
	order_warning_text: string = '';

	xml_attachment_id: number | null = null;
	pdf_attachment_id: number | null = null;
	xml_attachment_info: AttachmentInfo | null = null;
	pdf_attachment_info: AttachmentInfo | null = null;

	factura_info: FacturaXmlInfo | null = null;

	factura_type: Sat_Factura['type'] = 'NORMAL';
	factura_type_array: Sat_Factura['type'][] = ['NORMAL', 'COMPLEMENTO_PAGO', 'POR_PERIODO', 'NOTA_CREDITO', 'PAGO_PARCIAL', 'DESCONOCIDO'];

	created_response: CrearSatFacturaResponse | null = null;
	can_submit: boolean = false;

	rest_order!: RestSimple<Order>;
	http!: HttpClient;

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit(): void {
		this.rest_order = this.rest.initRestSimple<Order>('order');
		this.http = this.injector.get(HttpClient);

		let route_order_id: string | null = null;
		try {
			route_order_id = this.route.snapshot.paramMap.get('order_id');
		} catch {
			route_order_id = null;
		}

		if (this.initial_order_id) {
			this.search_order = '' + this.initial_order_id;
			setTimeout(() => this.searchOrder(), 0);
		} else if (route_order_id) {
			this.search_order = route_order_id;
			setTimeout(() => this.searchOrder(), 0);
		}
		this.updateCanSubmit();
	}

	searchOrder(): void {
		let search_str = (this.search_order ?? '').toString().trim();

		if (search_str === '') {
			this.showError('Por favor ingrese un número de orden');
			return;
		}

		let order_id = parseInt(search_str);

		if (isNaN(order_id)) {
			this.showError('El número de orden debe ser un número válido');
			return;
		}

		this.searching = true;
		this.selected_order = null;
		this.show_order_warning = false;
		this.order_warning_text = '';
		this.resetFiles();
		this.updateCanSubmit();

		this.subs.sink = this.rest_order.get(order_id).subscribe({
			next: (order: Order) => {
				this.searching = false;

				if (!order) {
					this.showError('No se encontró una orden con ese ID');
					return;
				}

				let display = order as COrder;
				display.client_display_name = order.client_name || 'Cliente #' + (order.client_user_id || 'N/A');
				this.selected_order = display;

				if (display.status !== 'CLOSED') {
					this.show_order_warning = true;
					this.order_warning_text = 'La orden no está cerrada (estatus: ' + display.status + '). Se puede crear la factura de todos modos.';
				} else if (display.sat_factura_id) {
					this.show_order_warning = true;
					this.order_warning_text = 'Esta orden ya tiene una factura SAT asignada (ID: ' + display.sat_factura_id + '). Se creará una factura adicional.';
				}
				this.updateCanSubmit();
			},
			error: (error) => {
				this.searching = false;
				this.showError(error);
			}
		});
	}

	onXmlAttachmentChange(attachment_info: AttachmentInfo): void {
		this.xml_attachment_info = attachment_info;
		this.xml_attachment_id = attachment_info.attachment.id;
		this.parseXmlFromAttachment(attachment_info);
		this.updateCanSubmit();
	}

	onPdfAttachmentChange(attachment_info: AttachmentInfo): void {
		this.pdf_attachment_info = attachment_info;
		this.pdf_attachment_id = attachment_info.attachment.id;
		this.updateCanSubmit();
	}

	onFacturaTypeChange(): void {
		this.updateCanSubmit();
	}

	parseXmlFromAttachment(attachment_info: AttachmentInfo): void {
		let url = this.rest.getFilePath(attachment_info.attachment.id);

		fetch(url, { credentials: 'include' })
			.then((response) => response.text())
			.then((xml_string) => {
				try {
					let parser = new DOMParser();
					let xml_doc = parser.parseFromString(xml_string, 'text/xml');
					let parse_error = xml_doc.querySelector('parsererror');

					if (parse_error) {
						this.showError('Error al parsear el XML');
						return;
					}

					let timbre = xml_doc.getElementsByTagName('tfd:TimbreFiscalDigital')[0] || xml_doc.getElementsByTagName('TimbreFiscalDigital')[0];
					let comprobante = xml_doc.getElementsByTagName('cfdi:Comprobante')[0] || xml_doc.getElementsByTagName('Comprobante')[0];

					if (!timbre || !comprobante) {
						this.showWarning('No se pudo extraer toda la información del XML. El XML podría no ser válido.');
						return;
					}

					this.factura_info = {
						uuid: timbre.getAttribute('UUID') || '',
						serie: comprobante.getAttribute('Serie') || '',
						folio: comprobante.getAttribute('Folio') || ''
					};
				} catch (error) {
					console.error(error);
					this.showError('Error al leer el archivo XML');
				}
			})
			.catch((error) => {
				console.error(error);
				this.showError('Error al obtener el archivo XML');
			});
	}

	updateCanSubmit(): void {
		this.can_submit = !!this.selected_order && !!this.xml_attachment_id && !!this.pdf_attachment_id && !!this.factura_type && !this.is_creating;
	}

	crearSatFactura(): void {
		if (!this.selected_order) {
			this.showError('Debe seleccionar una orden');
			return;
		}

		if (!this.xml_attachment_id || !this.pdf_attachment_id) {
			this.showError('Debe subir ambos archivos primero (PDF y XML)');
			return;
		}

		if (!this.factura_type) {
			this.showError('Debe seleccionar el tipo de factura');
			return;
		}

		let payload: Record<string, number | string> = {
			xml_attachment_id: this.xml_attachment_id,
			pdf_attachment_id: this.pdf_attachment_id,
			order_id: this.selected_order.id,
			type: this.factura_type
		};

		if (this.selected_order.billing_data_id) {
			payload['billing_data_id'] = this.selected_order.billing_data_id;
		}

		this.subs.sink = this.confirmation
			.showConfirmAlert(payload, 'Crear SAT Factura', 'Se creará una factura SAT tipo ' + this.factura_type + ' para la orden #' + this.selected_order.id + '. ¿Desea continuar?', 'Crear', 'Cancelar')
			.pipe(
				filter((response) => response.accepted),
				mergeMap(() => {
					this.is_creating = true;
					this.updateCanSubmit();
					return this.rest.crearSatFactura(payload as { xml_attachment_id: number; pdf_attachment_id: number; order_id: number; type: string; billing_data_id?: number });
				})
			)
			.subscribe({
				next: (response: CrearSatFacturaResponse) => {
					this.is_creating = false;
					this.created_response = response;
					this.showSuccess(response.message || 'Factura SAT creada exitosamente (ID: ' + response.sat_factura_id + ')');
					this.updateCanSubmit();
				},
				error: (error) => {
					this.is_creating = false;
					this.showError(error);
					this.updateCanSubmit();
				}
			});
	}

	resetFiles(): void {
		this.xml_attachment_id = null;
		this.pdf_attachment_id = null;
		this.xml_attachment_info = null;
		this.pdf_attachment_info = null;
		this.factura_info = null;
		this.created_response = null;
		this.updateCanSubmit();
	}

	resetAll(): void {
		this.search_order = '';
		this.selected_order = null;
		this.show_order_warning = false;
		this.order_warning_text = '';
		this.factura_type = 'NORMAL';
		this.resetFiles();
	}
}

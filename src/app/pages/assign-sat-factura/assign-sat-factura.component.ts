import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Order, Attachment } from '../../modules/shared/RestModels';
import { AttachmentInfo } from '../../modules/shared/Models';
import { LoadingComponent } from '../../components/loading/loading.component';
import { AttachmentUploaderComponent } from '../../components/attachment-uploader/attachment-uploader.component';

interface FacturaInfo {
	uuid: string;
	serie: string;
	folio: string;
}

interface OrderDisplay extends Order {
	client_display_name?: string;
}

@Component({
	selector: 'app-assign-sat-factura',
	templateUrl: './assign-sat-factura.component.html',
	styleUrls: ['./assign-sat-factura.component.css'],
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		LoadingComponent,
		AttachmentUploaderComponent
	]
})
export class AssignSatFacturaComponent extends BaseComponent implements OnInit {

	// Search
	search_order: string = '';
	searching: boolean = false;

	// Selected order
	selected_order: OrderDisplay | null = null;

	// Uploaded attachments
	xml_attachment_id: number | null = null;
	pdf_attachment_id: number | null = null;
	xml_attachment_info: AttachmentInfo | null = null;
	pdf_attachment_info: AttachmentInfo | null = null;

	// Parsed XML info
	factura_info: FacturaInfo | null = null;

	// Status
	is_assigning: boolean = false;

	// Rest services
	rest_order: RestSimple<Order> = this.rest.initRestSimple<Order>('order');
	http: HttpClient;

	constructor(injector: Injector) {
		super(injector);
		this.http = injector.get(HttpClient);
	}

	ngOnInit(): void {
		this.setTitle('Asignar Factura SAT');
	}

	searchOrder() {
		if (!this.search_order || this.search_order.trim() === '') {
			this.rest.showError('Por favor ingrese un número de orden');
			return;
		}

		const order_id = parseInt(this.search_order);

		if (isNaN(order_id)) {
			this.rest.showError('El número de orden debe ser un número válido');
			return;
		}

		this.searching = true;
		this.selected_order = null;
		this.resetFiles();

		const search: SearchObject<Order> = this.rest_order.getEmptySearch();
		search.eq = { id: order_id } as Partial<Order>;
		search.limit = 1;

		this.subs.sink = this.rest_order.search(search).subscribe({
			next: (response) => {
				this.searching = false;
				if (response.data.length === 0) {
					this.rest.showError('No se encontró una orden con ese ID');
					return;
				}

				const order = response.data[0] as OrderDisplay;

				// Verificar que la orden esté cerrada
				if (order.status !== 'CLOSED') {
					this.rest.showError('La orden debe estar cerrada para asignarle una factura');
					return;
				}

				// Verificar si ya tiene factura asignada
				if (order.sat_factura_id) {
					this.rest.showWarning('Esta orden ya tiene una factura SAT asignada (ID: ' + order.sat_factura_id + ')');
				}

				// Formato del nombre del cliente
				order.client_display_name = order.client_name || `Cliente #${order.client_user_id || 'N/A'}`;

				this.selected_order = order;
			},
			error: (error) => {
				this.searching = false;
				this.rest.showError(error);
			}
		});
	}

	onXmlAttachmentChange(attachmentInfo: AttachmentInfo) {
		this.xml_attachment_info = attachmentInfo;
		this.xml_attachment_id = attachmentInfo.attachment.id;

		// Parse XML to extract invoice info
		this.parseXmlFromAttachment(attachmentInfo);
	}

	onPdfAttachmentChange(attachmentInfo: AttachmentInfo) {
		this.pdf_attachment_info = attachmentInfo;
		this.pdf_attachment_id = attachmentInfo.attachment.id;
	}

	parseXmlFromAttachment(attachmentInfo: AttachmentInfo) {
		// Fetch the XML file content from the server to parse it
		const url = this.rest.getFilePath(attachmentInfo.attachment.id);

		fetch(url, { credentials: 'include' })
			.then(response => response.text())
			.then(xmlString => {
				try {
					const parser = new DOMParser();
					const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

					// Verificar errores de parseo
					const parseError = xmlDoc.querySelector('parsererror');
					if (parseError) {
						this.rest.showError('Error al parsear el XML');
						return;
					}

					// Extraer UUID del TimbreFiscalDigital
					const timbre = xmlDoc.getElementsByTagName('tfd:TimbreFiscalDigital')[0] ||
					              xmlDoc.getElementsByTagName('TimbreFiscalDigital')[0];

					// Extraer datos del Comprobante
					const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0] ||
					                   xmlDoc.getElementsByTagName('Comprobante')[0];

					if (!timbre || !comprobante) {
						this.rest.showWarning('No se pudo extraer toda la información del XML. El XML podría no ser válido.');
						return;
					}

					const uuid = timbre.getAttribute('UUID') || '';
					const serie = comprobante.getAttribute('Serie') || '';
					const folio = comprobante.getAttribute('Folio') || '';

					this.factura_info = {
						uuid,
						serie,
						folio
					};

				} catch (error) {
					this.rest.showError('Error al leer el archivo XML');
					console.error(error);
				}
			})
			.catch(error => {
				this.rest.showError('Error al obtener el archivo XML');
				console.error(error);
			});
	}

	assignFactura() {
		if (!this.selected_order) {
			this.rest.showError('Debe seleccionar una orden');
			return;
		}

		if (!this.xml_attachment_id || !this.pdf_attachment_id) {
			this.rest.showError('Debe subir ambos archivos primero');
			return;
		}

		this.is_assigning = true;

		const data = {
			xml_attachment_id: this.xml_attachment_id,
			pdf_attachment_id: this.pdf_attachment_id,
			order_id: this.selected_order.id,
			billing_data_id: this.selected_order.billing_data_id
		};

		const url = `${this.rest.domain_configuration.domain}/${this.rest.url_base}/updates/asignar_factura_sat.php`;

		this.subs.sink = this.http.post<any>(url, data, {
			headers: this.rest.getSessionHeaders(),
			withCredentials: true
		}).subscribe({
			next: (response: any) => {
				this.is_assigning = false;
				this.rest.showSuccess('Factura SAT asignada exitosamente');

				// Actualizar información de la factura con la respuesta
				if (response.uuid && response.serie && response.folio) {
					this.factura_info = {
						uuid: response.uuid,
						serie: response.serie,
						folio: response.folio
					};
				}

				// Actualizar la orden seleccionada
				if (this.selected_order) {
					this.selected_order.sat_factura_id = response.sat_factura_id;
					this.selected_order.sat_xml_attachment_id = this.xml_attachment_id;
					this.selected_order.sat_pdf_attachment_id = this.pdf_attachment_id;
				}
			},
			error: (error: any) => {
				this.is_assigning = false;
				this.rest.showError(error);
			}
		});
	}

	resetFiles() {
		this.xml_attachment_id = null;
		this.pdf_attachment_id = null;
		this.xml_attachment_info = null;
		this.pdf_attachment_info = null;
		this.factura_info = null;
	}

	reset() {
		this.search_order = '';
		this.selected_order = null;
		this.resetFiles();
	}
}

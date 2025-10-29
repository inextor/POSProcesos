import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Payment, Attachment } from '../../modules/shared/RestModels';
import { AttachmentInfo } from '../../modules/shared/Models';
import { LoadingComponent } from '../../components/loading/loading.component';
import { AttachmentUploaderComponent } from '../../components/attachment-uploader/attachment-uploader.component';

interface FacturaInfo {
	uuid: string;
	serie: string;
	folio: string;
}

interface PaymentDisplay extends Payment {
	user_display_name?: string;
}

@Component({
	selector: 'app-assign-sat-factura-payment',
	templateUrl: './assign-sat-factura-payment.component.html',
	styleUrls: ['./assign-sat-factura-payment.component.css'],
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		LoadingComponent,
		AttachmentUploaderComponent
	]
})
export class AssignSatFacturaPaymentComponent extends BaseComponent implements OnInit {

	// Search
	search_payment: string = '';
	searching: boolean = false;

	// Selected payment
	selected_payment: PaymentDisplay | null = null;

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
	rest_payment!: RestSimple<Payment>;
	http!: HttpClient;

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit(): void {
		this.setTitle('Asignar Factura SAT a Pago');

		// Initialize rest services
		this.rest_payment = this.rest.initRestSimple<Payment>('payment');
		this.http = this.injector.get(HttpClient);

		// Check if payment_id is provided in the route
		const payment_id = this.route.snapshot.paramMap.get('payment_id');
		if (payment_id) {
			this.search_payment = payment_id;
			// Use setTimeout to ensure component is fully initialized
			setTimeout(() => {
				this.searchPayment();
			}, 0);
		}
	}

	searchPayment() {
		if (!this.search_payment || this.search_payment.trim() === '') {
			this.rest.showError('Por favor ingrese un número de pago');
			return;
		}

		const payment_id = parseInt(this.search_payment);

		if (isNaN(payment_id)) {
			this.rest.showError('El número de pago debe ser un número válido');
			return;
		}

		this.searching = true;
		this.selected_payment = null;
		this.resetFiles();

		this.subs.sink = this.rest_payment.get(payment_id).subscribe({
			next: (payment: Payment) => {
				this.searching = false;

				if (!payment) {
					this.rest.showError('No se encontró un pago con ese ID');
					return;
				}

				const paymentDisplay = payment as PaymentDisplay;

				// Verificar que el pago esté activo
				if (paymentDisplay.status !== 'ACTIVE') {
					this.rest.showError('El pago debe estar activo para asignarle una factura');
					return;
				}

				// Verificar si ya tiene factura asignada
				if (paymentDisplay.sat_factura_id) {
					this.rest.showWarning('Este pago ya tiene una factura SAT asignada (ID: ' + paymentDisplay.sat_factura_id + ')');
				}

				// Formato del nombre del usuario
				paymentDisplay.user_display_name = paymentDisplay.paid_by_user_id ? `Usuario #${paymentDisplay.paid_by_user_id}` : 'N/A';

				this.selected_payment = paymentDisplay;
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
		if (!this.selected_payment) {
			this.rest.showError('Debe seleccionar un pago');
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
			payment_id: this.selected_payment.id
		};

		const url = `${this.rest.domain_configuration.domain}/${this.rest.url_base}/updates/asignar_factura_sat_payment.php`;

		this.subs.sink = this.http.post<any>(url, data, {
			headers: this.rest.getSessionHeaders(),
			withCredentials: true
		}).subscribe({
			next: (response: any) => {
				this.is_assigning = false;
				this.rest.showSuccess('Factura SAT asignada exitosamente al pago');

				// Actualizar información de la factura con la respuesta
				if (response.uuid && response.serie && response.folio) {
					this.factura_info = {
						uuid: response.uuid,
						serie: response.serie,
						folio: response.folio
					};
				}

				// Actualizar el pago seleccionado
				if (this.selected_payment) {
					this.selected_payment.sat_factura_id = response.sat_factura_id;
					this.selected_payment.sat_xml_attachment_id = this.xml_attachment_id;
					this.selected_payment.sat_pdf_attachment_id = this.pdf_attachment_id;
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
		this.search_payment = '';
		this.selected_payment = null;
		this.resetFiles();
	}
}

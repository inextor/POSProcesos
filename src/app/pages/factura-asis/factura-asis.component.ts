import { Component, OnInit} from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { OrderInfo, OrderItemInfo } from '../../modules/shared/Models';
import { Billing_Data, Order, Order_Item } from '../../modules/shared/RestModels';
import { RestService } from '../../modules/shared/services/rest.service';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { Utils } from '../../modules/shared/Utils';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest, RestResponse } from '../../modules/shared/services/Rest';
// import { environment } from '../../environments/environment';

interface TaxTrasladado {
	Impuesto: string;           // 002=IVA, 003=IEPS
	TipoFactor: string;        // Tasa, Cuota, Exento
	Base: string;             // Tax base amount
	TasaOCuota?: string;       // Tax rate (not for Exento)
	Importe: string;          // Tax amount (0 for Exento, 0% rate)
}

interface TaxRetenido {
	Impuesto: string;           // 001=ISR
	TipoFactor: string;        // Tasa, Cuota
	Base: string;
	TasaOCuota: string;        // 4 decimal places for ISR
	Importe: string;
}

interface Concepto {
	ClaveProdServ: string;
	Cantidad: string;
	ClaveUnidad: string;
	Unidad: string;
	Descripcion: string;
	ValorUnitario: string;
	ObjetoImp: string;         // 01=No objeto, 02=Sí objeto, 03=Sí objeto sin desglose
	Importe: string;
	Descuento?: string;
	Traslados?: {
		ImpuestoTrasladado40: TaxTrasladado[];
	};
	Retenciones?: {
		ImpuestoRetenido40: TaxRetenido[];
	};
}

interface FacturaAsisRequest {
	usuario: string;
	contrasena: string;
	xml_addenda: string;
	datos_cfdi: {
		Moneda: string;
		Subtotal: string;
		Total: string;
		CondicionesDePago?: string;
		TipodeComprobante: string;
		LugarDeExpedicion: string;
		FormadePago?: string;
		MetodoPago?: string;
		TipoCambio?: string;
		Fecha?: string;
		Folio?: string;
		Serie?: string;
		Descuento?: string;
		Exportacion?: string;
		DatosAdicionales?: string;
		MensajePDF?: string;
		Transaccion?: string;
	};
	receptor_cfdi: {
		RFC: string;
		RazonSocial: string;
		UsoCfdi: string;
		Pais: string;
		RegimenFiscalReceptor: string;
		Email?: string;
		NumRegIdTrib?: string;
		DomicilioFiscalReceptor?: string;
	};
	conceptos: Concepto[];
}

interface FacturaAsisResponse {
	success: boolean;
	request_sent?: any;
	soap_response?: any;
	error?: string;
	request?: any;
}

@Component({
	selector: 'app-factura-asis',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		DatePipe,
		CurrencyPipe
	],
	templateUrl: './factura-asis.component.html',
	styleUrl: './factura-asis.component.css'
})
export class FacturaAsisComponent extends BaseComponent implements OnInit {

	order_info: OrderInfo = GetEmpty.order_info(this.rest,GetEmpty.store(),GetEmpty.price_type());
	isLoading: boolean = true;
	isSubmitting: boolean = false;
	response: FacturaAsisResponse | null = null;
	error: string | null = null;
	showRequest: boolean = false;
	showResponse: boolean = false;

	// Modal properties
	currentEditingItem: Concepto | null = null;
	currentEditingIndex: number = -1;
	taxModal: any = null;

	// Raw response property
	rawResponse: string = '';

	// Response log for multiple submissions
	responseLog: string = '';

	// Invoice form data
	invoiceForm: FacturaAsisRequest = {
		usuario: '',
		contrasena: '',
		xml_addenda: '',
		datos_cfdi: {
			Moneda: '', // Will be set from order data
			Subtotal: '0.00',
			Total: '0.00',
			CondicionesDePago: 'Contado',
			TipodeComprobante: 'I',
			LugarDeExpedicion: '',
			FormadePago: '01',
			MetodoPago: 'PUE',
			TipoCambio: '1.00',
			Fecha: '',
			Folio: '',
			Serie: 'A',
			Descuento: '0.00',
			Exportacion: '01',
			DatosAdicionales: '',
			MensajePDF: '',
			Transaccion: ''
		},
		receptor_cfdi: {
			RFC: '',
			RazonSocial: '',
			UsoCfdi: 'G01',
			Pais: 'MEX',
			RegimenFiscalReceptor: '601',
			Email: '',
			NumRegIdTrib: '',
			DomicilioFiscalReceptor: ''
		},
		conceptos: []
	};

    billing_data_list: Billing_Data[] = [];
	rest_billing_data:Rest<Billing_Data,Billing_Data> = this.rest.initRest('billing_data');

	ngOnInit(): void {
		this.route.paramMap.subscribe(params => {
			const orderId = params.get('order_id');

			this.rest_billing_data.search({limit:999999}).subscribe
			({
				next: (response:RestResponse<Billing_Data>) => {
					this.billing_data_list = response.data;
					this.loadOrderInfo(orderId as string);
				}
			});
		});
	}

	initializeSampleData(): void {
		// Set sample order info
		this.order_info.order = {
			id: 123,
			client_name: 'Cliente de Prueba',
			created: new Date(),
			subtotal: 1000,
			tax: 160,
			total: 1160
		} as any;

		// Initialize form with sample data
		this.invoiceForm.conceptos = [{
			ClaveProdServ: '01010101',
			Cantidad: '2',
			ClaveUnidad: 'H87',
			Unidad: 'Pieza',
			Descripcion: 'Producto de prueba',
			ValorUnitario: '500.00',
			ObjetoImp: '02',
			Importe: '1000.00',
			Descuento: '0.00',
			Traslados: {
				ImpuestoTrasladado40: [
					{
						Impuesto: '002',
						TipoFactor: 'Tasa',
						Base: '1000.00',
						TasaOCuota: '0.160000',
						Importe: '160.00'
					}
				]
			},
			Retenciones: {
				ImpuestoRetenido40: []
			}
		}];

		// Calculate totals
		this.calculateTotals();
	}

	loadOrderInfo(orderId: string): void {
		this.isLoading = true;
		this.error = null;
		this.response = null;

		// Initialize REST endpoints
		let rest_order_info = this.rest.initRest('order_info');

		// Get order info
		rest_order_info.get(orderId).subscribe({
			next: (orderData: any) => {
				console.log('Order data received:', orderData);
				this.order_info = orderData as OrderInfo;
				this.populateInvoiceForm();
				this.isLoading = false;
			},
			error: (error) => {
				console.error('Error loading order info:', error);
				this.error = 'Error loading order info: ' + error;
				this.isLoading = false;
				this.showError(this.error);
			}
		});
	}

	populateInvoiceForm(): void {
		// Set store postal code as LugarDeExpedicion (get from store if available)
		if (this.order_info.store?.zipcode) {
			this.invoiceForm.datos_cfdi.LugarDeExpedicion = this.order_info.store.zipcode;
		}

		// Set current date
		const now = new Date();
		this.invoiceForm.datos_cfdi.Fecha = now.toISOString().replace(/\.\d{3}Z$/, '');

		// Set currency from order
		const orderCurrency = this.order_info.order.currency_id;
		this.invoiceForm.datos_cfdi.Moneda = orderCurrency;

		// Set exchange rate for non-MXN currencies
		if (orderCurrency !== 'MXN') {
			// You might need to get this from a service or order data
			this.invoiceForm.datos_cfdi.TipoCambio = '1.00'; // Default, should be updated with real rate
		} else {
			this.invoiceForm.datos_cfdi.TipoCambio = '1.00';
		}

		// Use actual order totals if available, otherwise calculate from items
		const orderSubtotal = this.order_info.order.subtotal || 0;
		const orderTax = this.order_info.order.tax || 0;
		const orderTotal = this.order_info.order.total || 0;

		this.invoiceForm.datos_cfdi.Subtotal = orderSubtotal.toFixed(2);
		this.invoiceForm.datos_cfdi.Total = orderTotal.toFixed(2);
		this.invoiceForm.datos_cfdi.Descuento = '0.00';

		// Load client SAT information from order
		const order: any = this.order_info.order;
		if (order.sat_razon_social) this.invoiceForm.receptor_cfdi.RazonSocial = order.sat_razon_social;
		if (order.sat_receptor_email) this.invoiceForm.receptor_cfdi.Email = order.sat_receptor_email;
		if (order.sat_receptor_rfc) this.invoiceForm.receptor_cfdi.RFC = order.sat_receptor_rfc;
		if (order.sat_domicilio_fiscal_receptor) this.invoiceForm.receptor_cfdi.DomicilioFiscalReceptor = order.sat_domicilio_fiscal_receptor;
		if (order.sat_uso_cfdi) this.invoiceForm.receptor_cfdi.UsoCfdi = order.sat_uso_cfdi;
		if (order.sat_regimen_fiscal_receptor) this.invoiceForm.receptor_cfdi.RegimenFiscalReceptor = order.sat_regimen_fiscal_receptor;

		// Create conceptos (line items) with enhanced tax structure
		this.invoiceForm.conceptos = this.order_info.items.map((item: OrderItemInfo) => {
			const quantity = item.order_item.qty || 1;
			const unitPrice = item.order_item.unitary_price || 0;
			const itemSubtotal = quantity * unitPrice;

			// Determine tax structure based on order item tax info or defaults
			const itemTax = item.order_item.tax || 0;
			const itemTotal = item.order_item.total || itemSubtotal + itemTax;

			// Calculate IVA (assuming most items have 16% IVA)
			let ivaRate = 0.16;
			let ivaAmount = itemTax;

			// If we have tax info, calculate the rate
			if (itemTax > 0 && itemSubtotal > 0) {
				ivaRate = itemTax / itemSubtotal;
			}

			return {
				ClaveProdServ: item.item.clave_sat || '01010101',
				Cantidad: quantity.toString(),
				ClaveUnidad: item.item.unidad_medida_sat_id || 'H87',
				Unidad: item.item.measurement_unit || 'Pieza',
				Descripcion: item.item.name,
				ValorUnitario: unitPrice.toFixed(2),
				//Subtotal: itemSubtotal.toFixed(2),
				ObjetoImp: '02', // Sí objeto de impuesto
				Importe: itemSubtotal.toFixed(2),
				Descuento: '0.00',
				Traslados: {
					ImpuestoTrasladado40: itemTax > 0 ? [
						{
							Impuesto: '002', // IVA
							TipoFactor: 'Tasa',
							Base: itemSubtotal.toFixed(2),
							TasaOCuota: ivaRate.toFixed(6),
							Importe: itemTax.toFixed(2)
						}
					] : []
				},
				Retenciones: {
					ImpuestoRetenido40: [] // Default: no withholding taxes
				}
			};
		});

		if( this.billing_data_list.length ){
			this.invoiceForm.usuario = this.billing_data_list[0].usuario as string;
			this.invoiceForm.contrasena = this.billing_data_list[0].password as string;
		}

		// Recalculate totals to ensure consistency
		this.calculateTotals();
	}

	generateInvoice(): void {
		if (!this.invoiceForm.usuario || !this.invoiceForm.contrasena) {
			this.showError('Se requiere usuario y contraseña de Sicofi');
			return;
		}

		if (!this.invoiceForm.receptor_cfdi.RFC) {
			this.showError('Se requiere RFC del receptor');
			return;
		}

		this.isSubmitting = true;
		this.response = null;

		const endpointUrl = `${this.rest.getApiUrl()}/facturar_isr_endpoint.php`;

		// Get session headers from REST service
		const sessionHeaders = this.rest.getSessionHeaders();

		// Convert HttpHeaders to plain object for fetch
		const headers: { [key: string]: string } = {
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		};

		// Add authentication headers if they exist
		if (sessionHeaders.has('Authorization')) {
			headers['Authorization'] = sessionHeaders.get('Authorization')!;
		}

		// Create a copy of the invoiceForm to modify before sending
		const payload = { ...this.invoiceForm };

		// Conditionally remove CondicionesDePago if empty
		if (payload.datos_cfdi.CondicionesDePago === '') {
			delete payload.datos_cfdi.CondicionesDePago;
		}

		console.log('Sending headers:', headers);
		console.log('Endpoint URL:', endpointUrl);

		fetch(endpointUrl, {
			method: 'POST',
			headers: headers,
			body: JSON.stringify(payload),
			credentials: 'include' // Important for cookies/sessions
		})
		.then(response => {
			// Clone the response to read it twice (once as text, once as json)
			const clonedResponse = response.clone();

			// Capture raw response text
			clonedResponse.text().then(rawText => {
				this.rawResponse = rawText;
			});

			// Parse JSON for processed response
			return response.json();
		})
		.then((data: FacturaAsisResponse) => {
			console.log('Response received:', data);
			this.response = data;
			this.isSubmitting = false;

			// Add response to log with timestamp
			const timestamp = new Date().toLocaleString();
			const separator = '='.repeat(80);
			const logEntry = `\n${separator}\n[${timestamp}] Respuesta de facturación:\n${separator}\n${this.rawResponse}\n`;
			this.responseLog += logEntry;

			if (data.success) {
				this.showSuccess('Factura generada exitosamente');
			} else {
				this.showError(data.error || 'Error generando factura');
			}
		})
		.catch(error => {
			console.error('Error calling endpoint:', error);
			const errorMessage = 'Error calling endpoint: ' + error.message;
			this.response = {
				success: false,
				error: errorMessage,
				request: this.invoiceForm
			};

			// Add error to log with timestamp
			const timestamp = new Date().toLocaleString();
			const separator = '='.repeat(80);
			const logEntry = `\n${separator}\n[${timestamp}] ERROR:\n${separator}\n${errorMessage}\n`;
			this.responseLog += logEntry;

			this.isSubmitting = false;
			this.showError(errorMessage);
		});
	}

	downloadPDF(): void {
		if (this.response?.soap_response?.GeneraCFDIV40Result?.PDF) {
			const pdfData = this.response.soap_response.GeneraCFDIV40Result.PDF;
			const blob = new Blob([atob(pdfData)], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `factura_${this.order_info.order.id}_${Date.now()}.pdf`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}
	}

	downloadXML(): void {
		if (this.response?.soap_response?.GeneraCFDIV40Result?.XMLCFDI) {
			const xmlData = this.response.soap_response.GeneraCFDIV40Result.XMLCFDI;
			const blob = new Blob([xmlData], { type: 'application/xml' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `factura_${this.order_info.order.id}_${Date.now()}.xml`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}
	}

	toggleShowRequest(): void {
		this.showRequest = !this.showRequest;
	}

	toggleShowResponse(): void {
		this.showResponse = !this.showResponse;
	}


	updateItemTotal(index: number): void {
		const concepto = this.invoiceForm.conceptos[index];
		const cantidad = parseFloat(concepto.Cantidad) || 0;
		const valorUnitario = parseFloat(concepto.ValorUnitario) || 0;
		//const subtotal = parseFloat(concepto.Subtotal || '0') || 0;

		// Use the manual subtotal if provided, otherwise calculate
		const importe = cantidad * valorUnitario;
		concepto.Importe = importe.toFixed(2);

		// Update Subtotal field if it was empty or needs to be calculated
		//if (!concepto.Subtotal || parseFloat(concepto.Subtotal) === 0) {
		//	concepto.Subtotal = (cantidad * valorUnitario).toFixed(2);
		//}

		// Update tax calculations for all traslados
		if (concepto.Traslados && concepto.Traslados.ImpuestoTrasladado40) {
			concepto.Traslados.ImpuestoTrasladado40.forEach(impuesto => {
				if (impuesto.TipoFactor === 'Exento') {
					impuesto.Base = concepto.Importe;
					// No TasaOCuota or Importe for Exento
				} else if (impuesto.TipoFactor === 'Tasa') {
					const tasa = parseFloat(impuesto.TasaOCuota || '0');
					impuesto.Base = concepto.Importe;
					impuesto.Importe = (importe * tasa).toFixed(2);
				}
				// Cuota (fixed amount) would need different logic
			});
		}

		this.calculateTotals();
	}

	calculateTotals(): void {
		let subtotal = 0;
		let totalTraslados = 0;
		let totalRetenciones = 0;

		this.invoiceForm.conceptos.forEach(concepto => {
			const importe = parseFloat(concepto.Importe) || 0;
			subtotal += importe;

			// Calculate traslados (transferred taxes)
			if (concepto.Traslados && concepto.Traslados.ImpuestoTrasladado40) {
				concepto.Traslados.ImpuestoTrasladado40.forEach(impuesto => {
					totalTraslados += parseFloat(impuesto.Importe || '0');
				});
			}

			// Calculate retenciones (withholding taxes)
			if (concepto.Retenciones && concepto.Retenciones.ImpuestoRetenido40) {
				concepto.Retenciones.ImpuestoRetenido40.forEach(impuesto => {
					totalRetenciones += parseFloat(impuesto.Importe || '0');
				});
			}
		});

		const total = subtotal + totalTraslados - totalRetenciones;

		this.invoiceForm.datos_cfdi.Subtotal = subtotal.toFixed(2);
		this.invoiceForm.datos_cfdi.Total = total.toFixed(2);
	}

	addEmptyItem(): void {
		const newItem: Concepto = {
			ClaveProdServ: '01010101',
			Cantidad: '1',
			ClaveUnidad: 'H87',
			Unidad: 'Pieza',
			Descripcion: 'Nuevo artículo',
			ValorUnitario: '0.00',
			ObjetoImp: '02',
			Importe: '0.00',
			Descuento: '0.00',
			Traslados: {
				ImpuestoTrasladado40: [
					{
						Impuesto: '002',
						TipoFactor: 'Tasa',
						Base: '0.00',
						TasaOCuota: '0.160000',
						Importe: '0.00'
					}
				]
			},
			Retenciones: {
				ImpuestoRetenido40: []
			}
		};

		this.invoiceForm.conceptos.push(newItem);
		this.calculateTotals();
	}

	removeItem(index: number): void {
		if (this.invoiceForm.conceptos.length > 1) {
			this.invoiceForm.conceptos.splice(index, 1);
			this.calculateTotals();
		} else {
			this.showError('Debe tener al menos un artículo en la factura');
		}
	}

	getTaxDescription(taxCode: string): string {
		switch (taxCode) {
			case '001': return 'ISR';
			case '002': return 'IVA';
			case '003': return 'IEPS';
			default: return taxCode;
		}
	}

	getItemSubtotal(concepto: Concepto): number {
		const cantidad = parseFloat(concepto.Cantidad) || 0;
		const valorUnitario = parseFloat(concepto.ValorUnitario) || 0;
		return cantidad * valorUnitario;
	}

	editTaxes(index: number): void {
		// For now, just show an alert. In a real implementation, this could open a modal
		const concepto = this.invoiceForm.conceptos[index];
		const taxInfo = concepto.Traslados?.ImpuestoTrasladado40?.map(tax =>
			`${this.getTaxDescription(tax.Impuesto)} (${tax.TipoFactor}): ${tax.Importe}`
		).join(', ') || 'Sin impuestos';

		alert(`Impuestos del artículo "${concepto.Descripcion}":\n${taxInfo}`);
	}

	goBack(): void {
		this.router.navigate(['/view-order', this.order_info.order.id]);
	}

	clearResponse(): void {
		this.response = null;
		this.rawResponse = '';
		this.showRequest = false;
		this.showResponse = false;
	}

	clearResponseLog(): void {
		this.responseLog = '';
		this.response = null;
		this.rawResponse = '';
	}

	// Modal methods for tax editing
	openTaxModal(index: number): void {
		this.currentEditingIndex = index;
		this.currentEditingItem = { ...this.invoiceForm.conceptos[index] };

		// Ensure tax arrays exist
		if (!this.currentEditingItem.Traslados) {
			this.currentEditingItem.Traslados = { ImpuestoTrasladado40: [] };
		}
		if (!this.currentEditingItem.Retenciones) {
			this.currentEditingItem.Retenciones = { ImpuestoRetenido40: [] };
		}

		// Open modal (using vanilla JS since this is standalone)
		const modalElement = document.getElementById('taxModal');
		if (modalElement) {
			this.taxModal = new (window as any).bootstrap.Modal(modalElement);
			this.taxModal.show();
		}
	}

	closeTaxModal(): void {
		// Close modal
		if (this.taxModal) {
			this.taxModal.hide();
		}

		// Cleanup
		this.currentEditingItem = null;
		this.currentEditingIndex = -1;
		this.taxModal = null;
	}

	saveTaxChanges(): void {
		if (this.currentEditingIndex >= 0 && this.currentEditingItem) {
			// Update the item with changes from modal
			this.invoiceForm.conceptos[this.currentEditingIndex] = { ...this.currentEditingItem };
			// Recalculate totals without modifying the tax amounts
			this.calculateTotals();
		}

		this.closeTaxModal();
	}

	addTrasladoTax(): void {
		if (this.currentEditingItem && this.currentEditingItem.Traslados) {
			const newTax: TaxTrasladado = {
				Impuesto: '002', // IVA by default
				TipoFactor: 'Tasa',
				Base: this.currentEditingItem.Importe || '0.00',
				TasaOCuota: '0.160000', // 16% IVA
				Importe: '0.00'
			};
			this.currentEditingItem.Traslados.ImpuestoTrasladado40.push(newTax);
		}
	}

	addRetencionTax(): void {
		if (this.currentEditingItem && this.currentEditingItem.Retenciones) {
			const newTax: TaxRetenido = {
				Impuesto: '001', // ISR by default
				TipoFactor: 'Tasa',
				Base: this.currentEditingItem.Importe || '0.00',
				TasaOCuota: '0.1000', // 10% ISR
				Importe: '0.00'
			};
			this.currentEditingItem.Retenciones.ImpuestoRetenido40.push(newTax);
		}
	}

	removeTrasladoTax(index: number): void {
		if (this.currentEditingItem && this.currentEditingItem.Traslados) {
			this.currentEditingItem.Traslados.ImpuestoTrasladado40.splice(index, 1);
		}
	}

	removeRetencionTax(index: number): void {
		if (this.currentEditingItem && this.currentEditingItem.Retenciones) {
			this.currentEditingItem.Retenciones.ImpuestoRetenido40.splice(index, 1);
		}
	}

	calculateTaxAmount(item: Concepto | null): void {
		if (!item) return;

		item.Traslados?.ImpuestoTrasladado40.forEach(tax => {
			if (tax.TipoFactor === 'Exento') {
				tax.TasaOCuota = '';
				tax.Importe = '0.00';
			} else if (tax.TipoFactor === 'Tasa') {
				const base = parseFloat(tax.Base || '0');
				const tasa = parseFloat(tax.TasaOCuota || '0');
				tax.Importe = (base * tasa).toFixed(2);
			}
			// Cuota would have different logic
		});
	}

	calculateRetencionAmount(item: Concepto | null): void {
		if (!item) return;

		item.Retenciones?.ImpuestoRetenido40.forEach(tax => {
			const base = parseFloat(tax.Base || '0');
			const tasa = parseFloat(tax.TasaOCuota || '0');
			tax.Importe = (base * tasa).toFixed(2);
		});
	}

	duplicateItem(index: number): void {
		if (index >= 0 && index < this.invoiceForm.conceptos.length) {
			const originalItem = this.invoiceForm.conceptos[index];
			const duplicatedItem: Concepto = {
				...originalItem,
				Descripcion: originalItem.Descripcion + ' (Copia)',
				// Deep copy tax arrays
				Traslados: originalItem.Traslados ? {
					ImpuestoTrasladado40: originalItem.Traslados.ImpuestoTrasladado40.map(tax => ({...tax}))
				} : undefined,
				Retenciones: originalItem.Retenciones ? {
					ImpuestoRetenido40: originalItem.Retenciones.ImpuestoRetenido40.map(tax => ({...tax}))
				} : undefined
			};

			this.invoiceForm.conceptos.splice(index + 1, 0, duplicatedItem);
			this.calculateTotals();
		}
	}
}

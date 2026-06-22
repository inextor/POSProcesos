import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple } from '../../modules/shared/services/Rest';
import { Order, Store, User, Price_Type, Stock_Record } from '../../modules/shared/RestModels';
import { ItemInfo, AttachmentInfo, OrderInfo } from '../../modules/shared/Models';
import { LoadingComponent } from '../../components/loading/loading.component';
import { AttachmentUploaderComponent } from '../../components/attachment-uploader/attachment-uploader.component';
import { SearchItemsComponent } from '../../components/search-items/search-items.component';
import { SearchUsersComponent } from '../../components/search-users/search-users.component';
import { FacturaMetaData } from '../../modules/shared/FacturaMetaData';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { OrderBuilder } from '../../modules/shared/OrderBuilder';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface CfdiConcepto {
	descripcion: string;
	cantidad: number;
	valorUnitario: number;
	importe: number;
	descuento: number;
	claveUnidad: string;
	unidad: string;
	matched_item?: ItemInfo;
	search_str: string;
	totalIva: number;
	totalIeps: number;
	totalTraslados: number;
	totalRetenciones: number;
	note: string;
}

interface FacturaPdfConcepto
{
	cantidad:string;
	unidad:string;
	claveUnidad:string;
	claveProdServ:string;
	noIdentificacion:string;
	descripcion:string;
	valorUnitario:number;
	importe:number;
	descuento:number;
	objetoImp:string;
	impuestos:FacturaPdfImpuesto[];
}

interface FacturaPdfImpuesto
{
	tipo:'Traslado' | 'Retencion';
	impuesto:string;
	tipoFactor:string;
	tasaOCuota:string;
	base:number;
	importe:number;
}

interface FacturaPdfData
{
	serie:string;
	folio:string;
	fecha:string;
	formaPago:string;
	metodoPago:string;
	moneda:string;
	tipoCambio:string;
	subtotal:number;
	descuento:number;
	total:number;
	tipoComprobante:string;
	noCertificado:string;
	lugarExpedicion:string;
	condicionesPago:string;
	sello:string;
	uuid:string;
	fechaTimbrado:string;
	noCertificadoSat:string;
	selloSat:string;
	selloCfd:string;
	rfcProvCertif:string;
	timbreVersion:string;
	emisorNombre:string;
	emisorRfc:string;
	emisorRegimen:string;
	receptorNombre:string;
	receptorRfc:string;
	receptorDomicilio:string;
	receptorRegimen:string;
	usoCfdi:string;
	conceptos:FacturaPdfConcepto[];
	impuestos:FacturaPdfImpuesto[];
	cadenaOriginal:string;
	qrUrl:string;
}

@Component({
	selector: 'app-create-order-from-xml',
	templateUrl: './create-order-from-xml.component.html',
	styleUrls: ['./create-order-from-xml.component.css'],
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		LoadingComponent,
		AttachmentUploaderComponent,
		SearchItemsComponent,
		SearchUsersComponent
	]
})
export class CreateOrderFromXmlComponent extends BaseComponent implements OnInit {

	// Selected Store and Client
	store_list: Store[] = [];
	selected_store_id: number | null = null;
	selected_client: User | null = null;
	price_type_list: Price_Type[] = [];

	// Upload details
	xml_attachment_id: number | null = null;
	xml_attachment_info: AttachmentInfo | null = null;
	loading_cfdi: boolean = false;

	// XML Data
	factura_metadata: FacturaMetaData | null = null;
	cfdi_conceptos: CfdiConcepto[] = [];
	order_info: OrderInfo | null = null;
	order_id: number | null = null;
	xml_loaded_from_order: boolean = false;
	has_auto_generated_pdf: boolean = false;

	// Status flags
	is_saving: boolean = false;
	is_generating_pdf: boolean = false;

	// Rest Services
	rest_store!: RestSimple<Store>;
	rest_item_info!: RestSimple<ItemInfo>;
	rest_order_info!: RestSimple<any>;
	rest_user!: RestSimple<User>;
	http!: HttpClient;

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit(): void {
		this.setTitle('Crear Pedido desde XML (CFDI)');

		this.rest_store = this.rest.initRestSimple<Store>('store');
		this.rest_item_info = this.rest.initRestSimple<ItemInfo>('item_info');
		this.rest_order_info = this.rest.initRestSimple<any>('order_info');
		this.rest_user = this.rest.initRestSimple<User>('user');
		this.http = this.injector.get(HttpClient);
		const route_order_id = Number(this.route.snapshot.paramMap.get('order_id'));
		this.order_id = Number.isFinite(route_order_id) && route_order_id > 0 ? route_order_id : null;

		// Fetch Stores and Price Types
		this.is_loading = true;
		this.subs.sink = forkJoin({
			stores: this.rest_store.search({ limit: 9999, sort_order: ['name_ASC'] }),
			price_types: this.rest.getPriceTypes(false)
		}).subscribe({
			next: (response) => {
				this.store_list = response.stores.data;
				this.price_type_list = response.price_types.data;
				// Default to user's store
				if (this.rest.user && this.rest.user.store_id) {
					this.selected_store_id = this.rest.user.store_id;
				}
				this.is_loading = false;
				if (this.order_id) {
					this.loadOrderXml(this.order_id);
				}
			},
			error: (error) => {
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}

	loadOrderXml(order_id: number) {
		this.is_loading = true;
		this.subs.sink = this.rest_order_info.get(order_id).subscribe({
			next: (order_info: OrderInfo) => {
				this.order_info = order_info;
				const xml_attachment_id = (order_info as any).sat_factura?.xml_attachment_id;

				if (!xml_attachment_id) {
					this.is_loading = false;
					this.rest.showError('La orden no tiene XML de factura relacionado');
					return;
				}

				this.xml_attachment_id = xml_attachment_id;
				this.xml_loaded_from_order = true;
				this.selected_client = order_info.client || null;
				this.selected_store_id = order_info.order.store_id || order_info.store?.id || this.selected_store_id;
				this.is_loading = false;
				this.loadAndParseXml();
			},
			error: (error) => {
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}

	onClientSelected(client: User | null) {
		this.selected_client = client;
	}

	onXmlAttachmentChange(attachmentInfo: AttachmentInfo) {
		this.xml_attachment_info = attachmentInfo;
		this.xml_attachment_id = attachmentInfo.attachment.id;

		this.loadAndParseXml();
	}

	loadAndParseXml() {
		if (!this.xml_attachment_id) return;

		this.loading_cfdi = true;
		this.factura_metadata = null;
		this.cfdi_conceptos = [];

		const url = this.rest.getFilePath(this.xml_attachment_id);

		fetch(url, { credentials: 'include' })
			.then(response => response.text())
			.then(xmlString => {
				this.factura_metadata = new FacturaMetaData(xmlString);
				this.cfdi_conceptos = this.parseConceptosFromXml(xmlString);
				if (this.xml_loaded_from_order) {
					this.loading_cfdi = false;
					if (!this.has_auto_generated_pdf) {
						this.has_auto_generated_pdf = true;
						this.downloadFacturaPdfFromXml();
					}
					return;
				}

				this.matchConceptosWithItems();
				this.searchClientFromXml();
			})
			.catch(error => {
				console.error('Error al cargar XML', error);
				this.rest.showError('Error al cargar y procesar el archivo XML');
				this.loading_cfdi = false;
			});
	}

	async downloadFacturaPdfFromXml() {
		if (!this.xml_attachment_id) {
			this.rest.showError('No hay XML relacionado para generar el PDF');
			return;
		}

		this.is_generating_pdf = true;

		try {
			const xml_response = await fetch(this.rest.getFilePath(this.xml_attachment_id), { credentials: 'include' });

			if (!xml_response.ok) {
				throw new Error('No se pudo descargar el XML de la factura');
			}

			const xml_string = await xml_response.text();
			const factura = this.parseFacturaXmlForPdf(xml_string);
			const agent = await this.getFacturaAgent();
			const logo_url = await this.getPdfLogoUrl();
			const html = this.buildFacturaPdfHtml(factura, agent, logo_url);
			const payload = {
				html,
				orientation: 'P',
				default_font_size: 10,
				download_name: this.getFacturaPdfDownloadName(factura)
			};

			const url = `${environment.app_settings.pdf_service_url}/index.php`;
			const response = await firstValueFrom(this.rest.callPostApi(url, payload, { responseType: 'blob' }));
			const blob = response instanceof Blob ? response : new Blob([response], { type: 'application/pdf' });
			const blob_url = window.URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = blob_url;
			anchor.download = payload.download_name;
			document.body.appendChild(anchor);
			anchor.click();
			window.URL.revokeObjectURL(blob_url);
			document.body.removeChild(anchor);
		}
		catch (error:any) {
			this.rest.showError(error?.message || error);
		}
		finally {
			this.is_generating_pdf = false;
		}
	}

	private async getFacturaAgent(): Promise<User | null> {
		const agent_id = this.order_info?.client?.created_by_user_id;

		if (!agent_id) {
			return null;
		}

		try {
			return await firstValueFrom(this.rest_user.get(agent_id));
		}
		catch (error) {
			console.error('Error obteniendo agente de ventas', error);
			return null;
		}
	}

	private async getPdfLogoUrl(): Promise<string> {
		const store = this.order_info?.store || this.store_list.find(x => x.id === this.selected_store_id) || GetEmpty.store();
		const logo_image_id = this.rest.preferences.default_file_logo_image_id || this.rest.preferences.logo_image_id || store.image_id;
		const logo_url = this.rest.getImagePath(logo_image_id);

		try {
			const response = await fetch(logo_url, { credentials: 'include' });

			if (!response.ok) {
				return logo_url;
			}

			const blob = await response.blob();

			return await new Promise((resolve) => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result as string);
				reader.onerror = () => resolve(logo_url);
				reader.readAsDataURL(blob);
			});
		}
		catch (_error) {
			return logo_url;
		}
	}

	private parseFacturaXmlForPdf(xml_string: string): FacturaPdfData {
		const parser = new DOMParser();
		const dom = parser.parseFromString(xml_string, 'application/xml');

		if (dom.getElementsByTagName('parsererror').length > 0) {
			throw new Error('El XML de la factura no se pudo leer');
		}

		const comprobante = this.getFirstXmlElement(dom, 'Comprobante');
		const emisor = this.getFirstXmlElement(dom, 'Emisor');
		const receptor = this.getFirstXmlElement(dom, 'Receptor');
		const timbre = this.getFirstXmlElement(dom, 'TimbreFiscalDigital');
		const impuestosNode = this.getFirstXmlElement(comprobante || dom, 'Impuestos');
		const conceptos = this.getXmlElements(dom, 'Concepto').map((concepto) => {
			return {
				cantidad: this.getXmlAttribute(concepto, 'Cantidad'),
				unidad: this.getXmlAttribute(concepto, 'Unidad') || this.getXmlAttribute(concepto, 'ClaveUnidad'),
				claveUnidad: this.getXmlAttribute(concepto, 'ClaveUnidad'),
				claveProdServ: this.getXmlAttribute(concepto, 'ClaveProdServ'),
				noIdentificacion: this.getXmlAttribute(concepto, 'NoIdentificacion'),
				descripcion: this.getXmlAttribute(concepto, 'Descripcion'),
				valorUnitario: this.getXmlNumber(concepto, 'ValorUnitario'),
				importe: this.getXmlNumber(concepto, 'Importe') - this.getXmlNumber(concepto, 'Descuento'),
				descuento: this.getXmlNumber(concepto, 'Descuento'),
				objetoImp: this.getXmlAttribute(concepto, 'ObjetoImp'),
				impuestos: this.getConceptoImpuestos(concepto)
			};
		});
		const sello = this.getXmlAttribute(comprobante, 'Sello');
		const selloCfd = this.getXmlAttribute(timbre, 'SelloCFD');
		const selloSat = this.getXmlAttribute(timbre, 'SelloSAT');
		const uuid = this.getXmlAttribute(timbre, 'UUID');
		const emisorRfc = this.getXmlAttribute(emisor, 'Rfc');
		const receptorRfc = this.getXmlAttribute(receptor, 'Rfc');
		const total = this.getXmlNumber(comprobante, 'Total');
		const fechaTimbrado = this.getXmlAttribute(timbre, 'FechaTimbrado');
		const rfcProvCertif = this.getXmlAttribute(timbre, 'RfcProvCertif');
		const noCertificadoSat = this.getXmlAttribute(timbre, 'NoCertificadoSAT');
		const timbreVersion = this.getXmlAttribute(timbre, 'Version') || '1.1';

		const factura: FacturaPdfData = {
			serie: this.getXmlAttribute(comprobante, 'Serie'),
			folio: this.getXmlAttribute(comprobante, 'Folio'),
			fecha: this.getXmlAttribute(comprobante, 'Fecha'),
			formaPago: this.getXmlAttribute(comprobante, 'FormaPago'),
			metodoPago: this.getXmlAttribute(comprobante, 'MetodoPago'),
			moneda: this.getXmlAttribute(comprobante, 'Moneda'),
			tipoCambio: this.getXmlAttribute(comprobante, 'TipoCambio'),
			subtotal: this.getXmlNumber(comprobante, 'SubTotal'),
			descuento: this.getXmlNumber(comprobante, 'Descuento'),
			total,
			tipoComprobante: this.getXmlAttribute(comprobante, 'TipoDeComprobante'),
			noCertificado: this.getXmlAttribute(comprobante, 'NoCertificado'),
			lugarExpedicion: this.getXmlAttribute(comprobante, 'LugarExpedicion'),
			condicionesPago: this.getXmlAttribute(comprobante, 'CondicionesDePago'),
			sello,
			uuid,
			fechaTimbrado,
			noCertificadoSat,
			selloSat,
			selloCfd,
			rfcProvCertif,
			timbreVersion,
			emisorNombre: this.getXmlAttribute(emisor, 'Nombre'),
			emisorRfc,
			emisorRegimen: this.getXmlAttribute(emisor, 'RegimenFiscal'),
			receptorNombre: this.getXmlAttribute(receptor, 'Nombre'),
			receptorRfc,
			receptorDomicilio: this.getXmlAttribute(receptor, 'DomicilioFiscalReceptor'),
			receptorRegimen: this.getXmlAttribute(receptor, 'RegimenFiscalReceptor'),
			usoCfdi: this.getXmlAttribute(receptor, 'UsoCFDI'),
			conceptos,
			impuestos: this.getConceptoImpuestos(impuestosNode),
			cadenaOriginal: '',
			qrUrl: ''
		};

		factura.cadenaOriginal = this.buildCadenaOriginal(factura);
		factura.qrUrl = this.buildSatQrUrl(factura);

		return factura;
	}

	private buildFacturaPdfHtml(factura: FacturaPdfData, agent: User | null, logo_url: string): string {
		const store = this.order_info?.store || this.store_list.find(x => x.id === this.selected_store_id) || GetEmpty.store();
		const order = this.order_info?.order;
		const client = this.order_info?.client;
		const all_impuestos = factura.conceptos.flatMap(concepto => concepto.impuestos);
		const business_color = '#1976d2';
		const agent_html = agent
			? `
				<tr><th colspan="6" class="main-th">Agente</th></tr>
				<tr>
					<td colspan="2" class="main-td"><b>Nombre:</b> ${this.escapeHtml(agent.name)}</td>
					<td colspan="2" class="main-td"><b>Telefono:</b> ${this.escapeHtml(agent.phone || '')}</td>
					<td colspan="2" class="main-td"><b>Email:</b> ${this.escapeHtml(agent.email || '')}</td>
				</tr>`
			: '';

		const conceptos_html = factura.conceptos.map((concepto, index) => {
			const impuestos = concepto.impuestos.map((impuesto) => {
				const tasa = impuesto.tasaOCuota ? ` TasaOCuota: ${this.escapeHtml(impuesto.tasaOCuota)}` : '';
				return `${impuesto.tipo} ${this.getImpuestoLabel(impuesto.impuesto)} Base: ${this.formatPdfNumber(impuesto.base)}${tasa} Importe: ${this.formatPdfNumber(impuesto.importe)}`;
			}).join('<br>');

			return `
				<tr class="${index % 2 === 1 ? 'alt' : ''}">
					<td class="main-td num">${this.escapeHtml(concepto.cantidad)}</td>
					<td class="main-td">${this.escapeHtml(concepto.claveUnidad || concepto.unidad)}</td>
					<td class="main-td">
						${this.escapeHtml(concepto.descripcion)}
						<br><span class="small">ClaveProdServ: ${this.escapeHtml(concepto.claveProdServ)}</span>
						${concepto.noIdentificacion ? '<br><span class="small">No. Identificacion: ' + this.escapeHtml(concepto.noIdentificacion) + '</span>' : ''}
						<br><span class="small">Objeto Imp: ${this.escapeHtml(concepto.objetoImp)}</span>
					</td>
					<td class="main-td money">${this.formatPdfCurrency(concepto.valorUnitario, factura.moneda)}</td>
					<td class="main-td money">${concepto.descuento ? this.formatPdfCurrency(concepto.descuento, factura.moneda) : '-'}</td>
					<td class="main-td money">${this.formatPdfCurrency(concepto.importe, factura.moneda)}</td>
				</tr>`;
		}).join('');
		const tax_totals = this.getTaxTotalRows(all_impuestos);
		const resume_rows = [
			{ label: 'Subtotal', amount: this.formatPdfCurrencyWithCode(factura.subtotal, factura.moneda) },
			{ label: 'Descuento', amount: this.formatPdfCurrencyWithCode(factura.descuento, factura.moneda) },
			...tax_totals.map(tax => ({ label: tax.label, amount: this.formatPdfCurrencyWithCode(tax.amount, factura.moneda) })),
			{ label: 'Total', amount: this.formatPdfCurrencyWithCode(factura.total, factura.moneda) }
		];
		const payment_details_html = `
			<div><span class="label">Metodo de Pago:</span> ${this.escapeHtml(this.getMetodoPagoLabel(factura.metodoPago))}</div>
			<div><span class="label">Forma de Pago:</span> ${this.escapeHtml(this.getFormaPagoLabel(factura.formaPago))}</div>
			<div><span class="label">Moneda:</span> ${this.escapeHtml(factura.moneda)}</div>
			<div><span class="label">Condiciones de Pago:</span> ${this.escapeHtml(factura.condicionesPago)}</div>`;
		const summary_rows_html = resume_rows.map((row, index) => {
			const details_cell = index === 0
				? `<td colspan="3" rowspan="${resume_rows.length}" class="main-td summary-details">${payment_details_html}</td>`
				: '';
			return `
				<tr>
					${details_cell}
					<td colspan="2" class="resume-label-main">${this.escapeHtml(row.label)}</td>
					<td class="resume-amount-main">${this.escapeHtml(row.amount)}</td>
				</tr>`;
		}).join('');

		return `
			<!doctype html>
			<html>
			<head>
				<meta charset="utf-8">
				<style>
					body { font-family: Arial, Helvetica, sans-serif; color: ${business_color}; font-size: 9px; margin: 0; }
					.invoice { width: 100%; color: ${business_color}; }
					.main-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
					.main-th { padding: 5px 6px; border: 0; background: ${business_color}; color: #fff; font-weight: bold; text-align: center; }
					.main-td { padding: 4px 6px; vertical-align: top; border: 0; }
					.no-border { border: 0 !important; }
					.factura-title { border: 1px solid #111; border-bottom: 0; border-radius: 8px 8px 0 0; padding: 7px 6px; }
					.factura-box { border: 1px solid #111; border-top: 0; border-radius: 0 0 8px 8px; padding: 5px 6px 8px; }
					.header-cell { color: #111; text-align: center; font-weight: bold; }
					.header-cell .serie { color: #e50000; font-size: 12px; margin-bottom: 2px; }
					.header-label { color: #111; font-size: 10px; font-weight: bold; line-height: 1.05; margin-top: 3px; }
					.header-value { color: ${business_color}; font-size: 8px; font-weight: bold; line-height: 1.1; overflow-wrap: anywhere; }
					.label { font-weight: bold; color: #111; }
					.small { font-size: 8px; }
					.money, .num { text-align: right; white-space: nowrap; }
					.alt td { background: #eaf2ff; }
					.logo-cell { text-align: center; vertical-align: middle; }
					.logo { max-width: 150px; max-height: 85px; object-fit: contain; }
					.seal-body { padding: 5px; font-size: 6.6px; line-height: 1.25; color: ${business_color}; overflow-wrap: anywhere; }
					.footer-title { display: block; width: 100%; box-sizing: border-box; background: ${business_color}; color: #fff; font-size: 8px; font-weight: bold; text-align: center; padding: 4px; margin: 0 0 4px; border-radius: 5px 5px 0 0; }
					.footer-block { margin-bottom: 5px; }
					.footer-block b { display: block; color: #111; font-size: 7px; margin-bottom: 2px; }
					.summary-details { color: ${business_color}; }
					.summary-details div { white-space: nowrap; }
					.resume-label-main { padding: 5px 8px; border: 0; background: ${business_color}; color: #fff; font-weight: bold; text-align: right; white-space: nowrap; }
					.resume-amount-main { padding: 5px 8px; border: 0; color: ${business_color}; text-align: right; white-space: nowrap; }
					.qr { width: 170px; height: 170px; }
					.disclaimer { margin-top: 8px; text-align: center; color: ${business_color}; font-size: 10px; }
				</style>
			</head>
			<body>
				<div class="invoice">
					<table class="main-table">
						<tbody>
							<tr>
								<td colspan="2" rowspan="2" class="main-td logo-cell"><img class="logo" src="${this.escapeHtml(logo_url)}"></td>
								<th colspan="2" class="main-th">Emisor</th>
								<th colspan="2" class="main-th factura-title">${this.escapeHtml(this.getTipoComprobanteLabel(factura.tipoComprobante))} - VERSION 4.0</th>
							</tr>
							<tr>
								<td colspan="2" class="main-td">
									<div><span class="label">RFC:</span> ${this.escapeHtml(factura.emisorRfc)}</div>
									<div><span class="label">Razon Social:</span> ${this.escapeHtml(factura.emisorNombre)}</div>
									<div><span class="label">Regimen Fiscal:</span> ${this.escapeHtml(factura.emisorRegimen)}</div>
								</td>
								<td colspan="2" class="main-td header-cell factura-box">
									<div class="serie">${this.escapeHtml((factura.serie + ' ' + factura.folio).trim())}</div>
									<div class="header-label">No. de serie del CSD del emisor</div>
									<div class="header-value">${this.escapeHtml(factura.noCertificado)}</div>
									<div class="header-label">Fecha y Hora de emision</div>
									<div class="header-value">${this.escapeHtml(factura.fecha)}</div>
									<div class="header-label">Folio Fiscal</div>
									<div class="header-value">${this.escapeHtml(factura.uuid)}</div>
								</td>
							</tr>
							<tr>
								<td colspan="3" class="main-td"><span class="label">Lugar de expedicion:</span> ${this.escapeHtml(factura.lugarExpedicion)}</td>
								<td colspan="3" class="main-td"><span class="label">Tipo de Cambio:</span> ${this.escapeHtml(factura.tipoCambio || '1')}</td>
							</tr>
							<tr>
								<th colspan="2" class="main-th">Fecha y hora de certificacion</th>
								<th colspan="2" class="main-th">No. de serie del CSD del SAT</th>
								<th colspan="2" class="main-th">Forma de Pago</th>
							</tr>
							<tr>
								<td colspan="2" class="main-td num">${this.escapeHtml(factura.fechaTimbrado)}</td>
								<td colspan="2" class="main-td num">${this.escapeHtml(factura.noCertificadoSat)}</td>
								<td colspan="2" class="main-td">${this.escapeHtml(this.getFormaPagoLabel(factura.formaPago))}</td>
							</tr>
							<tr>
								<th colspan="6" class="main-th">Receptor</th>
							</tr>
							<tr>
								<td colspan="3" class="main-td"><span class="label">RFC:</span> ${this.escapeHtml(factura.receptorRfc)}</td>
								<td colspan="3" class="main-td"><span class="label">Regimen Fiscal Receptor:</span> ${this.escapeHtml(factura.receptorRegimen)}</td>
							</tr>
							<tr>
								<td colspan="3" class="main-td"><span class="label">Razon Social:</span> ${this.escapeHtml(factura.receptorNombre)}</td>
								<td colspan="3" class="main-td"><span class="label">Domicilio Fiscal Receptor:</span> ${this.escapeHtml(factura.receptorDomicilio)}</td>
							</tr>
							<tr>
								<td colspan="3" class="main-td"><span class="label">Uso de CFDI:</span> ${this.escapeHtml(factura.usoCfdi)}</td>
								<td colspan="3" class="main-td"><span class="label">Cliente/Entrega:</span> ${this.escapeHtml(order?.client_name || client?.name || '')} ${this.escapeHtml([order?.address, order?.suburb, order?.city, order?.state].filter(Boolean).join(', '))}</td>
							</tr>
							${agent_html}
							<tr>
								<th class="main-th">Cantidad</th>
								<th class="main-th">Clave Unidad</th>
								<th class="main-th">Descripcion</th>
								<th class="main-th">Valor Unitario</th>
								<th class="main-th">Descuento</th>
								<th class="main-th">Importe</th>
							</tr>
							${conceptos_html}
							${summary_rows_html}
						</tbody>
						<tfoot>
							<tr>
								<td colspan="4" class="main-td seal-body">
									<div class="footer-block">
										<b>Cadena original del complemento de certificacion digital del SAT</b>
										<div>${this.wrapSatText(factura.cadenaOriginal)}</div>
									</div>
									<div class="footer-block">
										<b>Sello digital del emisor</b>
										<div>${this.wrapSatText(factura.sello || factura.selloCfd)}</div>
									</div>
									<div class="footer-block">
										<b>Sello digital del SAT</b>
										<div>${this.wrapSatText(factura.selloSat)}</div>
									</div>
								</td>
								<td colspan="2" class="main-td" style="text-align:center;">
									<img class="qr" src="${this.escapeHtml(factura.qrUrl)}">
									<div class="disclaimer">Este documento es una representación impresa de un CFDI</div>
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</body>
			</html>`;
	}

	private getXmlElements(parent: Document | Element, local_name: string): Element[] {
		return Array.from(parent.getElementsByTagName('*')).filter((element) => element.localName === local_name);
	}

	private getFirstXmlElement(parent: Document | Element, local_name: string): Element | null {
		return this.getXmlElements(parent, local_name)[0] || null;
	}

	private getXmlAttribute(element: Element | null, attribute_name: string): string {
		return element?.getAttribute(attribute_name) || '';
	}

	private getXmlNumber(element: Element | null, attribute_name: string): number {
		const value = parseFloat(this.getXmlAttribute(element, attribute_name));
		return Number.isFinite(value) ? value : 0;
	}

	private getConceptoImpuestos(parent: Element | null): FacturaPdfImpuesto[] {
		if (!parent) {
			return [];
		}

		return [
			...this.getXmlElements(parent, 'Traslado').map((impuesto) => this.getImpuestoData(impuesto, 'Traslado' as const)),
			...this.getXmlElements(parent, 'Retencion').map((impuesto) => this.getImpuestoData(impuesto, 'Retencion' as const))
		];
	}

	private getImpuestoData(element: Element, tipo: 'Traslado' | 'Retencion'): FacturaPdfImpuesto {
		return {
			tipo,
			impuesto: this.getXmlAttribute(element, 'Impuesto'),
			tipoFactor: this.getXmlAttribute(element, 'TipoFactor'),
			tasaOCuota: this.getXmlAttribute(element, 'TasaOCuota'),
			base: this.getXmlNumber(element, 'Base'),
			importe: this.getXmlNumber(element, 'Importe')
		};
	}

	private buildCadenaOriginal(factura: FacturaPdfData): string {
		return `||${factura.timbreVersion}|${factura.uuid}|${factura.fechaTimbrado}|${factura.rfcProvCertif}|${factura.selloCfd}|${factura.noCertificadoSat}||`;
	}

	private buildSatQrUrl(factura: FacturaPdfData): string {
		const total = factura.total.toFixed(6).padStart(17, '0');
		const seal = (factura.selloCfd || factura.sello).slice(-8);
		const verification_url = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${factura.uuid}&re=${factura.emisorRfc}&rr=${factura.receptorRfc}&tt=${total}&fe=${seal}`;

		return `https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(verification_url)}`;
	}

	private getTipoComprobanteLabel(tipo: string): string {
		const labels: Record<string, string> = {
			I: 'I - Ingreso',
			E: 'E - Egreso',
			P: 'P - Pago',
			N: 'N - Nomina',
			T: 'T - Traslado'
		};

		return labels[tipo] || tipo;
	}

	private getImpuestoLabel(impuesto: string): string {
		const labels: Record<string, string> = {
			'001': 'ISR',
			'002': 'IVA',
			'003': 'IEPS'
		};

		return labels[impuesto] || impuesto;
	}

	private getMetodoPagoLabel(metodo: string): string {
		const labels: Record<string, string> = {
			PUE: 'PUE - Pago en una sola exhibicion',
			PPD: 'PPD - Pago en parcialidades o diferido'
		};

		return labels[metodo] || metodo;
	}

	private getFormaPagoLabel(forma: string): string {
		const labels: Record<string, string> = {
			'01': '01 - Efectivo',
			'02': '02 - Cheque nominativo',
			'03': '03 - Transferencia electronica de fondos',
			'04': '04 - Tarjeta de credito',
			'28': '28 - Tarjeta de debito',
			'99': '99 - Por definir'
		};

		return labels[forma] || forma;
	}

	private getTaxTotalRows(impuestos: FacturaPdfImpuesto[]): {label: string; amount: number}[] {
		const totals = new Map<string, {label: string; amount: number}>();

		for (const impuesto of impuestos) {
			const rate = impuesto.tasaOCuota ? ` ${impuesto.tasaOCuota}` : '';
			const sign = impuesto.tipo === 'Retencion' ? 'Ret. ' : '';
			const label = `${sign}${this.getImpuestoLabel(impuesto.impuesto)} ${impuesto.tipoFactor || ''}${rate}`.trim();
			const current = totals.get(label) || { label, amount: 0 };
			current.amount += impuesto.importe;
			totals.set(label, current);
		}

		return Array.from(totals.values()).filter(total => total.amount !== 0);
	}

	private formatPdfDate(date_string: string): string {
		if (!date_string) {
			return '';
		}

		const date = new Date(date_string);

		if (Number.isNaN(date.getTime())) {
			return date_string;
		}

		return date.toLocaleString('es-MX', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	private formatPdfCurrency(value: number, currency: string): string {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: currency || 'MXN'
		}).format(value);
	}

	private formatPdfCurrencyWithCode(value: number, currency: string): string {
		const currency_id = currency || 'MXN';
		return `${this.formatPdfNumber(value)} ${currency_id}`;
	}

	private formatPdfNumber(value: number): string {
		return new Intl.NumberFormat('es-MX', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 6
		}).format(value);
	}

	private wrapSatText(value: string, chunk_size: number = 120): string {
		if (!value) {
			return '';
		}

		const chunks = value.match(new RegExp(`.{1,${chunk_size}}`, 'g')) || [];
		return chunks.map(chunk => this.escapeHtml(chunk)).join('<br>');
	}

	private getFacturaPdfDownloadName(factura: FacturaPdfData): string {
		const folio = `${factura.serie || ''}${factura.folio || ''}`.trim() || this.order_id?.toString() || 'xml';
		return `factura-${folio}.pdf`;
	}

	private escapeHtml(value: string): string {
		return value
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	parseConceptosFromXml(xmlString: string): CfdiConcepto[] {
		const parser = new DOMParser();
		const dom: XMLDocument = parser.parseFromString(xmlString, "application/xml");
		let conceptos: CfdiConcepto[] = [];

		const getByTag = (el: Element | Document, tag: string) => {
			let result = el.getElementsByTagName("cfdi:" + tag);
			if (result.length === 0) {
				result = el.getElementsByTagName(tag);
			}
			return result;
		};

		let conceptosElements = getByTag(dom, "Concepto");

		for (let i = 0; i < conceptosElements.length; i++) {
			let element = conceptosElements.item(i) as Element;
			let descripcion = element.getAttribute('Descripcion') || '';
			let importe = parseFloat(element.getAttribute('Importe') || '0');
			let descuento = parseFloat(element.getAttribute('Descuento') || '0');
			let cantidad = parseFloat(element.getAttribute('Cantidad') || '0');
			let valorUnitario = parseFloat(element.getAttribute('ValorUnitario') || '0');

			let totalIva = 0;
			let totalIeps = 0;
			let totalTraslados = 0;
			let totalRetenciones = 0;

			let impuestosElements = getByTag(element, "Impuestos");
			if (impuestosElements.length > 0) {
				let impuestos = impuestosElements.item(0) as Element;

				let trasladoElements = getByTag(impuestos, "Traslado");
				for (let j = 0; j < trasladoElements.length; j++) {
					let traslado = trasladoElements.item(j) as Element;
					let impImporte = parseFloat(traslado.getAttribute('Importe') || '0');
					let impuesto = traslado.getAttribute('Impuesto') || '';

					if (impuesto === '002') {
						totalIva += impImporte;
					} else if (impuesto === '003') {
						totalIeps += impImporte;
					}
					totalTraslados += impImporte;
				}

				let retencionElements = getByTag(impuestos, "Retencion");
				for (let j = 0; j < retencionElements.length; j++) {
					let retencion = retencionElements.item(j) as Element;
					let impImporte = parseFloat(retencion.getAttribute('Importe') || '0');
					totalRetenciones += impImporte;
				}
			}

			conceptos.push({
				descripcion,
				cantidad,
				valorUnitario,
				importe: importe - descuento,
				descuento,
				claveUnidad: element.getAttribute('ClaveUnidad') || '',
				unidad: element.getAttribute('Unidad') || '',
				search_str: '',
				totalIva,
				totalIeps,
				totalTraslados,
				totalRetenciones,
				note: descripcion
			});
		}

		return conceptos;
	}

	matchConceptosWithItems() {
		if (this.cfdi_conceptos.length === 0) {
			this.loading_cfdi = false;
			this.rest.showError('No se encontraron conceptos en el XML');
			return;
		}

		const searchPromises = this.cfdi_conceptos.map(concepto => {
			return this.rest_item_info.search({
				search_extra: { category_name: concepto.descripcion, status: 'ACTIVE' },
				limit: 1
			} as any).toPromise();
		});

		Promise.all(searchPromises)
			.then(results => {
				results.forEach((response: any, index) => {
					if (response && response.data && response.data.length > 0) {
						this.cfdi_conceptos[index].matched_item = response.data[0];
					}
				});
				this.loading_cfdi = false;
			})
			.catch(error => {
				console.error('Error al emparejar artículos', error);
				this.rest.showWarning('Ocurrió un error al buscar coincidencias automáticas de artículos.');
				this.loading_cfdi = false;
			});
	}

	selectItemForConcepto(concepto: CfdiConcepto, itemInfo: ItemInfo) {
		concepto.matched_item = itemInfo;
		concepto.search_str = '';
	}

	clearConceptoMatch(concepto: CfdiConcepto) {
		concepto.matched_item = undefined;
		concepto.search_str = '';
	}

	getMatchedCount(): number {
		return this.cfdi_conceptos.filter(c => c.matched_item).length;
	}

	getUnmatchedCount(): number {
		return this.cfdi_conceptos.filter(c => !c.matched_item).length;
	}

	getTotalXml(): number {
		return this.cfdi_conceptos.reduce((acc, c) => acc + c.importe + c.totalTraslados - c.totalRetenciones, 0);
	}

	createOrder() {
		if (!this.selected_client) {
			this.rest.showError('Por favor seleccione un cliente');
			return;
		}

		if (!this.selected_store_id) {
			this.rest.showError('Por favor seleccione una sucursal');
			return;
		}

		if (this.cfdi_conceptos.length === 0) {
			this.rest.showError('No se han cargado conceptos del XML');
			return;
		}

		if (this.getUnmatchedCount() > 0) {
			this.rest.showError('Por favor asigne un artículo coincidente del inventario a todos los conceptos del XML');
			return;
		}

		this.is_saving = true;

		try {
			const store = this.store_list.find(x => x.id === this.selected_store_id) as Store;
			let price_type = this.price_type_list.find(pt => pt.id === this.selected_client?.price_type_id) || this.price_type_list[0];
			if (!price_type) {
				price_type = GetEmpty.price_type();
			}

			const order_builder = new OrderBuilder(this.rest, price_type, store, this.rest.user as User);

			// Set client
			order_builder.user_client = this.selected_client;

			// Set order details
			order_builder.order_info.order.currency_id = this.factura_metadata?.moneda || 'MXN';
			order_builder.order_info.order.note = 'Creado desde XML Factura' + (this.factura_metadata?.folio ? ' Folio: ' + this.factura_metadata.folio : '');
			order_builder.order_info.order.sat_receptor_rfc = this.factura_metadata?.rfcReceptor || null;
			order_builder.order_info.order.sat_razon_social = this.factura_metadata?.receptor || null;
			order_builder.order_info.order.sat_domicilio_fiscal_receptor = this.factura_metadata?.domicilioReceptor || '';
			order_builder.order_info.order.sat_regimen_fiscal_receptor = this.factura_metadata?.regimenFiscalReceptor || '';

			// Add items
			for (const concepto of this.cfdi_conceptos) {
				const item_info = concepto.matched_item!;

				// Ensure item has a stock record for the selected store to avoid OrderBuilder crashing
				if (item_info.item.availability_type === 'ON_STOCK') {
					const has_stock = item_info.records.some(sr => sr.store_id === store.id);
					if (!has_stock) {
						const dummy_stock_record: Stock_Record = {
							id: 0,
							store_id: store.id,
							item_id: item_info.item.id,
							qty: 0,
							movement_qty: 0,
							movement_type: 'ADJUSTMENT',
							previous_qty: 0,
							created: new Date(),
							updated: new Date(),
							created_by_user_id: 0,
							updated_by_user_id: 0,
							description: null,
							is_current: null,
							order_item_id: null,
							production_item_id: null,
							purchase_detail_id: null,
							serial_number_record_id: null,
							shipping_item_id: null
						};
						item_info.records.push(dummy_stock_record);
					}
				}

				order_builder.addItemInfoWithPriceNumber(
					item_info,
					concepto.cantidad,
					concepto.valorUnitario,
					this.factura_metadata?.moneda || 'MXN',
					concepto.note || concepto.descripcion,
					'NO'
				);
			}

			order_builder.updateOrderTotal();

			const order_info = order_builder.order_info;
			const order_total = this.getTotalXml();

			let rest_user = this.rest.initRestSimple<User>('user');

			const client_balance = Number((this.selected_client as any).balance || 0);
			const debt = client_balance < 0 ? -client_balance : 0;
			const total_required_credit = debt + order_total;

			const current_credit_limit = Number(this.selected_client.credit_limit || 0);
			const target_credit_limit = Math.max(current_credit_limit, total_required_credit + 1000);

			const client_update$ = rest_user.update({ id: this.selected_client.id, credit_limit: target_credit_limit } as any);

			this.subs.sink = client_update$.pipe(
				mergeMap((updatedClient) => {
					this.selected_client = updatedClient;
					order_builder.user_client = updatedClient;
					order_info.order.client_user_id = updatedClient.id;

					return this.rest_order_info.create(order_info).pipe(
						mergeMap((response) => {
							return forkJoin({
								order_info: of(response),
								close: this.rest.update('closeOrder', { order_id: response.order.id })
							});
						})
					);
				})
			).subscribe({
				next: (result) => {
					this.is_saving = false;
					this.rest.showSuccess('Pedido creado y cerrado exitosamente con ID #' + result.order_info.order.id);
					this.router.navigate(['/dashboard']);
				},
				error: (error) => {
					this.is_saving = false;
					this.rest.showError(error);
				}
			});

		} catch (e: any) {
			this.is_saving = false;
			this.rest.showError(e.message || 'Error al construir el pedido');
		}
	}

	searchClientFromXml() {
		if (!this.factura_metadata || !this.factura_metadata.receptor) return;

		let rest_user = this.rest.initRestSimple<User>('user');
		this.subs.sink = rest_user.search({
			eq: { type: 'CLIENT', status: 'ACTIVE' },
			lk: { name: this.factura_metadata.receptor },
			limit: 1
		}).subscribe({
			next: (response) => {
				if (response.data && response.data.length > 0) {
					this.selected_client = response.data[0];
					this.rest.showSuccess('Cliente coincidente encontrado y seleccionado: ' + this.selected_client.name);
				} else {
					this.selected_client = null;
					this.rest.showWarning('No se encontró un cliente con el nombre: ' + this.factura_metadata!.receptor);
				}
			},
			error: (error) => {
				console.error('Error al buscar cliente', error);
			}
		});
	}

	createClientFromXml() {
		if (!this.factura_metadata || !this.factura_metadata.receptor) return;

		this.is_saving = true;

		let rest_user = this.rest.initRestSimple<User>('user');
		let rest_address = this.rest.initRestSimple<any>('address');

		let user_data: Partial<User> = {
			name: this.factura_metadata.receptor,
			type: 'CLIENT',
			status: 'ACTIVE',
			credit_limit: this.getTotalXml() + 1000
		};

		this.subs.sink = rest_user.create(user_data).pipe(
			mergeMap(newClient => {
				let address_data = {
					user_id: newClient.id,
					name: this.factura_metadata!.receptor,
					rfc: this.factura_metadata!.rfcReceptor,
					zipcode: this.factura_metadata!.domicilioReceptor,
					sat_regimen_fiscal: this.factura_metadata!.regimenFiscalReceptor,
					type: 'BILLING',
					status: 'ACTIVE'
				};
				return rest_address.create(address_data).pipe(
					mergeMap(() => {
						return rest_user.update({ id: newClient.id, credit_limit: this.getTotalXml() + 1000 } as any);
					})
				);
			})
		).subscribe({
			next: (newClient) => {
				this.is_saving = false;
				this.selected_client = newClient;
				this.rest.showSuccess('Cliente registrado y seleccionado exitosamente');
			},
			error: (error) => {
				this.is_saving = false;
				this.rest.showError(error);
			}
		});
	}

	reset() {
		this.xml_attachment_id = null;
		this.xml_attachment_info = null;
		this.factura_metadata = null;
		this.cfdi_conceptos = [];
		this.selected_client = null;
	}
}

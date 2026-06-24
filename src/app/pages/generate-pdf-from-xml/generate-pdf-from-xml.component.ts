import { CommonModule } from '@angular/common';
import { Component, Injector, OnInit } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { LoadingComponent } from '../../components/loading/loading.component';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { OrderInfo } from '../../modules/shared/Models';
import { Sat_Factura, Store, User } from '../../modules/shared/RestModels';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple } from '../../modules/shared/services/Rest';
import { environment } from '../../../environments/environment';

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

type PdfOrderInfo = OrderInfo & {
	sat_factura?:Sat_Factura | null;
};

@Component({
	selector: 'app-generate-pdf-from-xml',
	templateUrl: './generate-pdf-from-xml.component.html',
	styleUrls: ['./generate-pdf-from-xml.component.css'],
	standalone: true,
	imports: [CommonModule, LoadingComponent]
})
export class GeneratePdfFromXmlComponent extends BaseComponent implements OnInit
{
	order_info:PdfOrderInfo | null = null;
	order_id:number | null = null;
	xml_attachment_id:number | null = null;
	store_list:Store[] = [];
	selected_store_id:number | null = null;
	is_generating_pdf:boolean = false;

	private rest_store!:RestSimple<Store>;
	private rest_order_info!:RestSimple<PdfOrderInfo>;
	private rest_user!:RestSimple<User>;

	constructor(injector:Injector)
	{
		super(injector);
	}

	ngOnInit():void
	{
		this.setTitle('Generar PDF desde XML (CFDI)');
		this.rest_store = this.rest.initRestSimple<Store>('store');
		this.rest_order_info = this.rest.initRestSimple<PdfOrderInfo>('order_info');
		this.rest_user = this.rest.initRestSimple<User>('user');

		const route_order_id = Number(this.route.snapshot.paramMap.get('order_id'));
		this.order_id = Number.isFinite(route_order_id) && route_order_id > 0 ? route_order_id : null;

		if (!this.order_id)
		{
			this.rest.showError('El ID de la orden es requerido');
			return;
		}

		this.is_loading = true;
		this.subs.sink = forkJoin({
			order_info: this.rest_order_info.get(this.order_id),
			stores: this.rest_store.search({ limit: 9999, sort_order: ['name_ASC'] })
		}).subscribe({
			next: (response) => {
				this.order_info = response.order_info;
				this.store_list = response.stores.data;
				this.selected_store_id = this.order_info.order.store_id || this.order_info.store?.id || null;
				this.xml_attachment_id = this.order_info.sat_factura?.xml_attachment_id || null;
				this.is_loading = false;

				if (!this.xml_attachment_id)
				{
					this.rest.showError('La orden no tiene XML de factura relacionado');
					return;
				}

				this.downloadFacturaPdfFromXml();
			},
			error: (error) => {
				this.is_loading = false;
				this.rest.showError(error);
			}
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
		const agent_id = this.order_info?.client?.created_by_user_id
			|| this.order_info?.order?.cashier_user_id;

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
}

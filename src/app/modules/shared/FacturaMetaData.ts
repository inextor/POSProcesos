export class FacturaMetaData
{
	private static regimenFiscalDescriptions: { [key: string]: string } = {
		'601': 'REGIMEN GENERAL DE LEY PERSONAS MORALES',
		'602': 'RÉGIMEN SIMPLIFICADO DE LEY PERSONAS MORALES',
		'603': 'PERSONAS MORALES CON FINES NO LUCRATIVOS',
		'604': 'RÉGIMEN DE PEQUEÑOS CONTRIBUYENTES',
		'605': 'RÉGIMEN DE SUELDOS Y SALARIOS E INGRESOS ASIMILADOS A SALARIOS',
		'606': 'RÉGIMEN DE ARRENDAMIENTO',
		'607': 'RÉGIMEN DE ENAJENACIÓN O ADQUISICIÓN DE BIENES',
		'608': 'RÉGIMEN DE LOS DEMÁS INGRESOS',
		'609': 'RÉGIMEN DE CONSOLIDACIÓN',
		'610': 'RÉGIMEN RESIDENTES EN EL EXTRANJERO SIN ESTABLECIMIENTO PERMANENTE EN MÉXICO',
		'611': 'RÉGIMEN DE INGRESOS POR DIVIDENDOS (SOCIOS Y ACCIONISTAS)',
		'612': 'RÉGIMEN DE LAS PERSONAS FÍSICAS CON ACTIVIDADES EMPRESARIALES Y PROFESIONALES',
		'613': 'RÉGIMEN INTERMEDIO DE LAS PERSONAS FÍSICAS CON ACTIVIDADES EMPRESARIALES',
		'614': 'RÉGIMEN DE LOS INGRESOS POR INTERESES',
		'615': 'RÉGIMEN DE LOS INGRESOS POR OBTENCIÓN DE PREMIOS',
		'616': 'SIN OBLIGACIONES FISCALES',
		'617': 'PEMEX',
		'618': 'RÉGIMEN SIMPLIFICADO DE LEY PERSONAS FÍSICAS',
		'619': 'INGRESOS POR LA OBTENCIÓN DE PRÉSTAMOS',
		'620': 'SOCIEDADES COOPERATIVAS DE PRODUCCIÓN QUE OPTAN POR DIFERIR SUS INGRESOS.',
		'621': 'RÉGIMEN DE INCORPORACIÓN FISCAL',
		'622': 'RÉGIMEN DE ACTIVIDADES AGRÍCOLAS, GANADERAS, SILVÍCOLAS Y PESQUERAS PM',
		'623': 'RÉGIMEN DE OPCIONAL PARA GRUPOS DE SOCIEDADES',
		'624': 'RÉGIMEN DE LOS COORDINADOS',
		'625': 'RÉGIMEN DE LAS ACTIVIDADES EMPRESARIALES CON INGRESOS A TRAVÉS DE PLATAFORMAS TECNOLÓGICAS.',
		'626': 'RÉGIMEN SIMPLIFICADO DE CONFIANZA'
	};

	// Comprobante attributes
	Fecha: string = '';
	folio: string = '';
	total: string = '';
	moneda: string = '';
	noCertificado: string = '';
	lugarExpedicion: string = '';

	// TimbreFiscalDigital
	UUID: string = '';
	verificador: string = '';

	// Emisor
	emisor: string = '';
	rfcEmisor: string = '';

	// Receptor
	receptor: string = '';
	rfcReceptor: string = '';
	domicilioReceptor: string = '';
	regimenFiscalReceptor: string = '';
	regimenFiscalReceptorDescription: string = '';

	constructor(xmlString: string)
	{
		if (!xmlString || xmlString.trim() === '')
		{
			return;
		}

		try
		{
			const parser = new DOMParser();
			const dom: XMLDocument = parser.parseFromString(xmlString, 'application/xml');

			// Parse Comprobante attributes
			const comprobante = dom.getElementsByTagName('cfdi:Comprobante');
			const compEl = comprobante.length > 0 ? (comprobante.item(0) as Element) : (dom.getElementsByTagName('Comprobante').item(0) as Element);
			if (compEl)
			{
				this.Fecha = compEl.getAttribute('Fecha') || '';
				this.folio = compEl.getAttribute('Folio') || '';
				this.total = compEl.getAttribute('Total') || '';
				this.moneda = compEl.getAttribute('Moneda') || '';
				this.noCertificado = compEl.getAttribute('NoCertificado') || '';
				this.lugarExpedicion = compEl.getAttribute('LugarExpedicion') || '';

				// Get last 8 characters of Sello for verification
				const sello = compEl.getAttribute('Sello') || '';
				this.verificador = sello.slice(-8);
			}

			// Parse TimbreFiscalDigital for UUID
			const timbre = dom.getElementsByTagName('tfd:TimbreFiscalDigital');
			const tfdEl = timbre.length > 0 ? (timbre.item(0) as Element) : (dom.getElementsByTagName('TimbreFiscalDigital').item(0) as Element);
			if (tfdEl)
			{
				this.UUID = tfdEl.getAttribute('UUID') || '';
			}

			// Parse Emisor
			const emisorElements = dom.getElementsByTagName('cfdi:Emisor');
			const emisorEl = emisorElements.length > 0 ? (emisorElements.item(0) as Element) : (dom.getElementsByTagName('Emisor').item(0) as Element);
			if (emisorEl)
			{
				this.emisor = emisorEl.getAttribute('Nombre') || '';
				this.rfcEmisor = emisorEl.getAttribute('Rfc') || '';
			}

			// Parse Receptor
			const receptorElements = dom.getElementsByTagName('cfdi:Receptor');
			const receptorEl = receptorElements.length > 0 ? (receptorElements.item(0) as Element) : (dom.getElementsByTagName('Receptor').item(0) as Element);
			if (receptorEl)
			{
				this.receptor = receptorEl.getAttribute('Nombre') || '';
				this.rfcReceptor = receptorEl.getAttribute('Rfc') || '';
				this.domicilioReceptor = receptorEl.getAttribute('DomicilioFiscalReceptor') || '';
				this.regimenFiscalReceptor = receptorEl.getAttribute('RegimenFiscalReceptor') || '';
				this.regimenFiscalReceptorDescription = this.getRegimenFiscalDescription(this.regimenFiscalReceptor);
			}
		}
		catch (error)
		{
			console.error('Error parsing CFDI XML:', error);
		}
	}

	private getRegimenFiscalDescription(code: string): string
	{
		return FacturaMetaData.regimenFiscalDescriptions[code] || code;
	}
}

export class FacturaMetaData
{
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
			}
		}
		catch (error)
		{
			console.error('Error parsing CFDI XML:', error);
		}
	}
}

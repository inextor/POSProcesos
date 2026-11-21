import { Sat_Factura } from '../modules/shared/RestModels';

export interface CreditNoteAmountRow
{
	index: number;
	amount: number;
	iva: string;
	isr: string | null;
	ieps: string | null;
}

export interface CreditNoteAmountPayload
{
	amount: number;
	iva: string;
	isr: string | null;
	ieps: string | null;
}

export interface CfdiConceptoTax
{
	importe: number;
	traslados_importe: number;
	retenciones_importe: number;
	iva: string | null;
	ieps: string | null;
	isr: string | null;
	has_ieps_cuota: boolean;
	has_unsupported_retencion: boolean;
}

export interface CfdiTaxGroup
{
	iva: string;
	ieps: string | null;
	isr: string | null;
	concepto_count: number;
	total: number;
	has_ieps_cuota: boolean;
}

export interface CfdiTaxGroups
{
	groups: CfdiTaxGroup[];
	ungrouped_count: number;
	ungrouped_total: number;
}

const IVA_RATES = ['0', '8', '16'];
const IVA_EXENTO = ['exento', 'exempt'];

const IMPUESTO_IVA = '002';
const IMPUESTO_IEPS = '003';
const IMPUESTO_ISR = '001';

export interface CreditNoteFormaPagoOption
{
	value: string;
	label: string;
}

export const CREDIT_NOTE_FORMA_PAGO_DEFAULT = '15';

export const CREDIT_NOTE_FORMA_PAGO_OPTIONS: CreditNoteFormaPagoOption[] =
[
	{ value: '15', label: '15 - Condonación' },
	{ value: '17', label: '17 - Compensación' },
	{ value: '99', label: '99 - Por definir' },
	{ value: '03', label: '03 - Transferencia' }
];

export function normalizeCreditNoteFormaPago(value: string | null | undefined): string
{
	let v = (value ?? '').trim();

	for (let option of CREDIT_NOTE_FORMA_PAGO_OPTIONS)
	{
		if (option.value == v)
			return v;
	}

	return CREDIT_NOTE_FORMA_PAGO_DEFAULT;
}

export const CREDIT_NOTE_SERIE_DEFAULT = 'A';

export function normalizeCreditNoteSerie(value: string | null | undefined): string
{
	let v = (value ?? '').trim();

	return v == '' ? CREDIT_NOTE_SERIE_DEFAULT : v;
}

function elementsByLocalName(parent: Element | XMLDocument, local: string): Element[]
{
	let found = parent.getElementsByTagNameNS('*', local);

	if (found.length > 0)
		return Array.from(found) as Element[];

	return Array.from(parent.getElementsByTagName('cfdi:' + local)) as Element[];
}

function attrNumber(el: Element, name: string): number
{
	let raw = el.getAttribute(name);

	if (raw === null || raw === '')
		return NaN;

	return parseFloat(raw);
}

export function fractionToPercentString(fraction: number): string
{
	return String(Math.round(fraction * 10000) / 100);
}

function round2(n: number): number
{
	return Math.round(n * 100) / 100;
}

export function parseCfdiConceptos(xml: string): CfdiConceptoTax[]
{
	let dom = new DOMParser().parseFromString(xml, 'application/xml');

	if (dom.getElementsByTagName('parsererror').length > 0)
		throw new Error('El XML de la factura no se pudo leer');

	return elementsByLocalName(dom, 'Concepto').map((el) =>
	{
		let concepto: CfdiConceptoTax =
		{
			importe: attrNumber(el, 'Importe') || 0,
			traslados_importe: 0,
			retenciones_importe: 0,
			iva: null,
			ieps: null,
			isr: null,
			has_ieps_cuota: false,
			has_unsupported_retencion: false
		};

		for (let t of elementsByLocalName(el, 'Traslado'))
		{
			concepto.traslados_importe = round2(concepto.traslados_importe + (attrNumber(t, 'Importe') || 0));

			let impuesto = (t.getAttribute('Impuesto') || '').trim();
			let tipo_factor = (t.getAttribute('TipoFactor') || '').trim().toLowerCase();

			if (impuesto == IMPUESTO_IVA && concepto.iva === null)
			{
				if (tipo_factor == 'exento')
				{
					concepto.iva = 'exento';
				}
				else
				{
					let tasa = attrNumber(t, 'TasaOCuota');
					concepto.iva = isNaN(tasa) ? null : fractionToPercentString(tasa);
				}
			}
			else if (impuesto == IMPUESTO_IEPS && concepto.ieps === null)
			{
				if (tipo_factor == 'cuota')
				{
					concepto.has_ieps_cuota = true;
				}
				else
				{
					let tasa = attrNumber(t, 'TasaOCuota');
					concepto.ieps = isNaN(tasa) ? null : fractionToPercentString(tasa);
				}
			}
		}

		for (let r of elementsByLocalName(el, 'Retencion'))
		{
			concepto.retenciones_importe = round2(concepto.retenciones_importe + (attrNumber(r, 'Importe') || 0));

			let impuesto = (r.getAttribute('Impuesto') || '').trim();

			if (impuesto == IMPUESTO_ISR && concepto.isr === null)
			{
				let tasa = attrNumber(r, 'TasaOCuota');
				concepto.isr = isNaN(tasa) ? null : fractionToPercentString(tasa);
			}
			else if (impuesto != IMPUESTO_ISR)
			{
				concepto.has_unsupported_retencion = true;
			}
		}

		return concepto;
	});
}

export function groupCfdiConceptsByTax(concepts: CfdiConceptoTax[]): CfdiTaxGroups
{
	let result: CfdiTaxGroups = { groups: [], ungrouped_count: 0, ungrouped_total: 0 };

	for (let c of concepts)
	{
		let line_total = round2(c.importe + c.traslados_importe - c.retenciones_importe);

		if (c.iva === null || c.has_unsupported_retencion)
		{
			result.ungrouped_count++;
			result.ungrouped_total = round2(result.ungrouped_total + line_total);
			continue;
		}

		let key = [c.iva, c.ieps ?? '', c.isr ?? ''].join('|');
		let group = result.groups.find((g) => [g.iva, g.ieps ?? '', g.isr ?? ''].join('|') == key);

		if (!group)
		{
			group = { iva: c.iva, ieps: c.ieps, isr: c.isr, concepto_count: 0, total: 0, has_ieps_cuota: false };
			result.groups.push(group);
		}

		group.concepto_count++;
		group.total = round2(group.total + line_total);
		group.has_ieps_cuota = group.has_ieps_cuota || c.has_ieps_cuota;
	}

	return result;
}

export function formatCfdiTaxGroupLabel(group: CfdiTaxGroup): string
{
	let parts = ['IVA ' + (group.iva == 'exento' ? 'exento' : group.iva + '%')];

	if (group.ieps !== null)
		parts.push('IEPS ' + group.ieps + '%');

	if (group.isr !== null)
		parts.push('ISR ret ' + group.isr + '%');

	return parts.join(' + ');
}

function isExento(value: string): boolean
{
	return IVA_EXENTO.includes(value.trim().toLowerCase());
}

function normalizeRate(value: string | null): string | null
{
	if (value === null || value === undefined)
		return null;

	let trimmed = String(value).trim();

	if (trimmed === '')
		return null;

	return trimmed;
}

function isZeroRate(value: string | null): boolean
{
	let normalized = normalizeRate(value);

	if (normalized === null)
		return true;

	let num = Number(normalized);

	return !isNaN(num) && num === 0;
}

export function validateCreditNoteAmounts(rows: CreditNoteAmountRow[]): string[]
{
	let errors: string[] = [];

	if (rows.length === 0)
	{
		errors.push('Captura el monto de al menos un grupo de impuestos');
		return errors;
	}

	for (let row of rows)
	{
		let label = 'monto #' + row.index;

		if (row.amount === null || row.amount === undefined || isNaN(Number(row.amount)) || Number(row.amount) <= 0)
		{
			errors.push(label + ': captura un monto mayor a cero');
			continue;
		}

		let iva = normalizeRate(row.iva);

		if (iva === null)
		{
			errors.push(label + ': captura el IVA (0, 8, 16 o exento)');
		}
		else if (!isExento(iva) && !IVA_RATES.includes(iva))
		{
			let num = Number(iva);

			if (!isNaN(num) && num > 0 && num < 1)
				errors.push(label + ': el IVA parece fracción (' + iva + '), usa ' + Math.round(num * 100) + ' en lugar de ' + iva);
			else
				errors.push(label + ': IVA inválido (' + iva + '), usa 0, 8, 16 o exento');
		}

		for (let field of ['isr', 'ieps'] as const)
		{
			let rate = normalizeRate(row[field]);

			if (rate === null)
				continue;

			let num = Number(rate);

			if (isNaN(num) || num < 0)
				errors.push(label + ': ' + field.toUpperCase() + ' inválido (' + rate + '), usa un porcentaje o déjalo vacío');
		}
	}

	return errors;
}

export function selectOrderCreditNotes(candidates: Sat_Factura[], order_id: number, parent_sat_factura_ids: number[] = []): Sat_Factura[]
{
	let seen = new Set<number>();
	let result: Sat_Factura[] = [];

	for (let c of candidates)
	{
		if (c.type != 'NOTA_CREDITO')
			continue;

		let by_order = c.order_id == order_id;
		let by_parent = c.parent_sat_factura_id != null && parent_sat_factura_ids.includes(c.parent_sat_factura_id);

		if (!by_order && !by_parent)
			continue;

		if (seen.has(c.id))
			continue;

		seen.add(c.id);
		result.push(c);
	}

	result.sort((a, b) => b.id - a.id);

	return result;
}

export function buildCreditNoteAmountsPayload(rows: CreditNoteAmountRow[]): CreditNoteAmountPayload[]
{
	return rows.map((row) =>
	{
		let iva = normalizeRate(row.iva) as string;

		return {
			amount: Math.round(Number(row.amount) * 100) / 100,
			iva: isExento(iva) ? 'exento' : iva,
			isr: isZeroRate(row.isr) ? null : normalizeRate(row.isr),
			ieps: isZeroRate(row.ieps) ? null : normalizeRate(row.ieps)
		};
	});
}

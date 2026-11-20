import { ItemOptionInfo, OrderItemStructureInfo } from '../modules/shared/Models';

export interface CommandaXmlLine {
	qty: number;
	name: string;
	options: string[];
	note: string;
	exceptions: string;
	has_separator: boolean;
}

export interface CommandaPrintLine extends CommandaXmlLine {
	child_notes: string[];
}

/**
 * Prefix for a comanda child line (`'<Option> <Item>'`).
 * Returns '' when the parent carries no matching option (unknown id or
 * missing options list) so printing never crashes and the child item
 * name still shows.
 */
export function commandaChildOptionPrefix(options: ItemOptionInfo[] | null | undefined, item_option_id: number | null | undefined): string {
	const option = (options || []).find((o) => o?.item_option?.id == item_option_id);
	return option ? option.item_option.name + ' ' : '';
}

/**
 * Table name for the comanda ticket header. Falls back to the raw id
 * when the table is not in the preloaded dictionary so the ticket never
 * prints a blank mesa.
 */
export function tableDisplayName(table_dict: Record<number, string>, table_id: number | null | undefined): string | null {
	if (!table_id) {
		return null;
	}
	return table_dict[table_id] || String(table_id);
}

/**
 * Map structured order items to printable comanda lines. Category prefix
 * follows the display_categories_on_items preference, exactly like the
 * legacy view-commanda page.
 */
export function toCommandaPrintLines(items: OrderItemStructureInfo[], show_categories: boolean): CommandaPrintLine[] {
	return items.map((oii) => {
		const name = (show_categories && oii.category?.name) ? `${oii.category.name} - ${oii.item.name}` : oii.item.name;
		const options: string[] = [];
		const child_notes: string[] = [];
		for (const child of (oii.childs || [])) {
			const child_qty = child.order_item.item_option_qty > 1 ? `${child.order_item.item_option_qty}x ` : '';
			options.push(`${child_qty}${commandaChildOptionPrefix(oii.options, child.order_item.item_option_id)}${child.item.name}`);
			child_notes.push(child.order_item.note || '');
		}
		return {
			qty: oii.order_item.qty,
			name,
			options,
			child_notes,
			note: oii.order_item.note || '',
			exceptions: oii.order_item.exceptions || '',
			has_separator: oii.order_item.has_separator === 'YES'
		};
	});
}

export class CommandaPrint {
	/**
	 * Escape special XML characters
	 */
	private escapeXml(text: string): string {
		if (!text) return '';
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
	}

	/**
	 * Some thermal printers lack the U+2022 bullet glyph (it comes out as
	 * ? or blank), so bullets that reach a USB ticket are emitted as
	 * middle dots (U+00B7), which the printer codepages do cover.
	 */
	private usbSafeText(text: string): string {
		return (text || '').replace(/•/g, '·');
	}

	/**
	 * Same escaping as the print.js txt2html global (textContent escaping
	 * plus newlines to <br>), as a pure function so the browser ticket can
	 * be unit tested without a DOM.
	 */
	escapeBrowserHtml(text: string | null | undefined): string {
		if (!text) return '';
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;')
			.replace(/\n/g, '<br>');
	}

	/**
	 * Kitchen comanda ticket XML: centered header plus one left-aligned
	 * block per item (qty, name, options, note, exceptions). Text-only on
	 * purpose: the encoder wraps each line to the printer's own width, so
	 * the same XML prints on 58mm and 80mm kitchen printers.
	 *
	 * @param ruleWidth Separator width in characters for the active font
	 * (the printer's font-B column count, or the encoder font-A width
	 * as fallback). Each item is followed by a full-width rule: a
	 * reverse-mode black bar (· + spaces + ·) when the item has the
	 * separator flag, `-` (plain ASCII) otherwise.
	 * Non-positive values fall back to a single column so a separator
	 * is always emitted.
	 * @param ruleFont Active font the width was measured in (`'a'` or `'b'`).
	 * @param tableName Table name for the bold double-size header line (dine-in
	 * identifier). Omitted when null/empty.
	 */
	public createCommandaXml(
		orderId: number,
		clientName: string,
		serviceType: string,
		lines: CommandaXmlLine[],
		ruleWidth: number,
		ruleFont: 'a' | 'b' = 'b',
		tableName: string | null = null
	): string {
		// Centered header lines use hardware centering (ESC a): the
		// encoder centers by prepending space padding computed for the
		// final font/size but emitted before the font/size switch, so the
		// padding prints narrow and every centered line lands left of
		// center. Encoder-side alignment stays left (zero padding); the
		// printer itself centers until the matching ESC a 0 reset.
		let xml = '<EscPos>\n';
		xml += '  <Init/>\n';
		xml += '  <Feed lines="1"/>\n';
		xml += '  <Bytes>1b 61 01</Bytes>\n';
		xml += `  <Text justification="left" font="b" fontWidth="2" fontHeight="2">Orden #${orderId}</Text>\n`;
		xml += '  <Feed lines="1"/>\n';
		if (clientName) {
			xml += `  <Text justification="left" font="b">Cliente: ${this.escapeXml(this.usbSafeText(clientName))}</Text>\n`;
			xml += '  <Feed lines="1"/>\n';
		}
		if (serviceType === 'TOGO') {
			xml += '  <Text justification="left" font="b" fontWidth="2" fontHeight="2" bold="true">A DOMICILIO</Text>\n';
			xml += '  <Feed lines="1"/>\n';
		}
		if (serviceType === 'PICK_UP') {
			xml += '  <Text justification="left" font="b" fontWidth="2" fontHeight="2" bold="true">RECOGER</Text>\n';
			xml += '  <Feed lines="1"/>\n';
		}
		// Dine-in tickets carry no service label (not everything is eaten
		// here); the mesa line below identifies them instead.
		if (tableName) {
			xml += `  <Text justification="left" font="b" fontWidth="2" fontHeight="2" bold="true">${this.escapeXml(this.usbSafeText(tableName))}</Text>\n`;
			xml += '  <Feed lines="1"/>\n';
		}
		xml += '  <Bytes>1b 61 00</Bytes>\n';
		const separatorWidth = Math.max(1, Math.floor(ruleWidth || 0));
		// Flagged items get a full-width black bar: GS B reverse mode
		// around · + spaces + ·. Interior spaces survive the encoder
		// wrap, but leading/trailing ones would be dropped, hence the ·
		// ends (a pure-spaces line would print nothing at all).
		const barLine = separatorWidth >= 2 ? `·${' '.repeat(separatorWidth - 2)}·` : '·'.repeat(separatorWidth);
		// Header divider, full width in the active font.
		xml += `  <Text justification="left" font="${ruleFont}">${'='.repeat(separatorWidth)}</Text>\n`;
		xml += '  <Feed lines="1"/>\n';
		for (const line of lines) {
			xml += `  <Text justification="left" font="${ruleFont}">${line.qty} x ${this.escapeXml(this.usbSafeText(line.name))}</Text>\n`;
			xml += '  <Feed lines="1"/>\n';
			if (line.note) {
				xml += `  <Text justification="left" font="${ruleFont}" bold="true">Nota:</Text><Text justification="left" font="${ruleFont}"> ${this.escapeXml(this.usbSafeText(line.note))}</Text>\n`;
				xml += '  <Feed lines="1"/>\n';
			}
			for (const option of line.options || []) {
				xml += `  <Text justification="left" font="${ruleFont}">· ${this.escapeXml(this.usbSafeText(option))}</Text>\n`;
				xml += '  <Feed lines="1"/>\n';
			}
			if (line.exceptions) {
				xml += `  <Text justification="left" font="${ruleFont}">- ${this.escapeXml(this.usbSafeText(line.exceptions))}</Text>\n`;
				xml += '  <Feed lines="1"/>\n';
			}
			if (line.has_separator) {
				xml += '  <Bytes>1d 42 01</Bytes>\n';
				xml += `  <Text justification="left" font="${ruleFont}" bold="true">${this.escapeXml(barLine)}</Text>\n`;
				xml += '  <Bytes>1d 42 00</Bytes>\n';
			} else {
				xml += `  <Text justification="left" font="${ruleFont}">${'-'.repeat(separatorWidth)}</Text>\n`;
			}
			xml += '  <Feed lines="1"/>\n';
		}
		xml += '  <Feed lines="3"/>\n';
		xml += '  <Cut mode="partial"/>\n';
		xml += '</EscPos>';

		return xml;
	}

	/**
	 * Connection test ticket for a USB printer. Same content as the
	 * legacy printer config test ticket.
	 */
	public buildTestXml(printer_name: string | null, printer_model: string | null): string {
		let xml = '<EscPos>\n';
		xml += '  <Init/>\n';
		xml += '  <Text justification="center" bold="true">TEST DE CONEXION</Text>\n';
		xml += '  <Feed lines="1"/>\n';
		xml += '  <Text justification="center">Impresora configurada correctamente</Text>\n';
		xml += '  <Feed lines="1"/>\n';
		xml += `  <Text justification="center">${this.escapeXml(printer_name || 'Sin nombre')}</Text>\n`;
		xml += `  <Text justification="center">Modelo: ${this.escapeXml(printer_model || 'Sin modelo')}</Text>\n`;
		xml += '  <Feed lines="3"/>\n';
		xml += '  <Cut mode="partial"/>\n';
		xml += '</EscPos>';
		return xml;
	}

	/**
	 * Browser fallback ticket for one comanda: same content as the USB
	 * ticket (qty, name, options, notes, exceptions), rendered as HTML
	 * for printHtml. Mirrors the legacy view-commanda browser ticket.
	 */
	public buildCommandaBrowserHtml(
		order_id: number,
		client_name: string | null,
		service_type: string,
		lines: CommandaPrintLine[]
	): string {
		const esc = (text: string | null | undefined): string => this.escapeBrowserHtml(text);
		let items_html = `<h1>Order #${order_id}</h1><h2>${esc(client_name)}</h2>`;
		if (service_type == 'TOGO') {
			items_html += `<h1>A DOMICILIO</h1>`;
		}
		if (service_type == 'PICK_UP') {
			items_html += `<h1>RECOGER</h1>`;
		}
		for (const line of lines) {
			let options_html = '';
			(line.options || []).forEach((option, index) => {
				let child_note = '';
				const note = line.child_notes?.[index];
				if (note) {
					child_note = `<div style="padding-left:20px;white-space:pre-wrap;font-style:italic;margin:0"><b>Nota:</b> ${esc(note)}</div>`;
				}
				options_html += `<div style="padding-left:10px;margin-bottom:8px">· ${esc(option)}${child_note}</div>`;
			});
			let note_html = '';
			if (line.note) {
				note_html = `<div style="padding-left:10px;white-space:pre-wrap;font-style:italic;margin:0"><b>Nota:</b> ${esc(line.note)}</div>`;
			}
			let exceptions_html = '';
			if (line.exceptions) {
				exceptions_html = `<div style="padding-left:10px;white-space:pre-wrap;margin:0"><b>Excep:</b> ${esc(line.exceptions)}</div>`;
			}
			items_html += `<tr><td colspan="2"><hr style="border:none;border-top:1px dashed #000;margin:4px 0"></td></tr><tr><td style="vertical-align:top;font-weight:bold;padding-right:8px;font-size:1.1em;width:30px">${line.qty}</td><td style="word-wrap:break-word;overflow-wrap:break-word">${esc(line.name)}${note_html}${exceptions_html}${options_html}</td></tr>`;
		}
		return '<table style="width:100%;table-layout:fixed"><colgroup><col style="width:30px"><col></colgroup>' + items_html + '</table>';
	}
}

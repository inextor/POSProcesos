import { CustomDOMParser } from './CustomDOMParser.js';

export default class EscposXmlProcessor {

	constructor(encoder, opts) {
		this.default_font = 'a';
		// Per-printer accent replacement pair-string (e.g. "áaÁA..."):
		// every character is followed by its replacement. Empty = keep accents.
		this.accent_map = this._parseAccentMap(opts && opts.accent_map);
		// True while text sits unflushed on the encoder's current line.
		// Newlines are only emitted to terminate such content; a newline on
		// an empty buffer would print a wasted blank line.
		this.pending_text = false;
		if (!encoder) {
			throw new Error("An encoder instance must be provided.");
		}
		this.encoder = encoder;
	}

	// Parses a hex string ("1b 40", "1B40") into byte numbers.
	// Throws on odd length or non-hex characters: silently emitting a
	// wrong byte to a printer is worse than failing the job loudly.
	_hexToBytes(hex) {
		const clean = (hex || '').replace(/\s+/g, '');
		if (clean.length % 2 !== 0) {
			throw new Error(`Invalid hex string (odd length): "${hex}"`);
		}
		if (clean.length > 0 && !/^[0-9a-fA-F]*$/.test(clean)) {
			throw new Error(`Invalid hex string (non-hex characters): "${hex}"`);
		}
		const out = [];
		for (let i = 0; i < clean.length; i += 2) {
			out.push(parseInt(clean.substr(i, 2), 16));
		}
		return out;
	}

	// Pair-string map: every character is followed by its replacement
	// (e.g. "áaÁA" maps á→a and Á→A). A trailing lone character is ignored.
	_parseAccentMap(map) {
		const out = {};
		if (!map) return out;
		const chars = Array.from(map);
		for (let i = 0; i + 1 < chars.length; i += 2) {
			out[chars[i]] = chars[i + 1];
		}
		return out;
	}

	_sanitizeText(text) {
		// Replace unsupported characters with safe alternatives
		// ISO 8859-2 (Latin-2) character range: 0x20-0x7E, 0xA0-0xFF
		return text.split('').map(char => {
			if (this.accent_map[char] !== undefined) {
				return this.accent_map[char];
			}
			// Several printers lack the U+2022 bullet glyph (prints ? or
			// blank): emit it as a middle dot (U+00B7), which they cover.
			if (char === '•') {
				return '·';
			}
			const code = char.charCodeAt(0);
			// Allow basic ASCII (0x20-0x7E) and extended Latin-2 range (0xA0-0xFF)
			if ((code >= 0x20 && code <= 0x7E) || (code >= 0xA0 && code <= 0xFF)) {
				return char;
			}
			// Replace unsupported characters with space
			return ' ';
		}).join('');
	}

	async _processImageAsync(node, attributes, textContent) {
		this.encoder.align(attributes.justification || 'left');
		const imageWidth = attributes.width ? parseInt(attributes.width, 10) : 128;
		const imageHeight = attributes.height ? parseInt(attributes.height, 10) : 128;

		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = imageWidth;
				canvas.height = imageHeight;
				const ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
				const imageData = ctx.getImageData(0, 0, imageWidth, imageHeight);
				this.encoder.image(imageData, imageWidth, imageHeight, 'atkinson');
				resolve();
			};
			img.onerror = () => {
				console.error('Failed to load image');
				resolve();
			};
			img.src = textContent;
		});
	}

	_getAttributes(node) {
		const attrs = {};
		if (node.attributes) {
			for (let i = 0; i < node.attributes.length; i++) {
				const attr = node.attributes[i];
				attrs[attr.name] = attr.value;
			}
		}
		return attrs;
	}

	_feed(attributes) {
		const lines = parseInt(attributes.lines || 1, 10);
		const compact = attributes.spacing === 'compact' && typeof this.encoder.raw === 'function';
		let remaining = lines;
		// A newline that terminates printed text keeps the default spacing:
		// ESC 3 at 18 dots is shorter than a font-A or double-height line
		// and would overlap it. Only true blank lines are compacted.
		if (this.pending_text && remaining > 0) {
			this.encoder.newline();
			remaining--;
		}
		// ESC 3 n sets line spacing in dots; ESC 2 restores the printer default.
		if (compact && remaining > 0) this.encoder.raw([0x1b, 0x33, 18]);
		for (let i = 0; i < remaining; i++) {
			this.encoder.newline();
		}
		if (compact && remaining > 0) this.encoder.raw([0x1b, 0x32]);
		if (lines > 0) this.pending_text = false;
		return lines;
	}

	async _processNode(node) {
		if (node.nodeType !== 1) return;

		const tagName = node.tagName;
		const attributes = this._getAttributes(node);
		const textContent = node.textContent || '';

		switch (tagName) {
			case 'Init':
				this.encoder.initialize();
				this.font = this.default_font;
				this.pending_text = false;
				break;
			case 'Feed':
				this._feed(attributes);
				break;
			case 'Cut':
				this.encoder.cut(attributes.mode || 'full');
				break;
			case 'Text':
				console.log('=== TEXT PROCESSING v7 ===');
				console.log('Text content:', textContent);
				console.log('Font attr:', attributes.font, 'Current font:', this.font);
				console.log('Justification:', attributes.justification);

				// Handle font change: break the line only when text is pending
				// on it, otherwise the newline would print a blank line.
				if( attributes.font )
				{
					const fontLower = attributes.font.toLowerCase();
					if( this.font && this.font !== fontLower && this.pending_text )
					{
						// Font is changing from previous value - add newline before this text
						console.log('Font changing from', this.font, 'to', fontLower);
						this.encoder.newline();
						this.pending_text = false;
					}
					if( this.font !== fontLower )
					{
						this.encoder.font( fontLower );
						this.font = fontLower;
					}
				}

				// Handle alignment: `align` is canonical, `justification` is a
				// deprecated alias kept for existing tickets.
				const alignment = attributes.align || attributes.justification;
				if (alignment) {
					console.log('Setting alignment to:', alignment);
					this.encoder.align(alignment);
				}

				// Handle font size (width and height)
				const fontWidth = attributes.fontWidth ? parseInt(attributes.fontWidth, 10) : 1;
				const fontHeight = attributes.fontHeight ? parseInt(attributes.fontHeight, 10) : 1;
				if (fontWidth > 1 || fontHeight > 1) this.encoder.size(fontWidth, fontHeight);
				// Handle text styling
				if (attributes.bold) this.encoder.bold(attributes.bold === 'true');
				if (attributes.underline) this.encoder.underline(attributes.underline === 'true');
				// childNodes in native DOM, children in CustomDOMParser: both
				// mix text nodes with nested elements in document order.
				const mixed_kids = Array.from(node.childNodes || node.children || []);
				const nested_elements = mixed_kids.filter(c => c.nodeType === 1);
				if (nested_elements.length === 0) {
					this.encoder.text(this._sanitizeText(textContent));
					// An empty Text still flushes the encoder's current line
					// (builders use it as an alignment reset after a header),
					// so nothing is pending afterwards. Leaving a stale true
					// here made the Table handler emit a second, blank line.
					this.pending_text = !!textContent;
				} else {
					// Mixed content: honor nested <Feed> in order instead of
					// silently dropping it. Anything else keeps its text.
					for (const child of mixed_kids) {
						if (child.nodeType === 1 && child.tagName === 'Feed') {
							this._feed(this._getAttributes(child));
						} else {
							const chunk = this._sanitizeText(child.textContent || '');
							if (chunk) {
								this.encoder.text(chunk);
								this.pending_text = true;
							}
						}
					}
				}
				// Reset styling
				if (attributes.bold) this.encoder.bold(false);
				if (attributes.underline) this.encoder.underline(false);
				if (fontWidth > 1 || fontHeight > 1) this.encoder.size(1, 1);
				break;
			case 'QrCode':
				// Convert numeric attributes from strings to numbers
				if (attributes.size) attributes.size = parseInt(attributes.size, 10);
				if (attributes.width) attributes.width = parseInt(attributes.width, 10);
				if (attributes.height) attributes.height = parseInt(attributes.height, 10);
				// Honor centering like <Text> does: the encoder prints the QR
				// at the current alignment, so a justification set only on the
				// tag would otherwise be silently ignored (QR prints left).
				const qrAlignment = attributes.align || attributes.justification;
				if (qrAlignment) this.encoder.align(qrAlignment);
				this.encoder.qrcode(textContent, attributes);
				break;
			case 'BarCode':
				// Convert numeric attributes from strings to numbers
				if (attributes.width) attributes.width = parseInt(attributes.width, 10);
				if (attributes.height) attributes.height = parseInt(attributes.height, 10);
				this.encoder.barcode(textContent, attributes.type, attributes);
				break;
			case 'PDF417':
				// Convert numeric attributes from strings to numbers
				if (attributes.width) attributes.width = parseInt(attributes.width, 10);
				if (attributes.columns) attributes.columns = parseInt(attributes.columns, 10);
				if (attributes.rows) attributes.rows = parseInt(attributes.rows, 10);
				this.encoder.pdf417(textContent, attributes);
				break;
			case 'Image':
				return this._processImageAsync(node, attributes, textContent);
			case 'Bytes':
				// The encoder's raw() takes a byte array, not a string:
				// passing the hex text through untouched serializes each
				// character instead of each byte. pending_text is left
				// alone so a following Feed keeps its normal spacing.
				this.encoder.raw(this._hexToBytes(textContent));
				break;
			case 'Table':

				const columnsNode = node.querySelector('Columns');
				const rowsNode = node.querySelector('Rows');
				const columns = Array.from(columnsNode.children).map(c => {
					const attrs = this._getAttributes(c);
					if (attrs.width) attrs.width = parseInt(attrs.width, 10);
					if (attrs.marginLeft) attrs.marginLeft = parseInt(attrs.marginLeft, 10);
					if (attrs.marginRight) attrs.marginRight = parseInt(attrs.marginRight, 10);
					return attrs;
				});

				const rows = Array.from(rowsNode.children).map(rowNode => {
					return Array.from(rowNode.children).map(cellNode => {
						if (cellNode.children.length > 0) {
							const childNodes = Array.from(cellNode.children).map(childNode => ({
								tagName: childNode.tagName,
								attributes: this._getAttributes(childNode),
								textContent: childNode.textContent || ''
							}));

							return (enc) => {
								let cellEncoder = enc;
								for (const child of childNodes) {
									switch (child.tagName) {
										case 'Text':
											if (child.attributes.bold) cellEncoder = cellEncoder.bold(child.attributes.bold === 'true');
											if (child.attributes.underline) cellEncoder = cellEncoder.underline(child.attributes.underline === 'true');
											// Cells ignored alignment before; invalid values stay ignored
											// instead of throwing mid-table.
											const cellAlignment = child.attributes.align || child.attributes.justification;
											if (cellAlignment === 'left' || cellAlignment === 'center' || cellAlignment === 'right') cellEncoder = cellEncoder.align(cellAlignment);
											cellEncoder = cellEncoder.text(this._sanitizeText(child.textContent));
											if (child.attributes.bold) cellEncoder = cellEncoder.bold(false);
											if (child.attributes.underline) cellEncoder = cellEncoder.underline(false);
											break;
										case 'Rule':
											if (child.attributes.width) child.attributes.width = parseInt(child.attributes.width, 10);
											cellEncoder = cellEncoder.rule(child.attributes);
											break;
										case 'Feed': {
											const lines = parseInt(child.attributes.lines || 1, 10);
											for (let i = 0; i < lines; i++) {
												cellEncoder = cellEncoder.newline();
											}
											break;
										}
									}
								}
								return cellEncoder;
							};
						}
						return cellNode.textContent;
					});
				});

				// Terminate a pending text line before the table; the table
				// flushes every row itself, so no trailing newline is needed.
				if (this.pending_text) this.encoder.newline();
				this.pending_text = false;
				// Keep this.font in sync: the Text handler skips encoder.font()
				// when it believes the font already matches, so a stale value
				// would print following text in the wrong font.
				if( attributes.font ) {
					this.encoder.font( attributes.font );
					this.font = attributes.font.toLowerCase();
				}
				console.log('Table', columns, rows);
				const maxColumns = (this.encoder && typeof this.encoder.columns === 'number') ? this.encoder.columns : 0;
				const totalWidth = columns.reduce((sum, c) => sum + (c.width || 0) + (c.marginLeft || 0) + (c.marginRight || 0), 0);
				if (maxColumns > 0 && totalWidth > maxColumns) {
					throw new Error(`Table width (${totalWidth}) exceeds printer columns (${maxColumns}). Reduce <Column> widths/margins or increase font_a_columns.`);
				}
				this.encoder.table(columns, rows);
				if( attributes.font ) {
					this.encoder.font( this.default_font );
					this.font = this.default_font;
				}
				break;
			case 'Rule':
				console.log('Rule FOOO');
				this.encoder.rule(attributes);
				this.pending_text = false;
				break;
			default:
				for (const child of Array.from(node.children)) {
					await this._processNode(child);
				}
				break;
		}
		console.log('It finish');
	}

	async process(xmlString) {
		if (typeof this.encoder.clear === 'function') {
			this.encoder.clear();
		}

		console.log('Xml string reading');


		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xmlString, "text/xml");

		if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
			const error = xmlDoc.getElementsByTagName("parsererror")[0];
			console.error(error);
			throw new Error("Error parsing XML.");
		}

		console.log('Fail to parse string');

		await this._processNode(xmlDoc.documentElement);

		//if (typeof this.encoder.getBuffer === 'function') {
		//	//return this.encoder.getBuffer();
		//}
	}
}

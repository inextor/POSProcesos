import { CustomDOMParser } from './CustomDOMParser.js';

export default class EscposXmlProcessor {

	constructor(encoder) {
		this.default_font = 'a';
		if (!encoder) {
			throw new Error("An encoder instance must be provided.");
		}
		this.encoder = encoder;
	}

	_sanitizeText(text) {
		// Replace unsupported characters with safe alternatives
		// ISO 8859-2 (Latin-2) character range: 0x20-0x7E, 0xA0-0xFF
		return text.split('').map(char => {
			const code = char.charCodeAt(0);
			// Allow basic ASCII (0x20-0x7E) and extended Latin-2 range (0xA0-0xFF)
			if ((code >= 0x20 && code <= 0x7E) || (code >= 0xA0 && code <= 0xFF)) {
				return char;
			}
			// Replace unsupported characters with space
			return ' ';
		}).join('');
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

	_processNode(node) {
		if (node.nodeType !== 1) return; // Process only element nodes

		const tagName = node.tagName;
		const attributes = this._getAttributes(node);
		const textContent = node.textContent || '';

		switch (tagName) {
			case 'Init':
				this.encoder.initialize();
				break;
			case 'Feed':
				const lines = parseInt(attributes.lines || 1, 10);
				for (let i = 0; i < lines; i++) {
					this.encoder.newline();
				}
				break;
			case 'Cut':
				this.encoder.cut(attributes.mode || 'full');
				break;
			case 'Text':
				if (attributes.bold) this.encoder.bold(attributes.bold === 'true');
				if (attributes.underline) this.encoder.underline(attributes.underline === 'true');
				this.encoder.text(this._sanitizeText(textContent));
				if (attributes.bold) this.encoder.bold(false);
				if (attributes.underline) this.encoder.underline(false);
				break;
			case 'QrCode':
				this.encoder.qrcode(textContent, attributes);
				break;
			case 'BarCode':
				this.encoder.barcode(textContent, attributes.type, attributes);
				break;
			case 'PDF417':
				this.encoder.pdf417(textContent, attributes);
				break;
			case 'Image':
				this.encoder.image(attributes);
				break;
			case 'Bytes':
				this.encoder.raw(textContent.replace(/\s+/g, ''));
				break;
			case 'Table':

				const columnsNode = node.querySelector('Columns');
				const rowsNode = node.querySelector('Rows');
				const columns = Array.from(columnsNode.children).map(c => {
					const attrs = this._getAttributes(c);
					if (attrs.width) attrs.width = parseInt(attrs.width, 10);
					if (attrs.marginRight) attrs.marginRight = parseInt(attrs.marginRight, 10);
					return attrs;
				});

				const rows = Array.from(rowsNode.children).map(rowNode => {
					return Array.from(rowNode.children).map(cellNode => {
						if (cellNode.children.length > 0) {
							const childNode = cellNode.children[0];
							const attributes = this._getAttributes(childNode);
							const textContent = childNode.textContent || '';

							return (enc) => {
								let cellEncoder = enc;
								switch (childNode.tagName) {
									case 'Text':
										if (attributes.bold) cellEncoder = cellEncoder.bold(attributes.bold === 'true');
										if (attributes.underline) cellEncoder = cellEncoder.underline(attributes.underline === 'true');
										cellEncoder = cellEncoder.text(this._sanitizeText(textContent));
										if (attributes.bold) cellEncoder = cellEncoder.bold(false);
										if (attributes.underline) cellEncoder = cellEncoder.underline(false);
										break;
									case 'Rule':
										if (attributes.width) attributes.width = parseInt(attributes.width, 10);
										cellEncoder = cellEncoder.rule(attributes);
										break;
								}
								return cellEncoder;
							};
						}
						return cellNode.textContent;
					});
				});

				this.encoder.newline();
				if( attributes.font ) this.encoder.font( attributes.font );
				console.log('Table', columns, rows);
				this.encoder.table(columns, rows);
				this.encoder.newline();
				if( attributes.font ) this.encoder.font( this.default_font );
				break;
			case 'Rule':
				console.log('Rule FOOO');
				this.encoder.rule(attributes);
				break;
			default:
				Array.from(node.children).forEach(child => this._processNode(child));
				break;
		}
		console.log('It finish');
	}

	process(xmlString) {
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

		this._processNode(xmlDoc.documentElement);

		//if (typeof this.encoder.getBuffer === 'function') {
		//	//return this.encoder.getBuffer();
		//}
	}
}

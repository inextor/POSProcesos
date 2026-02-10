import ReceiptPrinterEncoder from './receipt-printer-encoder.esm.js';
import { EscposXmlProcessor } from './escpos_xml_processor.js';

self.onmessage = async function(e) {
	console.log('MEssage received', e);
	if (e.data.action === 'print') {
		const { deviceInfo, xmlString } = e.data;
		let device;

		let interfaceNumber = e.data.interfaceNumber;

		try {

			const devices = await navigator.usb.getDevices();
			device = devices.find(d => d.vendorId === deviceInfo.vendorId && d.productId === deviceInfo.productId);

			if (!device) {
				self.postMessage({ status: 'Requesting device...' });
				device = await navigator.usb.requestDevice({ filters: [] });
			}

			self.postMessage({ status: 'Connecting to device...' });
			await device.open();
			await device.selectConfiguration(1);

			if( interfaceNumber == -1 )
			{
				for (const iface of device.configuration.interfaces) {
					if (iface.alternate.endpoints.some(ep => ep.direction === 'out')) {
						interfaceNumber = iface.interfaceNumber;
						break;
					}
				}
			}

			if (interfaceNumber === -1) {
				throw new Error("Couldn't find an interface with an OUT endpoint.");
			}

			self.postMessage({ status: `Found printing interface: ${interfaceNumber}. Claiming...` });
			await device.claimInterface(interfaceNumber);
			self.postMessage({ status: 'Interface claimed successfully.' });

			const anInterface = device.configuration.interfaces.find(i => i.interfaceNumber === interfaceNumber);
			const endpoint = anInterface.alternate.endpoints.find(ep => ep.direction === 'out');

			if (!endpoint) {
				throw new Error("Could not find OUT endpoint on the claimed interface.");
			}


			self.postMessage({ status: 'Printing...' });

			const encoderInstance = new ReceiptPrinterEncoder({
				printerModel: 'bixolon-srp350iii'
			});
			const xmlProcessor = new EscposXmlProcessor(encoderInstance);
			xmlProcessor.process(xmlString);
			const payload = encoderInstance.encode();
			await device.transferOut(endpoint.endpointNumber, payload);
			//await device.transferOut(endpoint.endpointNumber, escposData);
			self.postMessage({ status: 'Print command sent.' });

		} catch (error) {
			self.postMessage({ status: 'error', error: error.message });
		} finally {
			if(device && device.opened) {
				await device.close();
				self.postMessage({ status: 'Device closed.' });
			}
		}
	}
};

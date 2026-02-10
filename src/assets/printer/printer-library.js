//const myWorker = new Worker('./assets/printer/worker.js', { type: 'module' });

import ReceiptPrinterEncoder from './receipt-printer-encoder.esm.js';
import EscposXmlProcessor from './escpos_xml_processor.js';
import WebUSBReceiptPrinter from './webusb-receipt-printer.esm.js';

console.log('Loaded printer-library');

const receiptPrinter = new WebUSBReceiptPrinter();
var isPrinting = false;

function printUsb(xmlString, evt, config, interfaceNumber)
{
	return getDevice(config, interfaceNumber || -1, evt).then((device)=>{
		console.log('Configuration', config);

		let encoder_config = {
			language: 'esc-pos',
			columns: 48,
			printerModel: 'bixolon-srp350iii',
			codepageMapping: 'bixolon'
		};

		let model = 'bixolon-srp350iii';

		console.log('Configuration', encoder_config);
		const encoderInstance = new ReceiptPrinterEncoder( encoder_config );
		const xmlProcessor = new EscposXmlProcessor(encoderInstance);
		xmlProcessor.process(xmlString);
		const data = encoderInstance.encode();

		device.write(data);
		return 'OK';
	});
}

function printUsb2(xmlString, evt, config, interfaceNumber)
{
	receiptPrinter.connect().then((printer)=>{
		console.log('Printer connected', printer);
		return printFullX(xmlString);
	})

	let cnfg = config || {
		vendorId: 0x1504, productId: 0x003d
	};

	let interNumb = interfaceNumber || -1;

	return navigator.usb.getDevices()
	.then((devices)=>
	{
		console.log( evt );
		return devices.length  ? Promise.resolve( true ) : navigator.usb.requestDevice({ filters: [cnfg] });

	})
	.then((_x)=>
	{
		console.log('WTF');
		return new Promise((resolve, reject) =>
		{
			if (window.Worker)
			{
				console.log('Worker created.');

				myWorker.onmessage = (event) => {
					if (event.data.status) {
						console.log(`Status: ${event.data.status}`);
					}
					if (event.data.status === 'Print command sent.') {
						console.log('Click detected', evt);
						console.log('Worker finished:', event.data);
						resolve(event.data);
					}
					if (event.data.status === 'error') {
						reject(event.data.error);
					}
				};

				myWorker.onerror = (error) => {
					reject(error);
				};

				myWorker.postMessage({
					action: 'print',
					deviceInfo: cnfg,
					xmlString: xmlString,
					interfaceNumber: interNumb
				});
			}
			else
			{
				reject('Your browser doesn\'t support web workers.');
			}
		});
	});
}



async function initPrinter(config)
{
	navigator.usb.requestDevice({ filters: [cnfg] })
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

	await device.claimInterface(interfaceNumber);
	const anInterface = device.configuration.interfaces.find(i => i.interfaceNumber === interfaceNumber);
	const endpoint = anInterface.alternate.endpoints.find(ep => ep.direction === 'out');

	if (!endpoint) {
		throw new Error("Could not find OUT endpoint on the claimed interface.");
	}

	await device.transferOut(endpoint.endpointNumber, payload);
}

function initUsbPrinter(evt, config, interfaceNumb)
{
	let cnfg = config || {
		vendorId: 0x1504,
		productId: 0x003d
	};

	console.log('Evt', evt);

	let device = null;
	let interfaceNumber = interfaceNumb;

	navigator.usb.requestDevice({ filters: [ cnfg ] })
	.then((dev)=>{
		device = dev;
		return device.open();
	})
	.then((response)=>{
		console.log('What type is the reponse', response);
		return device.selectConfiguration(1);
	})
	.then((reponse)=>{

		console.log('Catpruing reponse');
		if( interfaceNumber == -1 )
		{
			for (const iface of device.configuration.interfaces) {
				if (iface.alternate.endpoints.some(ep => ep.direction === 'out')) {
					interfaceNumber = iface.interfaceNumber;
					break;
				}
			}
		}
		console.log('Claiming interface', interfaceNumber);

		return device.claimInterface(interfaceNumber);
	})
	.then((response)=>
	{
		console.log('Interface Claimed');
		const anInterface = device.configuration.interfaces.find(i => i.interfaceNumber === interfaceNumber);
		const endpoint = anInterface.alternate.endpoints.find(ep => ep.direction === 'out');

		const encoder = new TextEncoder();

		// Combine initialization, text, and line feeds
		const dataArray = new Uint8Array([
			0x1b, 0x40, // ESC @ (Initialize)
			...encoder.encode("Hello World\n\n\n"), // Text with line feeds
			0x1d, 0x56, 0x41, 0x03 // GS V A 3 (Full cut, often used)
		]);
		return device.transferOut(endpoint.endpointNumber, dataArray);
	})
	.then((response)=>
	{
		console.log('This do not print or what!!!!');
	})
	.catch((error)=>
	{
		console.log('THE ERROR', error);
	})
	.finally((device)=>
	{
		// A disconnect is often required after printing is complete
		try{
			if( device )
			{
				device.close().then(()=>{
					console.log('Device close successfully');
				});
			}
		}
		catch(e)
		{
			console.error('Error closing the device', e);
		}

		console.log("Device closed.");
	})
}

function printFull(xmlString)
{
	printFullX().then((x)=>{
		console.log('Printed', x);
	});
}

async function printFullX(xmlString)
{
	console.log('Worker: Processing XML for printing:', xmlString);

	if (!printer) {
		console.error('Worker: Printer not connected.');
		self.postMessage({ status: 'error', message: 'Printer not connected.' });
		//isPrinting = false;
		return;
	}

	try {
		const encoderInstance = new ReceiptPrinterEncoder();
		const xmlProcessor = new EscposXmlProcessor(encoderInstance);
		const encodedData = xmlProcessor.process(xmlString);
		let data = econderInstance.encode();

		await printer.print( data );
		console.log('Worker: Finished printing XML.');
		self.postMessage({ status: 'printed' });
	} catch (error) {
		console.error('Worker: Error printing:', error);
		self.postMessage({ status: 'error', message: 'Failed to print.' });
	} finally {
		isPrinting = false;
	}
}

function getDevice(config, interface_number,evt)
{
	let cnfg = config || {
		vendorId: 0x1504,
		productId: 0x003d
	};

	console.log('GetDevice Function here we go', evt);

	let device = null;
	let interfaceNumber = interface_number || -1;

	return navigator.usb.getDevices()
	.then((devices)=>
	{
		console.log( evt );
		console.log('Devices Obtained Devices', devices);

		devices.forEach(d=>console.log('Device', d.serialNumber, d.productName, d.vendorId, d.productId));

		let device = devices.find(d=>
		{
			if( cnfg.serial_number )
				return d.vendorId == cnfg.vendorId && d.productId == cnfg.productId && d.serialNumber == cnfg.serial_number;

			return d.vendorId == cnfg.vendorId && d.productId == cnfg.productId
		});

		if( device )
			return Promise.resolve( device );

		console.log('Login Event so exist still', evt);

		return navigator.usb.requestDevice({ filters: [cnfg] });
	})
	.then((dev)=>{
		device = dev;
		return device.open();
	})
	.then((response)=>{
		console.log('What type is the reponse', response);
		return device.selectConfiguration(1);
	})
	.then((reponse)=>{

		console.log('Catpruing reponse');
		if( interfaceNumber == -1 )
		{
			for (const iface of device.configuration.interfaces) {
				if (iface.alternate.endpoints.some(ep => ep.direction === 'out')) {
					interfaceNumber = iface.interfaceNumber;
					break;
				}
			}
		}
		console.log('Claiming interface', interfaceNumber);

		return device.claimInterface(interfaceNumber);
	})
	.then((response)=>
	{
		console.log('Interface Claimed');
		const anInterface = device.configuration.interfaces.find(i => i.interfaceNumber === interfaceNumber);
		const endpoint = anInterface.alternate.endpoints.find(ep => ep.direction === 'out');

		return {
			device: device,
			interfaceNumber: interfaceNumber,
			write: (data)=>{
				return device.transferOut(endpoint.endpointNumber, data);
			},
			close: ()=>{
				return device.close();
			}
		};
	})
	.catch((error)=>
	{
		console.error('Error getting device on GetDevice()', error);
		throw error;
	})
}

// Make functions globally available
window._printUsb = printUsb;
window._printUsb2 = printUsb2;
window._initUsbPrinter = initUsbPrinter;
window._printFull = printFull;
window._printFullX = printFullX;

function printHtml(html_body,title)
{
	var print_window= window.open('', 'PRINT', 'height=800,width=600,popup=true');
	print_window.addEventListener('afterprint', function()
	{
		console.log('Printed');
		print_window.close();
	});


	print_window.onaffterprint = function()
	{
		print_window.close();
	};

	let html = `<!Doctype html>
	<html>
		<head>
			<title>${title}</title>
		</head>
		<body>${html_body}</body>
	</html>`;

	print_window.document.open();
	print_window.document.write(html);
	print_window.document.close();
	print_window.focus(); // necessary for IE >= 10*/
	if( isMobile() )
	{
		setTimeout(function(){
			print_window.print();
			print_window.close();
		},2000);
	}
	else
	{
		print_window.print();
		print_window.close();
	}
}

function txt2html(txt)
{
	if( !txt )
		return '';

	var s = document.createElement('span');
	s.textContent = txt;
	return s.innerHTML.replace(/\n/g,'<br>');
}

function isMobile()
{
	const userAgent = navigator.userAgent.toLowerCase();
	const isMobile = /mobile|android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
	const isTablet = /tablet|ipad/i.test(userAgent);
	return isMobile || isTablet;
}

function printerConnect(method, model) {
  if (!worker) {
    initPrinter();
  }
  worker.postMessage({ type: 'connect', method: method, model_or_other_property: model });
}

function printerPrint(xml) {
  if (!worker) {
    initPrinter();
  }
  worker.postMessage({ type: 'print', xml });
}

function printUsb (xmlString, evt, config, interfaceNumber, encoderConfig) {
	return window._printUsb(xmlString, evt, config, interfaceNumber, encoderConfig);
};

function printUsb2 (xmlString, evt, config, interfaceNumber) {
	return window._printUsb2(xmlString, evt, config, interfaceNumber);
};

function initUsbPrinter (evt, config, interfaceNumb) {
	return window._initUsbPrinter(evt, config, interfaceNumb);
};

function printFull (xmlString) {
	return window._printFull(xmlString);
};

function printFullX (xmlString) {
	return window._printFullX(xmlString);
};



//function xlsx2json(file:File,headers:string[]):Promise<any>
function xlsx2json(file,headers)
{
	if( file == null )
		return Promise.reject();

	return new Promise((resolve,_reject)=>
	{
		const reader = new FileReader();

		reader.onload = (e) => {
			/* read workbook */
			const bstr = e.target.result;
			const wb = XLSX.read(bstr, {type: 'binary',cellDates:true});

			console.log('Names are',wb.SheetNames );

			/* grab first sheet */
			const wsname = wb.SheetNames[0];
			const ws =  wb.Sheets[wsname];

			//console.log( ws );
			/* save data */
			let data = XLSX.utils.sheet_to_json(ws, {header: headers});
			data.splice(0,1);
			//console.log( data );
			resolve(data);
		};
		reader.readAsBinaryString( file );
	});
}

//xlsx2RawRows(file:File):Promise<any[]>
function xlsx2RawRows(file)
{
	if( file == null )
		return Promise.reject();

	return new Promise((resolve,_reject)=>
	{
		const reader = new FileReader();

		reader.onload = (e) => {
			/* read workbook */
			const bstr = e.target.result;
			const wb = XLSX.read(bstr, {type: 'binary',cellDates:true});

			/* grab first sheet */
			const wsname = wb.SheetNames[0];
			const ws = wb.Sheets[wsname];

			//console.log( ws );
			let data = XLSX.utils.sheet_to_json(ws, {header: 1, blankrows:false});
			resolve(data);
		};
		reader.readAsBinaryString( file );
	});
}

// array2xlsx(array:any[],filename:string,headers:string[])
function array2xlsx(array,filename,headers)
{
	let ws = XLSX.utils.json_to_sheet(array, {header: headers });
	let wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, filename );
	let x = XLSX.writeFile( wb, filename );
	console.log( x );
}

// downloadTemplate(filename:string,headers:string[])
function downloadTemplate(filename, headers)
{
	// Create a worksheet with just the headers
	let ws = XLSX.utils.aoa_to_sheet([headers]);
	let wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
	XLSX.writeFile(wb, filename);
}

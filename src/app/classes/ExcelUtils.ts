import { Observable, of } from 'rxjs';

declare function txt2html(str:string):string;
declare function printHtml(html_body:string,title:string):any;
declare function xlsx2json(file:File,headers:string[]):Promise<any>
declare function array2xlsx(array:any[],filename:string,headers:string[]):void;

export class ExcelUtils
{
	static xlsx2json(file:File,headers:string[]):Promise<any>
	{
		return xlsx2json(file, headers);
	}

	/*
	xlsx2RawRows(file:File):Promise<any[]>
	{
		if( file == null )
			return Promise.reject();

		return new Promise((resolve,_reject)=>
		{
			const reader: FileReader = new FileReader();

			reader.onload = (e: any) => {
				// read workbook
				const bstr: string = e.target.result;
				const wb: XLSX.WorkBook = XLSX.read(bstr, {type: 'binary',cellDates:true});

				// grab first sheet
				const wsname: string = wb.SheetNames[0];
				const ws: XLSX.WorkSheet = wb.Sheets[wsname];

				//console.log( ws );
				let data = XLSX.utils.sheet_to_json(ws, {header: 1, blankrows:false});
				resolve(data);
			};
			reader.readAsBinaryString( file );
		});
	}
	*/

	static array2xlsx(array:any[],filename:string,headers:string[])
	{
		/*
		let ws = XLSX.utils.json_to_sheet(array, {header: headers });
		let wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, filename );
		let x = XLSX.writeFile( wb, filename );
		console.log( x );
		*/
		array2xlsx(array,filename,headers);
	}

	static array2Tsv(array:any[], filename:string, headers:string[] )
	{
		let str = headers.map(i=>i.replaceAll('\s',' ')).join('\t')+'\n';

		for(let obj of array)
		{
			let row = [];

			if( Array.isArray( obj ) )
			{
				for(let value of obj )
				{
					if( value == null )
					{
						row.push( '' );
						continue;
					}

					row.push( (''+value ).replace(/\s+|\n/g, " ") );
				}
			}
			else
			{
				for(let attr of headers )
				{
					if( attr in obj)
					{
						row.push( (''+obj[attr]).replace(/\s+|\n/g, " ") );
					}
				}
			}
			str+= row.join('\t')+'\n';
		}

		ExcelUtils.downloadStringAsFile( str, filename );
	}

	public static downloadStringAsFile(string:string, filename:string)
	{
		//Thanks bard
		// Create a blob from the string.
		const blob = new Blob([string], {type: 'text/plain'});

		// Create an anchor element with the href attribute set to the blob's URL.
		const anchor	= document.createElement('a');
		let url_string = window.URL.createObjectURL(blob);
		anchor.href = url_string;
		// Set the download attribute to the filename.
		anchor.download = filename;

		// Click the anchor element to trigger the download.
		anchor.click();
		window.URL.revokeObjectURL( url_string )
	}
}

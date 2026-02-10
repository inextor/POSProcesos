import { Component, OnInit } from '@angular/core';

import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Printer } from '../../modules/shared/RestModels';
import { mergeMap } from 'rxjs';
import { RouterModule } from '@angular/router';
import { ShortDatePipe } from "../../modules/shared/pipes/short-date.pipe";

@Component({
	selector: 'app-list-printer',
	imports: [RouterModule, ShortDatePipe],
	templateUrl: './list-printer.component.html',
	styleUrl: './list-printer.component.css'
})
export class ListPrinterComponent extends BaseComponent implements OnInit {
	rest_printer: RestSimple<Printer> = this.rest.initRestSimple('printer', ['name', 'id', 'created', 'updated', 'ip_address', 'protocol', 'device', 'serial_number']);
	search_printer: SearchObject<Printer> = this.rest_printer.getEmptySearch();
	printer_list: Printer[] = [];

	ngOnInit()
	{
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((paramMap) =>
			{
				this.search_printer = this.rest_printer.getSearchObject(paramMap);
				this.search_printer.limit = this.page_size;
				this.current_page = this.search_printer.page;
				return this.rest_printer.search(this.search_printer);
			})
		).subscribe((response) => {
				this.is_loading = false;
				this.printer_list = response.data;
				this.setPages(this.current_page, response.total);
			});
	}
}

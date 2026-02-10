import { Component, OnInit } from '@angular/core';

import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Printer } from '../../modules/shared/RestModels';
import { BaseComponent } from './../../modules/shared/base/base.component';
import { mergeMap, of} from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from "../../components/loading/loading.component";
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../components/modal/modal.component';
import { CommonModule } from '@angular/common';

// Web USB API type declarations
interface USBDevice {
	vendorId: number;
	productId: number;
	manufacturerName?: string;
	productName?: string;
	serialNumber?: string;
}

interface USB {
	getDevices(): Promise<USBDevice[]>;
}

declare global {
	interface Navigator {
		usb: USB;
	}
}

@Component({
	selector: 'app-save-printer',
	imports: [LoadingComponent, FormsModule, ModalComponent, CommonModule],
	templateUrl: './save-printer.component.html',
	styleUrl: './save-printer.component.css'
})
export class SavePrinterComponent extends BaseComponent implements OnInit
{

	printer: Printer = GetEmpty.printer();
	rest_printer: RestSimple<Printer> = this.rest.initRestSimple('printer', ['name', 'id', 'created', 'updated', 'ip_address', 'protocol', 'device', 'serial_number', 'port', 'description', 'store_id']);
	search_printer: SearchObject<Printer> = this.rest_printer.getEmptySearch();

	show_usb_modal: boolean = false;
	usb_devices: USBDevice[] = [];

	ngOnInit()
	{
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map)=>
			{
				this.search_printer = this.rest_printer.getSearchObject(param_map);
				this.search_printer.limit = this.page_size;
				this.current_page = this.search_printer.page;

				if( param_map.has('id') )
				{
					return this.rest_printer.get(param_map.get('id'));
				}

				return of(GetEmpty.printer());
			})
		)
		.subscribe
		({
			next: (response: Printer) =>
			{
				this.is_loading = false;
				this.printer = response;
			},
			error: (error: any) =>
			{
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}

	save($event: Event)
	{

		let on_response =
		{
			next: (response: Printer) =>
			{
				this.is_loading = false;
				this.location.back();
			},
			error: (error: any) =>
			{
				this.is_loading = false;
				this.rest.showError(error);
			}
		}

		this.subs.sink = this.printer.id
			? this.rest_printer.update(this.printer).subscribe( on_response )
			: this.rest_printer.create(this.printer).subscribe( on_response );

	}

	async listUSBDevices()
	{
		try
		{
			if (!navigator.usb)
			{
				this.rest.showError('Web USB API no está soportado en este navegador');
				return;
			}

			this.usb_devices = await navigator.usb.getDevices();

			if (this.usb_devices.length === 0)
			{
				this.rest.showWarning('No se encontraron dispositivos USB previamente autorizados');
			}
			else
			{
				this.show_usb_modal = true;
			}
		}
		catch (error: any)
		{
			this.rest.showError(error);
		}
	}

	selectUSBDevice(device: USBDevice)
	{
		// Populate printer fields with USB device info
		this.printer.serial_number = device.serialNumber || '';
		this.printer.device = device.productName || device.manufacturerName || '';

		if (!this.printer.name)
		{
			this.printer.name = `${device.manufacturerName || 'USB'} ${device.productName || 'Printer'}`.trim();
		}

		this.show_usb_modal = false;
		this.rest.showSuccess('Información del dispositivo USB cargada');
	}

	toHex(value: number): string
	{
		return '0x' + value.toString(16).toUpperCase().padStart(4, '0');
	}
}

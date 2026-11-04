import { Component, Injector, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacturaMetaData } from '../../modules/shared/FacturaMetaData';
import { BaseComponent } from '../../modules/shared/base/base.component';

@Component({
	selector: 'app-satxmlviewer',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './satxmlviewer.component.html',
	styleUrl: './satxmlviewer.component.css'
})
export class SatxmlviewerComponent extends BaseComponent implements OnInit, OnChanges
{
	@Input() xml_attachment_id: number | null = null;
	factura_metadata: FacturaMetaData = new FacturaMetaData('');
	xml_download_url: string = '';
	sat_verify_url: string = '';
	error: string = '';

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit(): void
	{
	}

	ngOnChanges(changes: SimpleChanges): void
	{
		if (changes['xml_attachment_id']?.currentValue && changes['xml_attachment_id'].previousValue != changes['xml_attachment_id'].currentValue)
		{
			let attachment_id = changes['xml_attachment_id'].currentValue as number;
			let url = this.rest.getFilePath(attachment_id, false);
			this.xml_download_url = this.rest.getFilePath(attachment_id, true);
			this.is_loading = true;

			fetch(url)
			.then(response => response.text())
			.then(data =>
			{
				this.factura_metadata = new FacturaMetaData(data);
				this.sat_verify_url = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${this.factura_metadata.UUID}&re=${this.factura_metadata.rfcEmisor}&rr=${this.factura_metadata.rfcReceptor}&tt=${this.factura_metadata.total}&&fe=${this.factura_metadata.verificador}`;
				this.is_loading = false;
			})
			.catch(error =>
			{
				console.error('Error al cargar el archivo xml', error);
				this.error = 'Ocurrio un error al cargar el archivo xml';
				this.is_loading = false;
			});
		}
	}
}

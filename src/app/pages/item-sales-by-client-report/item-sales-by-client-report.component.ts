import { Component, OnInit } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Store } from '../../modules/shared/RestModels';
import { Rest, SearchObject } from '../../modules/shared/services/Rest';
import { take } from 'rxjs/operators';
import { Utils } from '../../modules/shared/Utils';
import { FormsModule } from '@angular/forms';
import { ExcelUtils } from '../../classes/ExcelUtils';
import { CommonModule } from '@angular/common';

interface VentasArticuloClienteFacturado {
	agente: string;
	sucursal: string;
	codigo_cliente: string;
	nombre_cliente: string;
	CS_Prod: string;
	cve_prod: string;
	nombre_producto: string;
	total_articulo: string;
	cantidad_ordenes: number;
	cant_articulos: string;
	subtotal_fact: string;
	total_fact: string;
	unidad_med: string;
	/** Fecha/Hora de la primera orden (String: YYYY-MM-DD HH:MM:SS) */
	start_timestamp: string;
	/** Fecha/Hora de la última orden (String: YYYY-MM-DD HH:MM:SS) */
	end_timestamp: string;
}

const headers = [
	'agente', 'sucursal', 'codigo_cliente', 'nombre_cliente', 'CS_Prod', 'cve_prod',
	'nombre_producto', 'total_articulo', 'cantidad_ordenes', 'cant_articulos',
	'subtotal_fact', 'total_fact', 'unidad_med', 'start_timestamp', 'end_timestamp'
];

@Component({
	selector: 'app-item-sales-by-client-report',
	templateUrl: './item-sales-by-client-report.component.html',
	styleUrls: [],
	standalone: true,
	imports: [FormsModule, CommonModule]
})
export class ItemSalesByClientReportComponent extends BaseComponent implements OnInit {

	store_list: Store[] = [];
	start_date: string = '';
	end_date: string = '';
	store_id: number | null = null;

	progress: number = 0;
	progress_message: string = '';

	rest_store: Rest<Store, Store> = this.rest.initRest('store');

	ngOnInit(): void {
		this.start_date = this.getFirstDayOfMonth();
		this.end_date = this.getLastDayOfMonth();

		if (this.store_list.length === 0) {
			this.rest_store.search({ limit: 1000 }).pipe(take(1)).subscribe(response => {
				this.store_list = response.data;
			});
		}
	}

	getFirstDayOfMonth(): string {
		const now = new Date();
		now.setDate(1);
		now.setHours(0, 0, 0, 0);
		return Utils.getLocalMysqlStringFromDate(now).replace(' ', 'T').substring(0, 16);
	}

	getLastDayOfMonth(): string {
		let d = Utils.getEndOfMonth(new Date());
		d.setHours(23, 59, 0, 0);
		return Utils.getLocalMysqlStringFromDate(d).replace(' ', 'T').substring(0, 16);
	}

	generateReport() {
		this.is_loading = true;

		const start_timestamp = this.start_date.replace('T', ' ') + ':00';
		const end_timestamp = this.end_date.replace('T', ' ') + ':59';

		this.rest.getReportByPath('getVentasDeArticulosPorClienteFacturado', {
			start_timestamp,
			end_timestamp,
			store_id: this.store_id
		}).subscribe({
			next: (data: any) => {
				const reportData: VentasArticuloClienteFacturado[] = Array.isArray(data) ? data : (data.data || []);
				
				if (reportData.length === 0) {
					this.showError('No se encontraron datos para el reporte.');
					this.is_loading = false;
					return;
				}

				this.progress = 100;
				const today = new Date().toISOString().slice(0, 10);
				ExcelUtils.array2xlsx(reportData, `ventas_articulo_cliente_${today}.xlsx`, headers);
				this.is_loading = false;
				this.showSuccess('Reporte generado exitosamente.');
			},
			error: (error) => {
				this.showError(error);
				this.is_loading = false;
			}
		});
	}
}

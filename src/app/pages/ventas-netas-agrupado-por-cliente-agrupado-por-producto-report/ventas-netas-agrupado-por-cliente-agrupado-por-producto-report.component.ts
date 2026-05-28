import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';
import { Store } from '../../modules/shared/RestModels';
import { Rest } from '../../modules/shared/services/Rest';
import { take } from 'rxjs/operators';
import { LoadingComponent } from '../../components/loading/loading.component';

@Component({
	selector: 'app-ventas-netas-agrupado-por-cliente-agrupado-por-producto-report',
	standalone: true,
	imports: [CommonModule, FormsModule, LoadingComponent],
	templateUrl: './ventas-netas-agrupado-por-cliente-agrupado-por-producto-report.component.html',
	styleUrls: ['./ventas-netas-agrupado-por-cliente-agrupado-por-producto-report.component.css']
})
export class VentasNetasAgrupadoPorClienteAgrupadoPorProductoReportComponent extends BaseComponent implements OnInit {

	start_date: string = '';
	end_date: string = '';
	store_id: string = 'ALL';
	store_list: Store[] = [];
	results: any[] = [];
	external_base_url: string = '';

	rest_store: Rest<Store, Store> = this.rest.initRest('store');

	ngOnInit(): void {
		this.start_date = this.getFirstDayOfMonth();
		this.end_date = this.getLastDayOfMonth();
		this.setTitle('Ventas Netas Agrupado por Cliente y Producto');
		this.external_base_url = this.rest.getExternalAppUrl();

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
		d.setHours(23, 59, 59, 0);
		return Utils.getLocalMysqlStringFromDate(d).replace(' ', 'T').substring(0, 16);
	}

	generateReport() {
		this.is_loading = true;
		const date_start = this.start_date.replace('T', ' ') + ':00';
		const date_end = this.end_date.replace('T', ' ') + ':59';

		this.rest.httpPost('reports/ventas_netas_agrupado_por_cliente_agrupado_por_producto.php', { 
			start_timestamp: date_start, 
			end_timestamp: date_end,
			store_id: this.store_id
		})
			.subscribe({
				next: (data: any) => {
					this.results = Array.isArray(data) ? data : (data.data || []);
					this.is_loading = false;
				},
				error: (error) => {
					this.showError(error);
					this.is_loading = false;
				}
			});
	}

	downloadExcel() {
		const date_start = this.start_date.replace('T', ' ') + ':00';
		const date_end = this.end_date.replace('T', ' ') + ':59';
		const token = localStorage.getItem('session_token') || '';
		
		const url = `${this.rest.getApiPath()}/reports/ventas_netas_agrupado_por_cliente_agrupado_por_producto.php?start_timestamp=${encodeURIComponent(date_start)}&end_timestamp=${encodeURIComponent(date_end)}&store_id=${encodeURIComponent(this.store_id)}&format=tsv`;

		this.is_loading = true;

		fetch(url, {
			method: 'GET',
			headers: {
				'Authorization': 'Bearer ' + token
			}
		})
		.then(response => {
			if (!response.ok) {
				throw new Error('Error al descargar el archivo');
			}
			return response.blob();
		})
		.then(blob => {
			const downloadUrl = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = downloadUrl;
			a.download = `ventas_netas_agrupado_por_cliente_agrupado_por_producto_${this.store_id}_${date_start.substring(0, 10)}_${date_end.substring(0, 10)}.tsv`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(downloadUrl);
			this.is_loading = false;
		})
		.catch(error => {
			this.showError(error);
			this.is_loading = false;
		});
	}
}

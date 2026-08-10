import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';
import { Store } from '../../modules/shared/RestModels';
import { Rest } from '../../modules/shared/services/Rest';
import { take } from 'rxjs/operators';
import { LoadingComponent } from '../../components/loading/loading.component';
import { ExcelUtils } from '../../classes/ExcelUtils';
import { ItemSearchComponent } from '../../modules/shared/components/item-search/item-search.component';

@Component({
	selector: 'app-ventas-netas-agrupado-por-cliente-agrupado-por-producto-report',
	standalone: true,
	imports: [CommonModule, FormsModule, LoadingComponent, ItemSearchComponent],
	templateUrl: './ventas-netas-agrupado-por-cliente-agrupado-por-producto-report.component.html',
	styleUrls: ['./ventas-netas-agrupado-por-cliente-agrupado-por-producto-report.component.css']
})
export class VentasNetasAgrupadoPorClienteAgrupadoPorProductoReportComponent extends BaseComponent implements OnInit {

	start_date: string = '';
	end_date: string = '';
	store_id: string = 'ALL';
	store_list: Store[] = [];
	item_id: number | null = null;
	item_search_str: string = '';
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
			store_id: this.store_id,
			item_id: this.item_id ?? 'ALL'
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

	//Se genera el xlsx en el cliente a partir de los resultados que ya estan en pantalla, igual
	//que report-credit-payments y report-comex-sales. Antes se pedia otra vez al servidor con
	//format=tsv y se bajaba el blob: eso daba un archivo de texto (que Excel abre mal, sobre todo
	//con acentos y con numeros que interpreta como fechas) y ademas repetia la consulta completa.
	downloadExcel() {
		if (!this.results.length) {
			return;
		}

		const rows = this.results.map(item => ({
			'ID Cliente': item.Cve_cte,
			'Cliente': item.Nom_cte,
			'Marca/Clase': item.Cse_prod,
			'Código': item.Cve_prod,
			'Descripción de Producto': item.Desc_prod,
			'Ventas (Rems)': item.Rems,
			'Cant. Surtida': item.Cant_surt,
			'Unidad': item.Uni_med,
			'Subtotal': item.Subt_fac,
			'IVA': item.Iva,
			'Total': item.Total_fac
		}));

		const headers = ['ID Cliente', 'Cliente', 'Marca/Clase', 'Código', 'Descripción de Producto',
			'Ventas (Rems)', 'Cant. Surtida', 'Unidad', 'Subtotal', 'IVA', 'Total'];

		const filename = `ventas_netas_por_cliente_y_producto_${this.store_id}_${this.start_date.substring(0, 10)}_${this.end_date.substring(0, 10)}.xlsx`;

		ExcelUtils.array2xlsx(rows, filename, headers);
	}
}

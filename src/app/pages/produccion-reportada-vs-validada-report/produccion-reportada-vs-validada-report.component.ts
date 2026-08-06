import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';
import { Production_Area, User } from '../../modules/shared/RestModels';
import { Rest, RestSimple } from '../../modules/shared/services/Rest';
import { take } from 'rxjs/operators';
import { LoadingComponent } from '../../components/loading/loading.component';
import { ItemSearchComponent } from '../../modules/shared/components/item-search/item-search.component';

interface ProduccionReportadaVsValidada
{
	fecha: string;
	production_area_id: number | null;
	area_name: string;
	item_id: number;
	item_code: string;
	item_name: string;
	category_name: string;
	usuarios: string;
	reportado: number;
	reportado_merma: number;
	validado: number;
	merma: number;
	diferencia: number | null;
}

@Component({
	selector: 'app-produccion-reportada-vs-validada-report',
	standalone: true,
	imports: [CommonModule, FormsModule, LoadingComponent, ItemSearchComponent],
	templateUrl: './produccion-reportada-vs-validada-report.component.html',
	styleUrls: ['./produccion-reportada-vs-validada-report.component.css']
})
export class ProduccionReportadaVsValidadaReportComponent extends BaseComponent implements OnInit
{
	start_date: string = '';
	end_date: string = '';
	production_area_id: string = 'ALL';
	user_id: string = 'ALL';
	item_id: number | null = null;
	item_search_str: string = '';

	production_area_list: Production_Area[] = [];
	user_list: User[] = [];
	results: ProduccionReportadaVsValidada[] = [];
	searched: boolean = false;

	rest_production_area: Rest<Production_Area, Production_Area> = this.rest.initRest('production_area');
	rest_user: RestSimple<User> = this.rest.initRestSimple<User>('user');

	ngOnInit(): void
	{
		this.start_date = this.getDefaultStartDate();
		this.end_date = this.getDefaultEndDate();
		this.setTitle('Producción Reportada vs Validada');

		this.rest_production_area.search({ limit: 9999, eq: { status: 'ACTIVE' }, sort_order: ['name_ASC'] })
		.pipe(take(1))
		.subscribe({
			next: (response) => this.production_area_list = response.data,
			error: (error) => this.showError(error)
		});

		//"trabajadores" = el mismo filtro que usa list-user del POS. No basta con type='USER':
		//los proveedores tambien son type='USER' y se colaban en la lista. Con is_provider=0 el
		//backend agrega el LEFT JOIN a user_permission y la condicion
		//(is_provider = 0 OR is_provider IS NULL). Ver user.php:36-53
		this.rest_user.search({
			limit: 9999,
			eq: { type: 'USER', status: 'ACTIVE' },
			search_extra: { 'user_permission.is_provider': 0 },
			sort_order: ['name_ASC']
		})
		.pipe(take(1))
		.subscribe({
			next: (response) => this.user_list = response.data,
			error: (error) => this.showError(error)
		});
	}

	getDefaultStartDate(): string
	{
		const now = new Date();
		now.setDate(now.getDate() - 6);
		now.setHours(0, 0, 0, 0);
		return Utils.getLocalMysqlStringFromDate(now).replace(' ', 'T').substring(0, 16);
	}

	getDefaultEndDate(): string
	{
		const now = new Date();
		now.setHours(23, 59, 59, 0);
		return Utils.getLocalMysqlStringFromDate(now).replace(' ', 'T').substring(0, 16);
	}

	generateReport()
	{
		this.is_loading = true;

		//la columna production.produced NO esta en UTC: el backend la escribe con un corrimiento de -7h
		//para que la madrugada cuente como el dia anterior. Por eso se manda la hora local tal cual,
		//sin convertir a UTC.
		const date_start = this.start_date.replace('T', ' ') + ':00';
		const date_end = this.end_date.replace('T', ' ') + ':59';

		this.rest.httpPost('reports/produccion_reportada_vs_validada.php', {
			start_timestamp: date_start,
			end_timestamp: date_end,
			production_area_id: this.production_area_id,
			user_id: this.user_id,
			item_id: this.item_id ?? 'ALL'
		})
		.subscribe({
			next: (data: any) => {
				this.results = Array.isArray(data) ? data : (data.data || []);
				this.searched = true;
				this.is_loading = false;
			},
			error: (error) => {
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

	downloadExcel()
	{
		const date_start = this.start_date.replace('T', ' ') + ':00';
		const date_end = this.end_date.replace('T', ' ') + ':59';
		const token = localStorage.getItem('session_token') || '';

		const url = `${this.rest.getApiPath()}/reports/produccion_reportada_vs_validada.php?start_timestamp=${encodeURIComponent(date_start)}&end_timestamp=${encodeURIComponent(date_end)}&production_area_id=${encodeURIComponent(this.production_area_id)}&user_id=${encodeURIComponent(this.user_id)}&item_id=${encodeURIComponent(this.item_id ?? 'ALL')}&format=tsv`;

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
			a.download = `produccion_reportada_vs_validada_${date_start.substring(0, 10)}_${date_end.substring(0, 10)}.tsv`;
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

	get total_reportado(): number
	{
		return this.results.reduce((total, row) => total + row.reportado, 0);
	}

	get total_validado(): number
	{
		return this.results.reduce((total, row) => total + row.validado, 0);
	}

	get total_merma(): number
	{
		return this.results.reduce((total, row) => total + row.merma, 0);
	}

	get total_diferencia(): number
	{
		return this.total_reportado - (this.total_validado + this.total_merma);
	}
}

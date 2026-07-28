import { Component } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Batch_Record } from '../../modules/shared/RestModels';
import { BatchRecordInfo } from '../../modules/shared/Models';
import { Rest } from '../../modules/shared/services/Rest';
import { ExcelUtils } from '../../classes/ExcelUtils';
import { LoadingComponent } from '../../components/loading/loading.component';
import { Utils } from '../../modules/shared/Utils';

interface BatchRecordRow {
	ID: number;
	Artículo: string;
	Código: string;
	Categoría: string;
	Lote: string;
	Caducidad: string;
	'ID Sucursal': number;
	Sucursal: string;
	Usuario: string;
	'Cant. Previa': number;
	Movimiento: number;
	'Cant. Final': number;
	Tipo: string;
	Vigente: string;
	Fecha: string;
	Descripción: string;
}

const headers = [
	'ID', 'Artículo', 'Código', 'Categoría', 'Lote', 'Caducidad',
	'ID Sucursal', 'Sucursal', 'Usuario', 'Cant. Previa', 'Movimiento', 'Cant. Final',
	'Tipo', 'Vigente', 'Fecha', 'Descripción'
];

@Component({
	selector: 'app-download-batch-records',
	imports: [LoadingComponent],
	templateUrl: './download-batch-records.component.html',
	styleUrl: './download-batch-records.component.css'
})
export class DownloadBatchRecordsComponent extends BaseComponent {
	rest_batch_record: Rest<Batch_Record, BatchRecordInfo> = this.rest.initRest<Batch_Record, BatchRecordInfo>(
		'batch_record_info',
		['id', 'batch', 'item_id', 'store_id', 'created', 'updated', 'movement_type', 'is_current', 'expiration_date']
	);

	type_dic: Record<string, string> = {
		'POSITIVE': 'Entrada',
		'NEGATIVE': 'Salida',
		'ADJUSTMENT': 'Ajuste'
	};

	downloadExcel() {
		this.is_loading = true;

		this.rest_batch_record.search({
			limit: 100000,
			page: 0,
			eq: {} as Batch_Record,
			gt: {} as Batch_Record,
			lt: {} as Batch_Record,
			ge: {} as Batch_Record,
			le: {} as Batch_Record,
			lk: {} as Batch_Record,
			nn: [],
			is_null: [],
			sort_order: [],
			csv: {},
			different: {},
			start: {} as Batch_Record,
			ends: {} as Batch_Record,
			search_extra: { is_current: '1' }
		}).subscribe({
			next: (response) => {
				if (!response.data || response.data.length === 0) {
					this.showError('No se encontraron lotes vigentes.');
					this.is_loading = false;
					return;
				}

				const rows: BatchRecordRow[] = response.data.map((info) => ({
					ID: info.batch_record.id,
					Artículo: info.item.name,
					Código: info.item.code || '',
					Categoría: info.category?.name || '',
					Lote: info.batch_record.batch,
					Caducidad: info.batch_record.expiration_date || '',
					'ID Sucursal': info.batch_record.store_id,
					Sucursal: info.store?.name || '',
					Usuario: info.user?.name || '',
					'Cant. Previa': info.batch_record.previous_qty,
					Movimiento: info.batch_record.movement_qty,
					'Cant. Final': info.batch_record.qty,
					Tipo: this.type_dic[info.batch_record.movement_type] || info.batch_record.movement_type,
					Vigente: info.batch_record.is_current ? 'Sí' : 'No',
					Fecha: Utils.getLocalMysqlStringFromDate(new Date(info.batch_record.created as unknown as string)),
					Descripción: info.batch_record.description || ''
				}));

				const today = new Date().toISOString().slice(0, 10);
				ExcelUtils.array2xlsx(rows, `lotes_vigentes_${today}.xlsx`, headers);
				this.showSuccess(`${rows.length} registros exportados.`);
				this.is_loading = false;
			},
			error: (error) => {
				this.showError(error);
				this.is_loading = false;
			}
		});
	}
}

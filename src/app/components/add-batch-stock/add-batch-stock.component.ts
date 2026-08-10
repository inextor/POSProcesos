import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, from, of, Observable } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Batch_Record, Item, Store } from '../../modules/shared/RestModels';
import { ExcelUtils } from '../../modules/shared/Finger/ExcelUtils';
import { ExcelUtils as XlsxUtils } from '../../classes/ExcelUtils';
import { Utils } from '../../modules/shared/Utils';
import { LoadingComponent } from '../loading/loading.component';

//El orden de los headers es sagrado: xlsx2json mapea por POSICION de columna,
//el texto del encabezado se ignora y solo se lee la primera hoja del archivo.
const HEADERS = ['item_id', 'store_id', 'batch', 'expiration_date', 'qty'];

//El endpoint es transaccional por request, asi que cada bloque se aplica completo o no se aplica.
const CHUNK_SIZE = 200;

//Ids por peticion al consultar lotes vigentes, para que la URL del GET no crezca de mas.
const ID_CHUNK_SIZE = 150;

//Un archivo puede traer miles de renglones: en pantalla solo se pintan los primeros errores
//y el resto se consulta en el Excel, para no colgar el navegador.
const MAX_ERRORS_ON_SCREEN = 50;

interface StockRow
{
	row_number: number;
	item_id: number;
	store_id: number;
	batch: string;
	expiration_date: string | null;
	qty: number;
	item_name: string;
}

interface RowError
{
	Fila: number;
	item_id: string;
	Lote: string;
	Motivo: string;
}

@Component({
	selector: 'app-add-batch-stock',
	imports: [LoadingComponent],
	templateUrl: './add-batch-stock.component.html',
	styleUrl: './add-batch-stock.component.css'
})
export class AddBatchStockComponent extends BaseComponent
{
	rest_item = this.rest.initRestSimple<Item>('item');
	rest_store = this.rest.initRestSimple<Store>('store');
	rest_batch_record = this.rest.initRestSimple<Batch_Record>('batch_record');

	http!: HttpClient;
	stock_file: File | null = null;
	comment: string = '';

	is_validated: boolean = false;
	valid_rows: StockRow[] = [];
	row_errors: RowError[] = [];
	visible_errors: RowError[] = [];
	total_rows: number = 0;
	applied_rows: number = 0;

	ngOnInit(): void
	{
		this.http = this.injector.get(HttpClient);
	}

	onFileChanged(event: Event): void
	{
		let target = event.target as HTMLInputElement;

		this.stock_file = target.files && target.files.length ? target.files[0] : null;
		this.resetValidation();
	}

	resetValidation(): void
	{
		this.is_validated = false;
		this.valid_rows = [];
		this.row_errors = [];
		this.visible_errors = [];
		this.total_rows = 0;
		this.applied_rows = 0;
	}

	downloadTemplate(): void
	{
		ExcelUtils.downloadTemplate('plantilla_inventario_lotes.xlsx', HEADERS);
	}

	//Excel entrega la fecha como Date (cellDates:true), como texto o como serial numerico.
	//Se normaliza a 'YYYY-MM-DD' sin pasar por toISOString, que correria la fecha un dia
	//por la zona horaria.
	normalizeDate(value: any): string | null
	{
		if (value === null || value === undefined || ('' + value).trim() === '')
		{
			return null;
		}

		if (value instanceof Date)
		{
			//SheetJS entrega la fecha en hora local o en UTC segun la version. Si cae a
			//medianoche UTC exacta se lee en UTC, si no en local: asi ninguna se recorre.
			if (value.getUTCHours() === 0 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0)
			{
				return this.formatYmd(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
			}

			return this.formatYmd(value.getFullYear(), value.getMonth() + 1, value.getDate());
		}

		if (typeof value === 'number')
		{
			//Serial de Excel: 25569 son los dias entre el epoch de Excel y el de Unix.
			let date = new Date(Math.round((value - 25569) * 86400000));
			return this.formatYmd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
		}

		let str = ('' + value).trim();
		let ymd = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);

		if (ymd)
		{
			return this.formatYmd(parseInt(ymd[1]), parseInt(ymd[2]), parseInt(ymd[3]));
		}

		let dmy = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);

		if (dmy)
		{
			return this.formatYmd(parseInt(dmy[3]), parseInt(dmy[2]), parseInt(dmy[1]));
		}

		return null;
	}

	formatYmd(year: number, month: number, day: number): string | null
	{
		if (month < 1 || month > 12 || day < 1 || day > 31)
		{
			return null;
		}

		let mm = month < 10 ? '0' + month : '' + month;
		let dd = day < 10 ? '0' + day : '' + day;

		return year + '-' + mm + '-' + dd;
	}

	validateFile(event: Event): void
	{
		event.preventDefault();

		if (!this.stock_file)
		{
			this.showError('Debe seleccionar un archivo');
			return;
		}

		this.resetValidation();
		this.is_loading = true;

		ExcelUtils.xlsx2json(this.stock_file, HEADERS)
			.then((response: any[]) =>
			{
				//La fila 1 del Excel es el encabezado, por eso el +2 al numerar.
				let rows = response
					.map((row, index) => ({ row, row_number: index + 2 }))
					.filter(r => !this.isEmptyRow(r.row));

				this.total_rows = rows.length;

				if (this.total_rows === 0)
				{
					this.showError('El archivo no tiene registros');
					this.is_loading = false;
					return;
				}

				let item_ids = new Set<number>();

				rows.forEach(r =>
				{
					let id = parseInt(r.row.item_id);

					if (!isNaN(id))
					{
						item_ids.add(id);
					}
				});

				this.loadCatalogs(Array.from(item_ids), rows);
			})
			.catch((error) =>
			{
				this.showError('Error al leer el archivo: ' + error);
				this.is_loading = false;
			});
	}

	isEmptyRow(row: any): boolean
	{
		return HEADERS.every(h => row[h] === null || row[h] === undefined || ('' + row[h]).trim() === '');
	}

	//Se traen los articulos, las sucursales y los lotes vigentes de esos articulos para poder
	//validar todo en el navegador antes de mandar nada al servidor.
	loadCatalogs(item_ids: number[], rows: { row: any, row_number: number }[]): void
	{
		this.subs.sink = forkJoin({
			items: this.rest_item.searchAsPost({ csv: { id: item_ids }, limit: 99999 }),
			stores: this.rest_store.search({ limit: 99999 }),
			batches: this.searchCurrentBatches(item_ids)
		}).subscribe({
			next: (responses) =>
			{
				let item_dict = new Map<number, Item>();
				responses.items.data.forEach(i => item_dict.set(i.id, i));

				let store_ids = new Set<number>(responses.stores.data.map(s => s.id));

				let batch_dict = new Map<string, Batch_Record>();
				responses.batches.forEach(br => batch_dict.set(this.batchKey(br.item_id, br.store_id, br.batch), br));

				this.checkRows(rows, item_dict, store_ids, batch_dict);
				this.is_loading = false;
			},
			error: (error) => this.showError(error)
		});
	}

	//batch_record.php solo implementa get(), un POST responde 405. Por eso la busqueda va por
	//GET y los ids se parten en bloques, para no pasarse del largo maximo de la URL.
	searchCurrentBatches(item_ids: number[]): Observable<Batch_Record[]>
	{
		let chunks: number[][] = [];

		for (let i = 0; i < item_ids.length; i += ID_CHUNK_SIZE)
		{
			chunks.push(item_ids.slice(i, i + ID_CHUNK_SIZE));
		}

		if (!chunks.length)
		{
			return of([]);
		}

		let requests = chunks.map(ids =>
			this.rest_batch_record.search({ csv: { item_id: ids }, eq: { is_current: 1 }, limit: 99999 })
		);

		return forkJoin(requests).pipe(
			map(responses => responses.reduce((all, r) => all.concat(r.data), [] as Batch_Record[]))
		);
	}

	batchKey(item_id: number, store_id: number, batch: string): string
	{
		return item_id + '|' + store_id + '|' + ('' + batch).trim();
	}

	checkRows(
		rows: { row: any, row_number: number }[],
		item_dict: Map<number, Item>,
		store_ids: Set<number>,
		batch_dict: Map<string, Batch_Record>
	): void
	{
		//Guarda la caducidad que cada lote lleva DENTRO del archivo, para detectar que el
		//mismo lote venga con dos fechas distintas en renglones diferentes.
		let file_batches = new Map<string, string | null>();

		rows.forEach(({ row, row_number }) =>
		{
			let item_id = parseInt(row.item_id);
			let store_id = parseInt(row.store_id);
			let qty = parseFloat(row.qty);
			let batch = row.batch === null || row.batch === undefined ? '' : ('' + row.batch).trim();
			let item = item_dict.get(item_id);

			if (isNaN(item_id))
			{
				this.addError(row_number, row, 'El item_id no es un número válido');
				return;
			}

			if (!item)
			{
				this.addError(row_number, row, 'No existe el artículo con id ' + item_id);
				return;
			}

			if (item.status === 'DELETED')
			{
				this.addError(row_number, row, 'El artículo "' + item.name + '" está eliminado');
				return;
			}

			if (isNaN(store_id) || !store_ids.has(store_id))
			{
				this.addError(row_number, row, 'No existe la sucursal con id ' + row.store_id);
				return;
			}

			if (isNaN(qty) || qty <= 0)
			{
				this.addError(row_number, row, 'La cantidad debe ser un número mayor a cero');
				return;
			}

			if (!item.batch_option || item.batch_option === 'NONE')
			{
				this.addError(row_number, row, 'El artículo "' + item.name + '" no está configurado para lote/caducidad');
				return;
			}

			let needs_batch = item.batch_option === 'BATCH_ONLY' || item.batch_option === 'BATCH_AND_EXPIRATION';
			let needs_expiration = item.batch_option === 'EXPIRATION_ONLY' || item.batch_option === 'BATCH_AND_EXPIRATION';

			if (needs_batch && batch === '')
			{
				this.addError(row_number, row, 'El artículo "' + item.name + '" requiere código de lote');
				return;
			}

			let expiration_date: string | null = null;

			if (row.expiration_date !== null && row.expiration_date !== undefined && ('' + row.expiration_date).trim() !== '')
			{
				expiration_date = this.normalizeDate(row.expiration_date);

				if (expiration_date === null)
				{
					this.addError(row_number, row, 'La fecha de caducidad "' + row.expiration_date + '" no es válida (usar AAAA-MM-DD)');
					return;
				}
			}

			if (needs_expiration && expiration_date === null)
			{
				this.addError(row_number, row, 'El artículo "' + item.name + '" requiere fecha de caducidad');
				return;
			}

			//El backend rechaza el lote si ya existe vigente con otra caducidad, mejor avisarlo aqui.
			let key = this.batchKey(item_id, store_id, batch);
			let existing = batch_dict.get(key);

			if (existing && existing.expiration_date && expiration_date && existing.expiration_date !== expiration_date)
			{
				this.addError(
					row_number,
					row,
					'El lote "' + batch + '" ya existe con caducidad ' + existing.expiration_date + ' en esa sucursal'
				);
				return;
			}

			if (file_batches.has(key) && file_batches.get(key) !== expiration_date)
			{
				this.addError(row_number, row, 'El lote "' + batch + '" viene con dos fechas de caducidad distintas en el archivo');
				return;
			}

			file_batches.set(key, expiration_date);

			this.valid_rows.push({
				row_number,
				item_id,
				store_id,
				batch,
				expiration_date,
				qty,
				item_name: item.name
			});
		});

		this.is_validated = true;
		this.visible_errors = this.row_errors.slice(0, MAX_ERRORS_ON_SCREEN);

		if (this.row_errors.length)
		{
			this.showWarning(this.row_errors.length + ' renglones con problemas. Corrige el archivo y vuelve a validar.');
		}
		else
		{
			this.showSuccess(this.valid_rows.length + ' renglones listos para aplicar.');
		}
	}

	addError(row_number: number, row: any, motivo: string): void
	{
		this.row_errors.push({
			Fila: row_number,
			item_id: row.item_id === null || row.item_id === undefined ? '' : '' + row.item_id,
			Lote: row.batch === null || row.batch === undefined ? '' : '' + row.batch,
			Motivo: motivo
		});
	}

	downloadErrors(): void
	{
		XlsxUtils.array2xlsx(this.row_errors, 'errores_carga_lotes.xlsx', ['Fila', 'item_id', 'Lote', 'Motivo']);
	}

	applyStock(): void
	{
		if (!this.is_validated)
		{
			this.showWarning('Primero valida el archivo');
			return;
		}

		if (this.row_errors.length)
		{
			this.showWarning('Hay renglones con problemas, corrige el archivo antes de aplicar');
			return;
		}

		if (!this.valid_rows.length)
		{
			this.showWarning('No hay renglones que aplicar');
			return;
		}

		let description = this.comment.trim();

		let records = this.valid_rows.map(r =>
		{
			let record: any = {
				item_id: r.item_id,
				store_id: r.store_id,
				qty: r.qty
			};

			if (r.batch !== '')
			{
				record.batch = r.batch;
			}

			if (r.expiration_date)
			{
				record.expiration_date = r.expiration_date;
			}

			if (description !== '')
			{
				record.comment = description;
			}

			return record;
		});

		let chunks: any[][] = [];

		for (let i = 0; i < records.length; i += CHUNK_SIZE)
		{
			chunks.push(records.slice(i, i + CHUNK_SIZE));
		}

		let url = `${this.rest.domain_configuration.domain}/${this.rest.url_base}/updates/stock_add.php`;

		this.applied_rows = 0;
		this.is_loading = true;

		this.subs.sink = from(chunks)
			.pipe(
				concatMap((chunk) =>
					this.http
						.post<any>(url, chunk, { headers: this.rest.getSessionHeaders(), withCredentials: true })
						.pipe(map(() => chunk.length))
				)
			)
			.subscribe({
				next: (chunk_size) =>
				{
					this.applied_rows += chunk_size;
				},
				error: (error) =>
				{
					this.is_loading = false;
					this.showError(
						'Se aplicaron ' + this.applied_rows + ' de ' + records.length + ' renglones y se detuvo: ' + Utils.getErrorString(error)
					);
				},
				complete: () =>
				{
					this.is_loading = false;
					this.showSuccess('Se aplicaron ' + this.applied_rows + ' renglones de inventario');
					this.stock_file = null;
					this.comment = '';
					this.resetValidation();

					let file_input = document.querySelector('input[name="batch_stock_file"]') as HTMLInputElement;

					if (file_input)
					{
						file_input.value = '';
					}
				}
			});
	}

	onCommentChanged(event: Event): void
	{
		this.comment = (event.target as HTMLInputElement).value;
	}
}

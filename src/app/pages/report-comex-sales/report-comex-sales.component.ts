import { Component, OnInit } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Order, Store, Item, User, Sat_Factura } from '../../modules/shared/RestModels';
import { Rest, RestResponse, SearchObject } from '../../modules/shared/services/Rest';
import { ItemInfo, OrderInfo, OrderItemInfo } from '../../modules/shared/Models';
import { forkJoin, of, EMPTY, Observable } from 'rxjs';
import { switchMap, map, tap, take, reduce, expand, mergeMap } from 'rxjs/operators';
import { Utils } from '../../modules/shared/Utils';
import { FormsModule } from '@angular/forms'; // Added FormsModule
import { ExcelUtils } from '../../classes/ExcelUtils';


interface COrder extends Order {
	start_timestamp: Date;
	end_timestamp: Date;
}

interface CResponse {
	order_info: RestResponse<OrderInfo>;
	sat_facturas: RestResponse<Sat_Factura>;
}

interface ComexReportRow {
	NUM_CONCESIONARIO: string;
	NUM_CUENTA: string;
	NUM_SUCURSAL: string;
	NOMBRE_SUCURSAL: string;
	FECHA_FACTURA: string;
	NUMERO_FACTURA: string;
	FECHA_PEDIDO: string;
	NUMERO_PEDIDO: string;
	NUMERO_CLIENTE: string;
	LINEA: number;
	SKU: string;
	DESCRIPCION_SKU: string;
	CANTIDAD_PIEZAS: number;
	CANTIDAD_LITROS: number;
	PRECIO_UNITARIO_NETO: number;
	IMPORTE_NETO: number;
	FACTOR_IVA: number;
	COSTO_UNITARIO_NETO: number;
	IMPORTE_NETO_TOTAL: number;
	TIPO_MOVIMIENTO: number;
	NUMERO_CLIENTE_LEALTAD: string;
	RFC_VENTA: string;
	RAZON_SOCIAL_VENTA: string;
	RFC_FACTURA: string;
	RAZON_SOCIAL_FACTURA: string;
	NUMERO_EMPLEADO: string;
	NOMBRE_EMPLEADO: string;
	ECOMMERCE: string;
	SEGMENTO: string;
	GENERO: string;
	EDAD: string;
	FECHA_PEDIDO_ORIGINAL: string;
	NUMERO_PEDIDO_ORIGINAL: string;
	LINEA_ORIGINAL: string;
}

const headers = [
	'NUM_CONCESIONARIO', 'NUM_CUENTA', 'NUM_SUCURSAL', 'NOMBRE_SUCURSAL', 'FECHA_FACTURA', 'NUMERO_FACTURA', 'FECHA_PEDIDO',
	'NUMERO_PEDIDO', 'NUMERO_CLIENTE', 'LINEA', 'SKU', 'DESCRIPCION_SKU', 'CANTIDAD_PIEZAS', 'CANTIDAD_LITROS',
	'PRECIO_UNITARIO_NETO', 'IMPORTE_NETO', 'FACTOR_IVA', 'COSTO_UNITARIO_NETO', 'IMPORTE_NETO_TOTAL', 'TIPO_MOVIMIENTO',
	'NUMERO_CLIENTE_LEALTAD', 'RFC_VENTA', 'RAZON_SOCIAL_VENTA', 'RFC_FACTURA', 'RAZON_SOCIAL_FACTURA', 'NUMERO_EMPLEADO',
	'NOMBRE_EMPLEADO', 'ECOMMERCE', 'SEGMENTO', 'GENERO', 'EDAD', 'FECHA_PEDIDO_ORIGINAL', 'NUMERO_PEDIDO_ORIGINAL',
	'LINEA_ORIGINAL',
];

@Component({
	selector: 'app-report-comex-sales',
	templateUrl: './report-comex-sales.component.html',
	styleUrls: [/*'./report-comex-sales.component.css'*/],
	standalone: true, // Added standalone: true
	imports: [FormsModule] // Added FormsModule to imports
})
export class ReportComexSalesComponent extends BaseComponent implements OnInit {

	store_list: Store[] = [];
	start_date: string = '';
	end_date: string = '';
	store_id: number | null = null;

	progress = 0;
	progress_message = '';
	rest_order_info: Rest<Order, OrderInfo> = this.rest.initRest('order_info');
	rest_store: Rest<Store, Store> = this.rest.initRest('store');
	rest_sat_factura: Rest<Sat_Factura, Sat_Factura> = this.rest.initRest('sat_factura');

	ngOnInit(): void {
		this.start_date = this.getFirstDayOfMonth();
		this.end_date = this.getLastDayOfMonth();

		if (this.store_list.length === 0) {
			this.rest_store.search({ limit: 1000 }).pipe(take(1)).subscribe(response => {
				this.store_list = response.data;
			});
		}
	}

	getFirstDayOfMonth(): string
	{
		const now = new Date();
		now.setDate(1);
		now.setHours(0,0,0,0);
		return Utils.getLocalMysqlStringFromDate(now);
	}

	getLastDayOfMonth(): string
	{
		let d = Utils.getEndOfMonth(new Date());
		d.setHours(23,59,0,0);
		return Utils.getLocalMysqlStringFromDate(d);
	}

	generateReport() {
		this.is_loading = true;
		this.progress = 0;
		this.progress_message = 'Iniciando proceso...';

		let start_timestamp = Utils.getDateFromLocalMysqlString(this.start_date);

		let d = Utils.getDateFromLocalMysqlString(this.end_date);
		d.setSeconds(59,0);
		let end_timestamp = Utils.getDateFromLocalMysqlString(this.end_date);

		let store_id = this.store_id as number;
		const BATCH_SIZE = 100;

		let search_object: SearchObject<COrder> = this.rest_order_info.getEmptySearch();
		search_object.eq = { store_id, start_timestamp, end_timestamp };
		search_object.limit = BATCH_SIZE;



		// 1. Setup the very first search (Page 0)
		// We do NOT create a loop here. Just one object.
		let initialSearch = { ...search_object, limit: BATCH_SIZE, page: 0 } as Partial<SearchObject<COrder>>;

		const makeRequest = (s: Partial<SearchObject<COrder>>) =>
		{
			return this.rest_order_info.search(s).pipe
			(
				mergeMap(response =>
				{
					let sat_factura_ids: number[] = [];

					for (const order_info of response.data) {
						if( order_info.order.sat_factura_id )
						{
							sat_factura_ids.push(order_info.order.sat_factura_id);
						}
					}

					return forkJoin({
						order_info: of( response ),
						sat_facturas: sat_factura_ids.length
							? this.rest_sat_factura.search({ csv:{ id: sat_factura_ids }, limit: 999999 })
							: of({total:0, data:[]}) as Observable<RestResponse<Sat_Factura>>
					})
				})
			);
		}

		let acc: ComexReportRow[] = [];

		// 2. Start the chain
		return makeRequest(initialSearch).pipe
		(
			// 3. 'expand' acts as a recursive loop.
			// It subscribes to the output, looks at it, and decides if it should run again.
			expand((cresponse, index) => {
				// 'index' counts how many recursions we've done.
				// We just finished page 'index'. Next is 'index + 1'.
				const nextPage = index + 1;
				const totalPages = Math.ceil(cresponse.order_info.total/ BATCH_SIZE);

				this.progress = Math.round(100 * nextPage / totalPages);

				console.log('Launching gemini code on expand 4th iteration', nextPage, totalPages,Date.now());

				// STOP CONDITION: If we have enough pages, return EMPTY to stop the recursion.
				if (nextPage >= totalPages) {
					return EMPTY;
				}

				// CONTINUE CONDITION: Create the next request object ONLY NOW.
				const nextSearch = { ...initialSearch, page: nextPage };

				// This return triggers the next subscription.
				// The next request cannot start until this line runs.
				return makeRequest(nextSearch);
			}),
			// 4. 'reduce' collects every single response from 'expand' into one giant array
			reduce((acc:ComexReportRow[],response:CResponse) => {
				// Add the new data to our accumulated array
				//acc.data.push(...currentResponse.data);
				// Keep the total accurate
				//acc.total = currentResponse.total;

				for (const order_info of response.order_info.data)
				{
					let index = response.sat_facturas.data.findIndex(s => s.id === order_info.order.sat_factura_id);

					let sat_factura:Sat_Factura | null = index >= 0 ? response.sat_facturas.data[index] : null;


					let store = this.store_list.find(s => s.id === order_info.order.store_id );

					let line_number = 1;
					for (const item_item_info of order_info.items)
					{
						const row = this.createReportRow(order_info, item_item_info, line_number, store as Store, sat_factura);
						acc.push(row);
						line_number++;
					}
				}
				return acc;
			},[] as ComexReportRow[]) // The initial value is implicit from the first emission
		)
		.subscribe
		({
			next: (report_rows:ComexReportRow[]) => {
				this.progress = 100;
				this.progress_message = 'Generando archivo Excel...';
				const today = new Date().toISOString().slice(0, 10);
				ExcelUtils.array2xlsx(report_rows, `reporte.xlsx`, headers);
				this.is_loading = false;
				this.showSuccess('Reporte generado exitosamente.');
			},
			error: (error:any) => {
				this.showError(error);
			}
		});
	}

	formatDate(dateStr: string | Date | undefined): string {

		if (!dateStr) return '';

		try {
			const date = new Date(dateStr);
			if (isNaN(date.getTime())) return '';
			const day = ('0' + date.getDate()).slice(-2);
			const month = ('0' + (date.getMonth() + 1)).slice(-2);
			const year = date.getFullYear();
			return `${day}/${month}/${year}`;
		}
		catch (e) {
			return '';
		}
	}

	parseNum(value: any, decimals = 2): number {
		const num = parseFloat(value);
		if (isNaN(num)) {
			return 0;
		}
		return parseFloat(num.toFixed(decimals));
	}

	createReportRow(order_info: OrderInfo, order_item_info: OrderItemInfo, line_number: number, store: Store, sat_factura: Sat_Factura | null): ComexReportRow {
		let cantidad_litros = 0;

		let percent_iva = order_item_info.order_item.subtotal/order_item_info.order_item.subtotal;
		let percent_iva_rounded  = 0;

		if( percent_iva > 0.02 && percent_iva <= 0.081 )
		{
			percent_iva_rounded = 8;
		}
		else if( percent_iva > 0.081 )
		{
			percent_iva_rounded = 16
		}

		let cashier_name = order_info.cashier?.name || '';

		let numero_lealtad = order_info?.client?.code || '';

		// Si la unidad de medida es “G” Gramos o “CM” Centímetros o cualquier otro artículo a
		// granel CANTIDAD_PIEZA es igual a 1. Si no la CANTIDAD_PIEZA solo debe ser redondeado
		// a 4 decimales.
		let qty_piezas = order_item_info.item.partial_sale == 'YES' ? 1 : order_item_info.order_item.qty.toFixed(4);

		const row: ComexReportRow = {
			NUM_CONCESIONARIO: (store as any)?.comex_num_concesionario || '',
			NUM_CUENTA: (store as any)?.comex_num_cuenta || '',
			NUM_SUCURSAL: store.code || '',
			NOMBRE_SUCURSAL: (store as any)?.comex_nombre_oficial || store?.name || '',
			FECHA_FACTURA: sat_factura ? this.formatDate(sat_factura.created as Date) : this.formatDate(order_info.order.closed_timestamp as Date),
			NUMERO_FACTURA: sat_factura?.folio ? sat_factura.serie+'-'+sat_factura.folio || '' : ''+order_info.order.id,
			FECHA_PEDIDO: this.formatDate(order_info.order.closed_timestamp as Date),
			NUMERO_PEDIDO: order_info.order.id.toString(),
			NUMERO_CLIENTE: order_info.order.client_user_id?.toString() || '',
			LINEA: line_number,
			SKU: order_item_info.item.code || order_item_info.item.id.toString(),
			DESCRIPCION_SKU: order_item_info.item.name,
			CANTIDAD_PIEZAS: order_item_info.order_item.qty,
			CANTIDAD_LITROS: 0,
			PRECIO_UNITARIO_NETO: this.parseNum(order_item_info.order_item.unitary_price, 2),
			IMPORTE_NETO: this.parseNum(order_item_info.order_item.subtotal, 2),
			FACTOR_IVA: this.getIva(order_item_info, order_info.store),
			COSTO_UNITARIO_NETO: order_item_info.item.reference_price,
			IMPORTE_NETO_TOTAL: this.parseNum(order_info.order.total - order_info.order.discount, 2),
			TIPO_MOVIMIENTO: order_item_info.order_item.type == 'NORMAL' ? 1 : 2,
			NUMERO_CLIENTE_LEALTAD: numero_lealtad,
			RFC_VENTA:  sat_factura ? order_info?.order?.sat_receptor_rfc||'' : '',
			RAZON_SOCIAL_VENTA: sat_factura ? order_info?.order?.sat_razon_social||'' : '',
			RFC_FACTURA: sat_factura ? order_info.order.sat_receptor_rfc||'' : '',
			RAZON_SOCIAL_FACTURA: sat_factura ? order_info.order.sat_razon_social||'' : '',
			NUMERO_EMPLEADO: order_info.order.cashier_user_id?.toString() || '',
			NOMBRE_EMPLEADO:  cashier_name,
			ECOMMERCE: 'NO',
			SEGMENTO: '',
			GENERO: '',
			EDAD: '',
			FECHA_PEDIDO_ORIGINAL: '',
			NUMERO_PEDIDO_ORIGINAL: '',
			LINEA_ORIGINAL: ''
		};
		return row;
	}

	getIva(oii: OrderItemInfo, store: Store): number
	{
		if( oii.order_item.total < 1 )
		{
			return oii.item.applicable_tax == 'DEFAULT' ? store.tax_percent : oii.item.tax_percent;
		}

		let subtotal = oii.order_item.total - oii.order_item.tax;
		return Math.round( (oii.order_item.tax / subtotal) * 100 );
	}
}

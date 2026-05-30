import { Component, OnInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple } from '../../modules/shared/services/Rest';
import { Order, Store, User, Price_Type, Stock_Record } from '../../modules/shared/RestModels';
import { ItemInfo, AttachmentInfo } from '../../modules/shared/Models';
import { LoadingComponent } from '../../components/loading/loading.component';
import { AttachmentUploaderComponent } from '../../components/attachment-uploader/attachment-uploader.component';
import { SearchItemsComponent } from '../../components/search-items/search-items.component';
import { SearchUsersComponent } from '../../components/search-users/search-users.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { FacturaMetaData } from '../../modules/shared/FacturaMetaData';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { OrderBuilder } from '../../modules/shared/OrderBuilder';
import { forkJoin, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

interface CfdiConcepto {
	descripcion: string;
	cantidad: number;
	valorUnitario: number;
	importe: number;
	descuento: number;
	claveUnidad: string;
	unidad: string;
	matched_item?: ItemInfo;
	search_str: string;
	totalIva: number;
	totalIeps: number;
	totalTraslados: number;
	totalRetenciones: number;
}

@Component({
	selector: 'app-create-order-from-xml',
	templateUrl: './create-order-from-xml.component.html',
	styleUrls: ['./create-order-from-xml.component.css'],
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		LoadingComponent,
		AttachmentUploaderComponent,
		SearchItemsComponent,
		SearchUsersComponent,
		ModalComponent
	]
})
export class CreateOrderFromXmlComponent extends BaseComponent implements OnInit {

	// Selected Store and Client
	store_list: Store[] = [];
	selected_store_id: number | null = null;
	selected_client: User | null = null;
	price_type_list: Price_Type[] = [];

	// Upload details
	xml_attachment_id: number | null = null;
	xml_attachment_info: AttachmentInfo | null = null;
	loading_cfdi: boolean = false;

	// XML Data
	factura_metadata: FacturaMetaData | null = null;
	cfdi_conceptos: CfdiConcepto[] = [];

	// Status flags
	is_saving: boolean = false;

	// Rest Services
	rest_store!: RestSimple<Store>;
	rest_item_info!: RestSimple<ItemInfo>;
	rest_order_info!: RestSimple<any>;
	http!: HttpClient;

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit(): void {
		this.setTitle('Crear Pedido desde XML (CFDI)');

		this.rest_store = this.rest.initRestSimple<Store>('store');
		this.rest_item_info = this.rest.initRestSimple<ItemInfo>('item_info');
		this.rest_order_info = this.rest.initRestSimple<any>('order_info');
		this.http = this.injector.get(HttpClient);

		// Fetch Stores and Price Types
		this.is_loading = true;
		this.subs.sink = forkJoin({
			stores: this.rest_store.search({ limit: 9999, sort_order: ['name_ASC'] }),
			price_types: this.rest.getPriceTypes(false)
		}).subscribe({
			next: (response) => {
				this.store_list = response.stores.data;
				this.price_type_list = response.price_types.data;
				// Default to user's store
				if (this.rest.user && this.rest.user.store_id) {
					this.selected_store_id = this.rest.user.store_id;
				}
				this.is_loading = false;
			},
			error: (error) => {
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}

	onClientSelected(client: User | null) {
		this.selected_client = client;
	}

	onXmlAttachmentChange(attachmentInfo: AttachmentInfo) {
		this.xml_attachment_info = attachmentInfo;
		this.xml_attachment_id = attachmentInfo.attachment.id;

		this.loadAndParseXml();
	}

	loadAndParseXml() {
		if (!this.xml_attachment_id) return;

		this.loading_cfdi = true;
		this.factura_metadata = null;
		this.cfdi_conceptos = [];

		const url = this.rest.getFilePath(this.xml_attachment_id);

		fetch(url, { credentials: 'include' })
			.then(response => response.text())
			.then(xmlString => {
				this.factura_metadata = new FacturaMetaData(xmlString);
				this.cfdi_conceptos = this.parseConceptosFromXml(xmlString);
				this.matchConceptosWithItems();
				this.searchClientFromXml();
			})
			.catch(error => {
				console.error('Error al cargar XML', error);
				this.rest.showError('Error al cargar y procesar el archivo XML');
				this.loading_cfdi = false;
			});
	}

	parseConceptosFromXml(xmlString: string): CfdiConcepto[] {
		const parser = new DOMParser();
		const dom: XMLDocument = parser.parseFromString(xmlString, "application/xml");
		let conceptos: CfdiConcepto[] = [];

		const getByTag = (el: Element | Document, tag: string) => {
			let result = el.getElementsByTagName("cfdi:" + tag);
			if (result.length === 0) {
				result = el.getElementsByTagName(tag);
			}
			return result;
		};

		let conceptosElements = getByTag(dom, "Concepto");

		for (let i = 0; i < conceptosElements.length; i++) {
			let element = conceptosElements.item(i) as Element;
			let descripcion = element.getAttribute('Descripcion') || '';
			let importe = parseFloat(element.getAttribute('Importe') || '0');
			let descuento = parseFloat(element.getAttribute('Descuento') || '0');
			let cantidad = parseFloat(element.getAttribute('Cantidad') || '0');
			let valorUnitario = parseFloat(element.getAttribute('ValorUnitario') || '0');

			let totalIva = 0;
			let totalIeps = 0;
			let totalTraslados = 0;
			let totalRetenciones = 0;

			let impuestosElements = getByTag(element, "Impuestos");
			if (impuestosElements.length > 0) {
				let impuestos = impuestosElements.item(0) as Element;

				let trasladoElements = getByTag(impuestos, "Traslado");
				for (let j = 0; j < trasladoElements.length; j++) {
					let traslado = trasladoElements.item(j) as Element;
					let impImporte = parseFloat(traslado.getAttribute('Importe') || '0');
					let impuesto = traslado.getAttribute('Impuesto') || '';

					if (impuesto === '002') {
						totalIva += impImporte;
					} else if (impuesto === '003') {
						totalIeps += impImporte;
					}
					totalTraslados += impImporte;
				}

				let retencionElements = getByTag(impuestos, "Retencion");
				for (let j = 0; j < retencionElements.length; j++) {
					let retencion = retencionElements.item(j) as Element;
					let impImporte = parseFloat(retencion.getAttribute('Importe') || '0');
					totalRetenciones += impImporte;
				}
			}

			conceptos.push({
				descripcion,
				cantidad,
				valorUnitario,
				importe: importe - descuento,
				descuento,
				claveUnidad: element.getAttribute('ClaveUnidad') || '',
				unidad: element.getAttribute('Unidad') || '',
				search_str: '',
				totalIva,
				totalIeps,
				totalTraslados,
				totalRetenciones
			});
		}

		return conceptos;
	}

	matchConceptosWithItems() {
		if (this.cfdi_conceptos.length === 0) {
			this.loading_cfdi = false;
			this.rest.showError('No se encontraron conceptos en el XML');
			return;
		}

		const searchPromises = this.cfdi_conceptos.map(concepto => {
			return this.rest_item_info.search({
				search_extra: { category_name: concepto.descripcion, status: 'ACTIVE' },
				limit: 1
			} as any).toPromise();
		});

		Promise.all(searchPromises)
			.then(results => {
				results.forEach((response: any, index) => {
					if (response && response.data && response.data.length > 0) {
						this.cfdi_conceptos[index].matched_item = response.data[0];
					}
				});
				this.loading_cfdi = false;
			})
			.catch(error => {
				console.error('Error al emparejar artículos', error);
				this.rest.showWarning('Ocurrió un error al buscar coincidencias automáticas de artículos.');
				this.loading_cfdi = false;
			});
	}

	selectItemForConcepto(concepto: CfdiConcepto, itemInfo: ItemInfo) {
		concepto.matched_item = itemInfo;
		concepto.search_str = '';
	}

	clearConceptoMatch(concepto: CfdiConcepto) {
		concepto.matched_item = undefined;
		concepto.search_str = '';
	}

	getMatchedCount(): number {
		return this.cfdi_conceptos.filter(c => c.matched_item).length;
	}

	getUnmatchedCount(): number {
		return this.cfdi_conceptos.filter(c => !c.matched_item).length;
	}

	getTotalXml(): number {
		return this.cfdi_conceptos.reduce((acc, c) => acc + c.importe + c.totalTraslados - c.totalRetenciones, 0);
	}

	createOrder() {
		if (!this.selected_client) {
			this.rest.showError('Por favor seleccione un cliente');
			return;
		}

		if (!this.selected_store_id) {
			this.rest.showError('Por favor seleccione una sucursal');
			return;
		}

		if (this.cfdi_conceptos.length === 0) {
			this.rest.showError('No se han cargado conceptos del XML');
			return;
		}

		if (this.getUnmatchedCount() > 0) {
			this.rest.showError('Por favor asigne un artículo coincidente del inventario a todos los conceptos del XML');
			return;
		}

		this.is_saving = true;

		try {
			const store = this.store_list.find(x => x.id === this.selected_store_id) as Store;
			let price_type = this.price_type_list.find(pt => pt.id === this.selected_client?.price_type_id) || this.price_type_list[0];
			if (!price_type) {
				price_type = GetEmpty.price_type();
			}

			const order_builder = new OrderBuilder(this.rest, price_type, store, this.rest.user as User);

			// Set client
			order_builder.user_client = this.selected_client;

			// Set order details
			order_builder.order_info.order.currency_id = this.factura_metadata?.moneda || 'MXN';
			order_builder.order_info.order.note = 'Creado desde XML Factura' + (this.factura_metadata?.folio ? ' Folio: ' + this.factura_metadata.folio : '');
			order_builder.order_info.order.sat_receptor_rfc = this.factura_metadata?.rfcReceptor || null;
			order_builder.order_info.order.sat_razon_social = this.factura_metadata?.receptor || null;
			order_builder.order_info.order.sat_domicilio_fiscal_receptor = this.factura_metadata?.domicilioReceptor || '';
			order_builder.order_info.order.sat_regimen_fiscal_receptor = this.factura_metadata?.regimenFiscalReceptor || '';

			// Add items
			for (const concepto of this.cfdi_conceptos) {
				const item_info = concepto.matched_item!;

				// Ensure item has a stock record for the selected store to avoid OrderBuilder crashing
				if (item_info.item.availability_type === 'ON_STOCK') {
					const has_stock = item_info.records.some(sr => sr.store_id === store.id);
					if (!has_stock) {
						const dummy_stock_record: Stock_Record = {
							id: 0,
							store_id: store.id,
							item_id: item_info.item.id,
							qty: 0,
							movement_qty: 0,
							movement_type: 'ADJUSTMENT',
							previous_qty: 0,
							created: new Date(),
							updated: new Date(),
							created_by_user_id: 0,
							updated_by_user_id: 0,
							description: null,
							is_current: null,
							order_item_id: null,
							production_item_id: null,
							purchase_detail_id: null,
							serial_number_record_id: null,
							shipping_item_id: null
						};
						item_info.records.push(dummy_stock_record);
					}
				}

				order_builder.addItemInfoWithPriceNumber(
					item_info,
					concepto.cantidad,
					concepto.valorUnitario,
					this.factura_metadata?.moneda || 'MXN',
					concepto.descripcion,
					'NO'
				);
			}

			order_builder.updateOrderTotal();

			const order_info = order_builder.order_info;
			const order_total = this.getTotalXml();

			let rest_user = this.rest.initRestSimple<User>('user');

			const client_balance = Number((this.selected_client as any).balance || 0);
			const debt = client_balance < 0 ? -client_balance : 0;
			const total_required_credit = debt + order_total;

			const current_credit_limit = Number(this.selected_client.credit_limit || 0);
			const target_credit_limit = Math.max(current_credit_limit, total_required_credit + 1000);

			const client_update$ = rest_user.update({ id: this.selected_client.id, credit_limit: target_credit_limit } as any);

			this.subs.sink = client_update$.pipe(
				mergeMap((updatedClient) => {
					this.selected_client = updatedClient;
					order_builder.user_client = updatedClient;
					order_info.order.client_user_id = updatedClient.id;

					return this.rest_order_info.create(order_info).pipe(
						mergeMap((response) => {
							return forkJoin({
								order_info: of(response),
								close: this.rest.update('closeOrder', { order_id: response.order.id })
							});
						})
					);
				})
			).subscribe({
				next: (result) => {
					this.is_saving = false;
					this.rest.showSuccess('Pedido creado y cerrado exitosamente con ID #' + result.order_info.order.id);
					this.router.navigate(['/dashboard']);
				},
				error: (error) => {
					this.is_saving = false;
					this.rest.showError(error);
				}
			});

		} catch (e: any) {
			this.is_saving = false;
			this.rest.showError(e.message || 'Error al construir el pedido');
		}
	}

	searchClientFromXml() {
		if (!this.factura_metadata || !this.factura_metadata.receptor) return;

		let rest_user = this.rest.initRestSimple<User>('user');
		this.subs.sink = rest_user.search({
			eq: { type: 'CLIENT', status: 'ACTIVE' },
			lk: { name: this.factura_metadata.receptor },
			limit: 1
		}).subscribe({
			next: (response) => {
				if (response.data && response.data.length > 0) {
					this.selected_client = response.data[0];
					this.rest.showSuccess('Cliente coincidente encontrado y seleccionado: ' + this.selected_client.name);
				} else {
					this.selected_client = null;
					this.rest.showWarning('No se encontró un cliente con el nombre: ' + this.factura_metadata!.receptor);
				}
			},
			error: (error) => {
				console.error('Error al buscar cliente', error);
			}
		});
	}

	createClientFromXml() {
		if (!this.factura_metadata || !this.factura_metadata.receptor) return;

		this.is_saving = true;

		let rest_user = this.rest.initRestSimple<User>('user');
		let rest_address = this.rest.initRestSimple<any>('address');

		let user_data: Partial<User> = {
			name: this.factura_metadata.receptor,
			type: 'CLIENT',
			status: 'ACTIVE',
			credit_limit: this.getTotalXml() + 1000
		};

		this.subs.sink = rest_user.create(user_data).pipe(
			mergeMap(newClient => {
				let address_data = {
					user_id: newClient.id,
					name: this.factura_metadata!.receptor,
					rfc: this.factura_metadata!.rfcReceptor,
					zipcode: this.factura_metadata!.domicilioReceptor,
					sat_regimen_fiscal: this.factura_metadata!.regimenFiscalReceptor,
					type: 'BILLING',
					status: 'ACTIVE'
				};
				return rest_address.create(address_data).pipe(
					mergeMap(() => {
						return rest_user.update({ id: newClient.id, credit_limit: this.getTotalXml() + 1000 } as any);
					})
				);
			})
		).subscribe({
			next: (newClient) => {
				this.is_saving = false;
				this.selected_client = newClient;
				this.rest.showSuccess('Cliente registrado y seleccionado exitosamente');
			},
			error: (error) => {
				this.is_saving = false;
				this.rest.showError(error);
			}
		});
	}

	reset() {
		this.xml_attachment_id = null;
		this.xml_attachment_info = null;
		this.factura_metadata = null;
		this.cfdi_conceptos = [];
		this.selected_client = null;
	}
}

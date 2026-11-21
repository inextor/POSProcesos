import { Component, Injector, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe, CurrencyPipe, DecimalPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, filter, map, mergeMap } from 'rxjs/operators';
import { AnswerInfo, AttachmentInfo, OrderInfo, OrderItemInfo, OrderItemResponseInfo, PaymentInfo, ReenviarFacturaRequest, ResponseInfo, ReturnsInfo, SerialInfo } from '../../modules/shared/Models';
import { Attachment, Bank_Movement, Batch_Record, Billing_Data, Currency_Rate, Form, Installment, Item, Item_Exception, Order, Order_Attachment, Order_Item, Order_Item_Batch, Order_Item_Response, Payment, Price_Type, Response, Returns, Sat_Factura, Serial, Store, User } from '../../modules/shared/RestModels';
import { Rest, RestResponse, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { Utils } from '../../modules/shared/Utils';
import { FacturaMetaData } from '../../modules/shared/FacturaMetaData';
import { buildCreditNoteAmountsPayload, CREDIT_NOTE_FORMA_PAGO_DEFAULT, CREDIT_NOTE_FORMA_PAGO_OPTIONS, CREDIT_NOTE_SERIE_DEFAULT, CreditNoteAmountRow, formatCfdiTaxGroupLabel, groupCfdiConceptsByTax, normalizeCreditNoteFormaPago, normalizeCreditNoteSerie, parseCfdiConceptos, selectOrderCreditNotes, validateCreditNoteAmounts } from '../../classes/CreditNoteAmounts';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';
import { ItemNamePipe } from '../../modules/shared/pipes/item-name.pipe';
import { ModalComponent } from '../../components/modal/modal.component';
import { LoadingComponent } from '../../components/loading/loading.component';
import { SatxmlviewerComponent } from '../../components/satxmlviewer/satxmlviewer.component';
import { AddClientPaymentComponent } from '../../components/add-client-payment/add-client-payment.component';
import { SaveOrderFacturaComponent } from '../../components/save-order-factura/save-order-factura.component';
import { AttachmentGalleryComponent, AttachmentGalleryItem } from '../../components/attachment-gallery/attachment-gallery.component';
import { AttachmentUploaderComponent } from '../../components/attachment-uploader/attachment-uploader.component';
import { ItemInfoButtonComponent } from '../../components/item-info-button/item-info-button.component';
import { FormResponseViewerComponent } from '../../components/form-response-viewer/form-response-viewer.component';

type CStatus = 'PENDIENTE' | 'PAGADO' | 'VENCIDO';
type Transaction_Type = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'PAYPAL' | 'CHECK' | 'TRANSFER';

interface CInstallment extends Installment
{
	due_status: CStatus;
}

interface CreditNoteGroupRow
{
	label: string;
	iva: string;
	isr: string | null;
	ieps: string | null;
	concepto_count: number;
	xml_total: number;
	amount: number;
	note: string | null;
}

interface CCreditNote extends Sat_Factura
{
	amount: number | null;
	pdf_url: string;
	xml_url: string;
}

interface CFormResponse
{
	form: Form;
	response: Response[];
}

interface COrder_Item_Response extends Order_Item_Response
{
	order_id?: number;
	form_id?: number;
	serial_number?: string;
	response?: number;
	serial?: number | null;
}

interface COrderItemResponse extends OrderItemResponseInfo
{
	order_item: Order_Item;
}

interface COIIResponses extends OrderItemInfo
{
	form: Form;
	responses: COrderItemResponse[];
}

interface IngredientBatchGroup
{
	item_exception: Item_Exception;
	stock_item: Item | null;
	batches: Order_Item_Batch[];
}

interface COrderItemInfo extends OrderItemInfo
{
	image_url: string;
	sold_batches: Order_Item_Batch[];
	ingredient_batch_groups: IngredientBatchGroup[];
}

interface CPaymentInfo extends PaymentInfo
{
	payment_pdf_url: string;
	payment_xml_url: string;
	payment_receipt_url: string;
}

@Component({
	selector: 'app-view-order',
	templateUrl: './view-order.component.html',
	styleUrl: './view-order.component.css',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		RouterLink,
		ModalComponent,
		LoadingComponent,
		SatxmlviewerComponent,
		AddClientPaymentComponent,
		SaveOrderFacturaComponent,
		AttachmentGalleryComponent,
		AttachmentUploaderComponent,
		ItemInfoButtonComponent,
		FormResponseViewerComponent,
		ShortDatePipe,
		TitleCasePipe,
		CurrencyPipe,
		DecimalPipe,
		DatePipe,
		UpperCasePipe,
		ItemNamePipe
	]
})
export class ViewOrderComponent extends BaseComponent implements OnInit
{
	rest_user: RestSimple<User> = this.rest.initRestSimple<User>('user');
	rest_store: RestSimple<Store> = this.rest.initRestSimple<Store>('store');
	rest_order_info: Rest<Order, OrderInfo> = this.rest.initRest<Order, OrderInfo>('order_info');
	rest_payment_info: Rest<Payment, PaymentInfo> = this.rest.initRest<Payment, PaymentInfo>('payment_info');
	rest_returns_info: Rest<Returns, ReturnsInfo> = this.rest.initRest<Returns, ReturnsInfo>('returns_info');
	rest_installment: RestSimple<Installment> = this.rest.initRestSimple<Installment>('installment');
	rest_response_info: Rest<Response, ResponseInfo> = this.rest.initRest<Response, ResponseInfo>('response_info');
	rest_form: RestSimple<Form> = this.rest.initRestSimple<Form>('form');
	rest_sat_factura: RestSimple<Sat_Factura> = this.rest.initRestSimple<Sat_Factura>('sat_factura');
	rest_reenvia_factura: RestSimple<ReenviarFacturaRequest> = this.rest.initRestSimple<ReenviarFacturaRequest>('reenviar_factura');
	rest_cancelar_factura: RestSimple<{ sat_factura_id: number }> = this.rest.initRestSimple<{ sat_factura_id: number }>('cancelar_factura');
	rest_serial_info: Rest<Serial, SerialInfo> = this.rest.initRest<Serial, SerialInfo>('serial_info');
	rest_billing_data: RestSimple<Billing_Data> = this.rest.initRestSimple<Billing_Data>('billing_data');
	rest_currency_rate: RestSimple<Currency_Rate> = this.rest.initRestSimple<Currency_Rate>('currency_rate');
	rest_batch_record: RestSimple<Batch_Record> = this.rest.initRestSimple<Batch_Record>('batch_record');
	rest_order_attachment: Rest<Order_Attachment, Order_Attachment> = this.rest.initRest<Order_Attachment, Order_Attachment>('order_attachment');
	rest_attachment: RestSimple<Attachment> = this.rest.initRestSimple<Attachment>('attachment');
	rest_order_item_response_info: Rest<COrder_Item_Response, COrderItemResponse> = this.rest.initRest<COrder_Item_Response, COrderItemResponse>('order_item_response_info');
	rest_order_item_response: Rest<COrder_Item_Response, Order_Item_Response> = this.rest.initRest<COrder_Item_Response, Order_Item_Response>('order_item_response');

	sat_forma_pago: string = '';
	order_info: OrderInfo = GetEmpty.order_info(this.rest);
	order_item_array: COrderItemInfo[] = [];
	show_agregar_marbetes: boolean = false;
	selected_order_item_info: OrderItemInfo | null = null;
	show_facturar: boolean = false;
	show_add_payment_to_order: boolean = false;
	billing_data_array: Billing_Data[] = [];
	payment_info_array: CPaymentInfo[] = [];
	active_payment_array: CPaymentInfo[] = [];
	deleted_payment_array: CPaymentInfo[] = [];
	currency_rate_array: Currency_Rate[] = [];
	returns_info_array: ReturnsInfo[] = [];
	client_order_info_array: OrderInfo[] = [];
	cancel_user: User | null = null;
	fecha_pago: string = '';
	cashier_user: User | null = null;
	sat_serie: string = 'A';
	has_forms: boolean = false;
	coii_response_array: COIIResponses[] = [];
	serial_number: string = '';
	pagination_start: number = 0;
	pagination_size: number = 10;
	paginated_installment_array: CInstallment[] = [];
	installment_total_pages: number = 0;
	installment_current_page: number = 1;

	reenviar_factura_name: string = '';
	reenviar_factura_email: string = '';
	show_reenviar_factura: boolean = false;

	cinstallment_array: CInstallment[] = [];
	cformresponse_array: CFormResponse[] = [];

	response_info_array: ResponseInfo[] = [];
	selected_response_id: number | null = null;
	selected_serial: Serial | null = null;

	attachment_map: Record<number, Attachment> = {};
	order_attachment_array: Order_Attachment[] = [];
	order_attachment_info_array: { order_attachment: Order_Attachment; attachment?: Attachment }[] = [];
	attachment_gallery_item_array: AttachmentGalleryItem[] = [];
	new_attachment_title: string = '';

	pago_factura_email: string = '';

	payment_type_dic: Record<string, string> =
	{
		'CASH': 'Efectivo',
		'CREDIT_CARD': 'Tarjeta Credito',
		'DEBIT_CARD': 'Tarjeta Debito',
		'PAYPAL': 'Paypal',
		'CHECK': 'Cheque',
		'DISCOUNT': 'Descuento',
		'RETURN_DISCOUNT': 'Descuento por devolución',
		'TRANSFER': 'Transferencia',
	};

	show_refacturar: boolean = false;
	store: Store = GetEmpty.store();
	cancelar_factura_enabled: boolean = false;
	show_change_transaction_type: boolean = false;
	selected_bank_movement: Bank_Movement | null = null;
	transaction_type: Transaction_Type = 'CASH';
	form_array: Form[] = [];
	selected_form: Form | null = null;
	show_change_serial: boolean = false;
	selected_order_item_response: Order_Item_Response | null = null;
	show_confirm_cancel: boolean = false;
	cancel_reason: string = '';

	show_agregar_nota_credito: boolean = false;
	credit_note_motivo: string = '01';
	credit_note_amount: number = 0;
	show_nota_credito_grupos: boolean = false;
	credit_note_forma_pago: string = CREDIT_NOTE_FORMA_PAGO_DEFAULT;
	credit_note_forma_pago_option_array = CREDIT_NOTE_FORMA_PAGO_OPTIONS;
	credit_note_serie: string = CREDIT_NOTE_SERIE_DEFAULT;
	credit_note_group_row_array: CreditNoteGroupRow[] = [];
	credit_note_groups_total: number = 0;
	credit_note_ungrouped_count: number = 0;
	credit_note_ungrouped_total: number = 0;
	credit_note_array: CCreditNote[] = [];
	credit_note_amount_map: Record<number, number> = {};
	credit_note_list_total: number = 0;

	show_edit_batches: boolean = false;
	edit_batch_item: OrderItemInfo | null = null;
	edit_batch_exception: Item_Exception | null = null;
	edit_batch_stock_item: Item | null = null;
	edit_batch_target_option: string = 'NONE';
	edit_batch_array: { batch: string; expiration_date: string; qty: number }[] = [];
	available_batch_array: { batch: string; expiration_date: string; qty: number }[] = [];
	paginated_available_batch_array: { batch: string; expiration_date: string; qty: number }[] = [];
	batch_page: number = 0;
	batch_page_size: number = 5;
	batch_total_pages: number = 0;
	batch_current_page: number = 1;
	required_batch_qty: number = 0;
	edit_batches_total: number = 0;

	selected_payment: CPaymentInfo | null = null;
	show_facturar_pago: boolean = false;
	show_facturar_pago_full: boolean = false;
	selected_response: Response | null = null;
	show_assign_response: boolean = false;

	client_image_url: string = '';
	cashier_image_url: string = '';
	order_factura_pdf_url: string = '';
	order_print_receipt_url: string = '';
	order_print_remission_url: string = '';
	order_print_funeraria_url: string = '';
	order_net_total: number = 0;
	pending_amount: number = 0;
	can_cancel_order: boolean = false;

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit(): void
	{
		this.subs.sink = this.getQueryParamObservable().pipe
		(
			mergeMap((params_pair) =>
			{
				this.has_forms = false;
				let query_param_map = params_pair[0];
				let param_map = params_pair[1];

				this.cancel_reason = '';
				this.show_agregar_nota_credito = false;
				this.show_nota_credito_grupos = false;
				this.credit_note_array = [];
				this.credit_note_amount_map = {};
				this.credit_note_list_total = 0;
				this.client_order_info_array = [];
				this.cinstallment_array = [];
				this.cformresponse_array = [];

				let id_param = param_map.get('id');
				this.setTitle('Orden #' + id_param);
				this.path = '/view-order/' + id_param;
				this.is_loading = true;

				let cdate = new Date();
				cdate.setSeconds(0);
				this.fecha_pago = Utils.getLocalMysqlStringFromDate(cdate).replace(' ', 'T');

				let facturar = query_param_map.has('facturar');
				let order_id = Number(id_param);

				if (!order_id || Number.isNaN(order_id))
				{
					this.order_info = GetEmpty.order_info(this.rest);
					this.showError('La orden no existe');
					return EMPTY;
				}

				return forkJoin
				({
					order_info: this.rest_order_info.get(order_id),
					billing_data: this.rest_billing_data.search({ limit: 9999, sort_order: ['name_ASC'] }),
					payment: this.rest_payment_info.search({
						search_extra: { order_id: order_id, hades: this.rest.has_hades ? 1 : null },
						csv: { status: ['ACTIVE', 'DELETED'] },
						limit: 9999
					}),
					price_type: this.rest.getPriceTypes(false),
					currency_rate: this.rest_currency_rate.search({ limit: 999999 }),
					store: this.rest.user?.store_id ? this.rest_store.get(this.rest.user.store_id) : of(GetEmpty.store()),
					returns: this.rest_returns_info.search({ search_extra: { order_id: order_id }, limit: 9999 }),
					credit_notes_by_order: this.rest_sat_factura.search({
						eq: { order_id: order_id, type: 'NOTA_CREDITO' },
						limit: 9999,
						sort_order: ['id_DESC']
					}),
					facturar: of(facturar)
				});
			}),
			mergeMap((responses) =>
			{
				if (responses.order_info.order.ares && !this.rest.has_hades)
				{
					this.order_info = GetEmpty.order_info(this.rest);
					return throwError(() => new Error('La orden no existe'));
				}

				this.store = responses.store;
				let installments_obs = (responses.order_info.order.installment_months ?? 0) > 0
					? this.rest_installment.search({ eq: { order_id: responses.order_info.order.id, status: 'ACTIVE' }, limit: 9999 })
					: of({ total: 0, data: [] as Installment[] });

				let form_ids: number[] = [];
				responses.order_info.items.forEach(item =>
				{
					if (item.item.form_id)
					{
						form_ids.push(item.item.form_id);
					}
				});

				let sat_facturas_ids = responses.payment.data
					.map(p => p.payment.sat_factura_id)
					.filter((id): id is number => id != null);

				let responses_obs = form_ids.length > 0 && responses.order_info.client
					? this.rest_response_info.search({ csv: { form_id: form_ids }, eq: { user_id: responses.order_info.client.id }, limit: 9999 })
					: of({ total: 0, data: [] as ResponseInfo[] });

				let order_item_response_obs = form_ids.length > 0
					? this.rest_order_item_response_info.search({ csv: { form_id: form_ids }, eq: { order_id: responses.order_info.order.id }, limit: 9999 })
					: of({ total: 0, data: [] as COrderItemResponse[] });

				let forms_obs = form_ids.length > 0
					? this.rest_form.search({ csv: { id: form_ids }, limit: 9999 })
					: of({ total: 0, data: [] as Form[] });

				let sat_factura_search_obj: SearchObject<Sat_Factura> = this.rest_sat_factura.getEmptySearch();
				sat_factura_search_obj.limit = 9999;
				sat_factura_search_obj.csv = { id: sat_facturas_ids };

				let obs_sat_facturas = sat_facturas_ids.length == 0
					? of({ total: 0, data: [] as Sat_Factura[] })
					: this.rest_sat_factura.search(sat_factura_search_obj);

				let parent_factura_ids = [responses.order_info?.sat_factura?.id, ...sat_facturas_ids]
					.filter((id): id is number => id != null);

				let obs_credit_notes_parent = parent_factura_ids.length == 0
					? of({ total: 0, data: [] as Sat_Factura[] })
					: this.rest_sat_factura.search({
						csv: { parent_sat_factura_id: parent_factura_ids },
						eq: { type: 'NOTA_CREDITO' },
						limit: 9999,
						sort_order: ['id_DESC']
					});

				let cancel_user_obs = responses.order_info.order.cancelled_by_user_id
					? this.rest_user.get(responses.order_info.order.cancelled_by_user_id).pipe(catchError(() => of(null)))
					: of(null);

				let cashier_user_obs = responses.returns.data.length > 0 && responses.returns.data[0].returns.cashier_user_id
					? this.rest_user.get(responses.returns.data[0].returns.cashier_user_id).pipe(catchError(() => of(null)))
					: of(null);

				let order_attachment_obs = this.rest.preferences.order_attachment_enabled
					? this.rest_order_attachment.search({ eq: { order_id: responses.order_info.order.id }, limit: 99999 })
					: of({ data: [] as Order_Attachment[], total: 0 });

				return forkJoin({
					order_info: of(responses.order_info),
					billing_data: of(responses.billing_data),
					payment: of(responses.payment),
					price_type: of(responses.price_type),
					currency_rate: of(responses.currency_rate),
					installments: installments_obs,
					response: responses_obs,
					sat_facturas: obs_sat_facturas,
					credit_notes_by_order: of(responses.credit_notes_by_order),
					credit_notes_by_parent: obs_credit_notes_parent,
					returns: of(responses.returns),
					facturar: of(responses.facturar),
					order_item_response: order_item_response_obs,
					order_attachment: order_attachment_obs,
					forms: forms_obs,
					cancel_user: cancel_user_obs,
					cashier_user: cashier_user_obs
				});
			}),
			mergeMap((s_resp) =>
			{
				let has_inline_attachments = !!(s_resp.order_info.attachments && s_resp.order_info.attachments.length > 0);
				let attachment_ids = !has_inline_attachments
					? s_resp.order_attachment.data.map(oa => oa.attachment_id).filter(Boolean)
					: [];

				let attachments_obs = attachment_ids.length > 0
					? this.rest_attachment.search({ csv: { id: attachment_ids }, limit: 99999 }).pipe(catchError(() => of({ total: 0, data: [] as Attachment[] })))
					: of({ total: 0, data: [] as Attachment[] });

				let parent_factura_ids = [
					s_resp.order_info?.sat_factura?.id,
					...s_resp.payment.data.map(p => p.payment.sat_factura_id)
				].filter((id): id is number => id != null);

				let raw_credit_notes = selectOrderCreditNotes(
					[...s_resp.credit_notes_by_order.data, ...s_resp.credit_notes_by_parent.data],
					s_resp.order_info.order.id,
					parent_factura_ids
				);

				let credit_note_xml_obs_map: Record<number, Observable<string>> = {};
				for (let nc of raw_credit_notes)
				{
					if (nc.xml_attachment_id)
					{
						credit_note_xml_obs_map[nc.id] = this.rest.getFileContentAsString(nc.xml_attachment_id).pipe(catchError(() => of('')));
					}
				}

				let credit_note_xmls_obs = Object.keys(credit_note_xml_obs_map).length > 0
					? forkJoin(credit_note_xml_obs_map)
					: of({} as Record<number, string>);

				return forkJoin({
					base: of(s_resp),
					attachments: attachments_obs,
					raw_credit_notes: of(raw_credit_notes),
					credit_note_xmls: credit_note_xmls_obs
				});
			})
		)
		.subscribe({
			next: ({ base: s_resp, attachments, raw_credit_notes, credit_note_xmls }) =>
			{
				if (s_resp.order_info.attachments && s_resp.order_info.attachments.length > 0)
				{
					this.order_attachment_array = s_resp.order_info.attachments.map(oai => oai.order_attachment);
					this.order_attachment_info_array = s_resp.order_info.attachments.map(oai =>
					{
						if (oai.attachment?.id)
						{
							this.attachment_map[oai.attachment.id] = oai.attachment;
						}
						return {
							order_attachment: oai.order_attachment,
							attachment: oai.attachment || undefined
						};
					});
				}
				else
				{
					this.order_attachment_array = s_resp.order_attachment.data;
					attachments.data.forEach(att =>
					{
						this.attachment_map[att.id] = att;
					});
					this.order_attachment_info_array = this.order_attachment_array.map(oa => ({
						order_attachment: oa,
						attachment: this.attachment_map[oa.attachment_id]
					}));
				}
				this.rebuildAttachmentGalleryItems();

				let price_type = s_resp.price_type.data.find(pt => pt.id == s_resp.order_info.order.price_type_id) || GetEmpty.price_type();
				this.response_info_array = s_resp.response.data;
				this.form_array = s_resp.forms.data;

				s_resp.order_info.price_type = price_type;
				this.order_info = s_resp.order_info;
				this.cancel_user = s_resp.cancel_user;
				this.cashier_user = s_resp.cashier_user;

				this.cancelar_factura_enabled = !!this.order_info?.sat_factura;
				this.billing_data_array = s_resp.billing_data.data;

				this.payment_info_array = s_resp.payment.data.map(payment =>
				{
					let sat_factura = s_resp.sat_facturas.data.find(sf => sf.payment_id == payment.payment.id) || null;
					return this.getCPaymentInfo({
						...payment,
						sat_factura
					});
				});

				this.active_payment_array = this.payment_info_array.filter(p => p.payment.status === 'ACTIVE');
				this.deleted_payment_array = this.payment_info_array.filter(p => p.payment.status === 'DELETED');

				this.credit_note_amount_map = {};
				for (let nc of raw_credit_notes)
				{
					let xml = credit_note_xmls[nc.id];
					if (xml)
					{
						let total = parseFloat(new FacturaMetaData(xml).total);
						if (!Number.isNaN(total))
						{
							this.credit_note_amount_map[nc.id] = total;
						}
					}
				}
				this.credit_note_array = raw_credit_notes.map(nc => ({
					...nc,
					amount: this.credit_note_amount_map[nc.id] ?? null,
					pdf_url: this.getCreditNotePdfUrl(nc.id),
					xml_url: nc.xml_attachment_id ? this.rest.getFilePath(nc.xml_attachment_id, true) : ''
				}));
				this.credit_note_list_total = this.credit_note_array.reduce((sum, nc) => sum + (nc.amount || 0), 0);

				this.reenviar_factura_email = this.order_info.order.sat_receptor_email || '';
				this.reenviar_factura_name = this.order_info?.client?.name || this.order_info.order.client_name || '';
				this.currency_rate_array = s_resp.currency_rate.data;
				this.pago_factura_email = this.order_info.order.sat_receptor_email || '';
				this.returns_info_array = s_resp.returns.data;

				if (this.order_info.order.client_user_id)
				{
					this.client_order_info_array = [this.order_info];
				}

				if (s_resp.installments.total > 0)
				{
					this.cinstallment_array = s_resp.installments.data.map((installment: Installment) =>
					{
						let due_status: CStatus = 'PENDIENTE';

						if (!installment.paid_timestamp && new Date(installment.due_date) < new Date())
						{
							due_status = 'VENCIDO';
						}

						if (installment.paid_timestamp)
						{
							due_status = 'PAGADO';
						}

						return { ...installment, due_status };
					});
				}
				this.pagination_start = 0;
				this.updateInstallmentPagination();

				if (s_resp.response.total > 0)
				{
					s_resp.response.data.forEach((response_info: ResponseInfo) =>
					{
						let form_response = this.cformresponse_array.find(fr => fr.form.id == response_info.form.id);

						if (!form_response)
						{
							form_response = { form: response_info.form, response: [] };
							this.cformresponse_array.push(form_response);
						}

						form_response.response.push(response_info.response);
					});
				}

				this.has_forms = this.order_info.items.some((oii: OrderItemInfo) => oii.item.form_id != null);

				this.coii_response_array = this.order_info.items
					.filter(oii => oii.item.form_id)
					.map((oii: OrderItemInfo) =>
					{
						let form = this.form_array.find(f => f.id == oii.item.form_id) as Form;
						let responses: COrderItemResponse[] = s_resp.order_item_response.data
							.filter(oir => oir.order_item_response.order_item_id == oii.order_item.id)
							.map(oir =>
							{
								let aggregate_response = (oii.responses || []).find(r => r.order_item_response.id == oir.order_item_response.id);
								return {
									...oir,
									form: aggregate_response?.form || null,
									serial: oir.serial || aggregate_response?.serial || null,
									answers: aggregate_response?.answers || []
								};
							});

						return {
							...oii,
							form,
							responses
						};
					});

				this.refreshComputedOrderDisplay();
				this.is_loading = false;

				if (s_resp.facturar)
				{
					this.showFacturar(null);
				}
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	refreshComputedOrderDisplay(): void
	{
		this.client_image_url = this.rest.getImagePath(this.order_info?.client?.image_id, this.rest.preferences?.default_user_logo_image_id);
		this.cashier_image_url = this.rest.getImagePath(this.order_info?.cashier?.image_id, this.rest.preferences?.default_user_logo_image_id);
		this.order_factura_pdf_url = this.getPdfUrl(this.order_info.order.id);
		let receipt_type = this.store.print_receipt || this.rest.preferences.default_print_receipt || 1;
		this.order_print_receipt_url = this.order_info.order.id
			? `${this.rest.getExternalAppUrl()}/#/print-receipt/${receipt_type}/${this.order_info.order.id}`
			: `${this.rest.getExternalAppUrl()}/#/print-receipt-offline/${receipt_type}/${this.order_info.order.sync_id}`;
		this.order_print_remission_url = `${this.rest.getExternalAppUrl()}/#/print-remission/${this.order_info.order.id}`;
		this.order_print_funeraria_url = `${this.rest.getExternalAppUrl()}/#/print-funeraria/${this.order_info.order.id}`;

		this.order_net_total = this.computeOrderNetTotal();
		this.pending_amount = this.computePendingAmount();
		this.can_cancel_order = this.computeCanCancelOrder();

		this.order_item_array = (this.order_info.items || []).map(io => ({
			...io,
			image_url: this.rest.getImagePath(io.item.image_id, io?.category?.image_id, this.rest.preferences.default_product_image_id),
			sold_batches: this.computeSoldItemBatches(io),
			ingredient_batch_groups: this.computeIngredientBatchGroups(io)
		}));
	}

	getCPaymentInfo(payment: PaymentInfo): CPaymentInfo
	{
		return {
			...payment,
			payment_pdf_url: this.getPaymentPdfUrl(payment.payment.id),
			payment_xml_url: payment.sat_factura?.xml_attachment_id ? this.rest.getFilePath(payment.sat_factura.xml_attachment_id, true) : '',
			payment_receipt_url: `${this.rest.getExternalAppUrl()}/#/print-payment-receipt/${payment.payment.id}/${this.order_info.order.id}`
		};
	}

	rebuildAttachmentGalleryItems(): void
	{
		this.attachment_gallery_item_array = this.order_attachment_info_array.map(oai => ({
			attachment: oai.attachment || null,
			title: oai.order_attachment.title || null,
		}));
	}

	generateCreditNote()
	{
		if (this.is_loading)
			return;

		if (!this.order_info || !this.order_info.sat_factura || !this.order_info.sat_factura.uuid)
		{
			this.showError('No hay factura valida para esta orden');
			return;
		}

		this.is_loading = true;
		this.subs.sink = this.rest.createCreditNote(this.order_info.sat_factura.uuid, this.credit_note_motivo, this.credit_note_amount, this.order_info.sat_factura.id)
		.subscribe({
			next: (_response) =>
			{
				this.is_loading = false;
				this.showSuccess('Nota de crédito generada exitosamente');
				this.show_agregar_nota_credito = false;
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	acumulaVentaComex(evt: Event)
	{
		evt.preventDefault();
		evt.stopPropagation();

		this.is_loading = true;
		this.subs.sink = this.rest.comex('acumula_venta', { order_id: this.order_info.order.id })
		.subscribe({
			next: (_response) =>
			{
				this.is_loading = false;
				this.showSuccess('Se acumulo correctamente');
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	applyAres(evt: Event)
	{
		evt.preventDefault();
		evt.stopPropagation();

		this.is_loading = true;
		this.subs.sink = this.rest.updatePath('apply_ares', { order_id: this.order_info.order.id })
		.subscribe({
			next: (_response) =>
			{
				this.is_loading = false;
				this.showSuccess('Se aplicó Ares correctamente');
				window.location.reload();
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	duplicateOrder(evt: Event)
	{
		evt.preventDefault();
		evt.stopPropagation();

		this.is_loading = true;
		this.subs.sink = this.rest.updatePath('duplicate_order', { order_id: this.order_info.order.id })
		.subscribe({
			next: (response) =>
			{
				this.is_loading = false;
				let new_order_id = response?.order_id ?? response?.id;

				if (!new_order_id)
				{
					this.showError('No se pudo obtener la orden duplicada');
					return;
				}

				this.showSuccess('Se duplico correctamente');
				this.router.navigate(['/view-order', new_order_id]);
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	showFacturar(_evt: Event | null)
	{
		this.sat_serie = this.order_info.store.default_sat_serie;
		this.pago_factura_email = this.order_info.order.sat_receptor_email || '';

		if (this.order_info.order.facturacion_mode == 'PER_PAYMENT')
		{
			this.is_loading = true;

			this.subs.sink = this.confirmation
			.showConfirmAlert
			(
				this.order_info.order.sat_xml_attachment_id,
				'Cambiar preferencia de facturación',
				'La orden está configurada para facturación por pago (PER_PAYMENT). ¿Deseas cambiarla a facturación completa (FULL) para facturar toda la orden?'
			)
			.pipe
			(
				filter(result => result.accepted),
				mergeMap(() =>
				{
					return this.rest.setFacturacionMode(this.order_info.order.id, 'FULL');
				}),
				mergeMap(() =>
				{
					this.order_info.order.facturacion_mode = 'FULL';
					this.is_loading = false;
					this.show_facturar = true;
					return EMPTY;
				})
			)
			.subscribe
			({
				error: (error) =>
				{
					this.is_loading = false;
					this.showError(error);
				}
			});
			return;
		}

		this.show_facturar = true;
	}

	onTerminoFacturar(with_success: boolean)
	{
		if (with_success)
		{
			this.subs.sink = this.rest_order_info.get(this.order_info.order.id)
			.subscribe((order_info) =>
			{
				this.order_info = order_info;
				this.refreshComputedOrderDisplay();
			});
		}
		this.show_facturar = false;
	}

	onTerminoFacturarPago(with_success: boolean)
	{
		this.show_facturar_pago_full = false;
		this.selected_payment = null;

		if (with_success)
		{
			this.subs.sink = this.rest_order_info.get(this.order_info.order.id)
			.subscribe((order_info) =>
			{
				this.order_info = order_info;
				window.location.reload();
			});
		}
	}

	replayFactura()
	{
		if (!this.order_info.sat_factura)
			return;

		this.is_loading = true;

		this.subs.sink = this.rest.replayFactura(this.order_info.sat_factura.id)
		.subscribe({
			next: (sat_factura) =>
			{
				this.is_loading = false;
				this.order_info.sat_factura = sat_factura;
			},
			error: (error) => this.showError(error)
		});
	}

	showPaymentForm()
	{
		this.show_add_payment_to_order = true;
	}

	onPayment(payment_info: PaymentInfo | null)
	{
		this.show_add_payment_to_order = false;

		if (payment_info != null)
		{
			this.router.navigateByUrl('/', { skipLocationChange: true })
			.then(() =>
			{
				this.router.navigate([this.path], { queryParams: {} });
			});
		}
	}

	computeCanCancelOrder(): boolean
	{
		if (!this.order_info || !this.order_info.order)
			return false;

		let status = this.order_info.order.status;

		if (status == 'PENDING')
			return true;

		return status == 'CLOSED' && !!this.rest.user_permission?.cancel_closed_orders;
	}

	confirmCancelOrder(_evt: Event)
	{
		this.show_confirm_cancel = false;

		if (!this.computeCanCancelOrder())
		{
			this.showError('No tiene permiso para cancelar esta orden');
			return;
		}
		this.subs.sink = this.rest.cancelOrder(this.order_info.order.id, this.cancel_reason)
		.subscribe
		({
			error: (error) => this.showError(error),
			next: (_response) =>
			{
				this.order_info.order.status = 'CANCELLED';
				this.order_info.order.cancellation_reason = this.cancel_reason;
				this.refreshComputedOrderDisplay();
				this.showSuccess('La orden se canceló con éxito');
			}
		});
	}

	getPdfUrl(order_id: number): string
	{
		return this.rest.getApiUrl() + '/getFacturaPdf.php?order_id=' + order_id;
	}

	getPaymentPdfUrl(payment_id: number): string
	{
		return this.rest.getApiUrl() + '/getFacturaPdf.php?payment_id=' + payment_id;
	}

	getCreditNotePdfUrl(sat_factura_id: number): string
	{
		return this.rest.getApiUrl() + '/getFacturaPdf.php?sat_factura_id=' + sat_factura_id;
	}

	resendFactura(evt: Event)
	{
		this.is_loading = true;
		let form_target = evt.target as HTMLFormElement | null;

		this.subs.sink = this.rest_reenvia_factura.create
		({
			order_id: this.order_info.order.id,
			email: this.reenviar_factura_email,
			name: this.reenviar_factura_name
		})
		.subscribe
		({
			error: (error) => this.showError(error),
			next: () =>
			{
				this.reenviar_factura_email = this.order_info.order.sat_receptor_email || '';
				this.reenviar_factura_name = this.order_info?.client?.name || this.order_info.order.client_name || '';
				this.is_loading = false;
				form_target?.reset();
				this.showSuccess('Se reenvío la factura correctamente');
				window.location.reload();
			}
		});
	}

	showFacturarPago(p: CPaymentInfo)
	{
		this.selected_payment = p;

		if (p?.payment?.created)
		{
			let fecha = new Date(p.payment.created);
			fecha.setSeconds(0);
			this.fecha_pago = Utils.getLocalMysqlStringFromDate(fecha).replace(' ', 'T');
		}

		this.sat_serie = this.order_info.store.default_sat_serie;

		if (this.order_info.sat_factura || this.order_info.order.sat_factura_id)
		{
			this.show_facturar_pago = true;
			return;
		}

		if (this.order_info.order.facturacion_mode != 'PER_PAYMENT')
		{
			if (!this.rest.preferences.cfdi_per_payment_enabled)
			{
				this.showError('La facturación por pago (PER_PAYMENT) no está habilitada en las preferencias');
				return;
			}

			if (!this.rest.user_permission.cfdi_per_payment_enabled)
			{
				this.showError('No tienes permiso para cambiar la orden a facturación por pago (PER_PAYMENT)');
				return;
			}

			this.is_loading = true;

			this.subs.sink = this.confirmation
			.showConfirmAlert
			(
				this.order_info.order.sat_xml_attachment_id,
				'Cambiar preferencia a PER_PAYMENT',
				'La orden no está configurada para facturación por abono (PER_PAYMENT). Para facturar este pago por separado se cambiará la preferencia a PER_PAYMENT. Este cambio NO tiene reversa una vez que se facture el primer pago. ¿Continuar?'
			)
			.pipe
			(
				filter(result => result.accepted),
				mergeMap(() =>
				{
					return this.rest.setFacturacionMode(this.order_info.order.id, 'PER_PAYMENT');
				}),
				mergeMap(() =>
				{
					this.order_info.order.facturacion_mode = 'PER_PAYMENT';
					this.is_loading = false;
					this.show_facturar_pago_full = true;
					return EMPTY;
				})
			)
			.subscribe
			({
				error: (error) =>
				{
					this.is_loading = false;
					this.showError(error);
				}
			});
			return;
		}

		this.show_facturar_pago_full = true;
	}

	facturarElPago(_evt: Event)
	{
		if (!this.selected_payment)
			return;

		let d = Utils.getLocalDateFromMysqlString(this.fecha_pago) || new Date();
		let fecha_de_pago = Utils.getMysqlStringFromLocalDate(d).replace(' ', 'T');

		this.subs.sink = this.rest
		.updatePath('facturar_pago',
		{
			payment_id: this.selected_payment.payment.id,
			email: this.pago_factura_email,
			fecha_de_pago,
			sat_serie: this.sat_serie,
			transaccion: 'p-' + d.getTime()
		})
		.subscribe
		({
			error: (error) => this.showError(error),
			next: (_result) =>
			{
				this.is_loading = false;
				this.show_facturar_pago = false;
				this.showSuccess('El pago se facturo correctamente');
			}
		});
	}

	resetFacturacion(evt: Event)
	{
		evt.preventDefault();

		let payload = {
			order_id: this.order_info.order.id,
			sat_forma_pago: this.sat_forma_pago
		};

		this.subs.sink = this.rest
		.update('reiniciarFacturacion', payload)
		.subscribe({
			next: (_response) => this.showSuccess('Se reinicio correctamente'),
			error: (error) => this.showError(error)
		});
	}

	cancelarPago(payment_id: number)
	{
		this.subs.sink = this.confirmation
		.showConfirmAlert
		(
			this.order_info.order.sat_xml_attachment_id,
			'Cancelar Pago',
			'¿Estas seguro de cancelar este pago?'
		)
		.pipe
		(
			filter(result => result.accepted),
			mergeMap(() =>
			{
				this.is_loading = true;
				return this.rest.cancelPayment(payment_id);
			}),
		)
		.subscribe
		({
			next: (_response) => this.showSuccess('El pago se cancelo correctamente'),
			error: (error) => this.showError(error)
		});
	}

	cancelarFactura()
	{
		if (!this.order_info.sat_factura)
			return;

		let sat_factura_id = this.order_info.sat_factura.id;
		this.subs.sink = this.confirmation
		.showConfirmAlert
		(
			this.order_info.order.sat_xml_attachment_id,
			'Cancelar Factura',
			'¿Estas seguro de cancelar esta factura?'
		)
		.pipe
		(
			filter(result => result.accepted),
			mergeMap(() =>
			{
				this.is_loading = true;
				return this.rest_cancelar_factura.create({ sat_factura_id });
			}),
		)
		.subscribe
		({
			next: (_response) => this.showSuccess('La factura se cancelo correctamente'),
			error: (error) => this.showError(error)
		});
	}

	cancelarFacturaDelPago(sat_factura_id: number)
	{
		this.subs.sink = this.confirmation
		.showConfirmAlert
		(
			this.order_info.order.sat_xml_attachment_id,
			'Cancelar Factura',
			'¿Estas seguro de cancelar esta factura?'
		)
		.pipe
		(
			filter(result => result.accepted),
			mergeMap(() =>
			{
				this.is_loading = true;
				return this.rest_cancelar_factura.create({ sat_factura_id });
			}),
		)
		.subscribe
		({
			next: (_response) => this.showSuccess('La cancelacion del pago ha sido solicitado'),
			error: (error) => this.showError(error)
		});
	}

	showChangeTransactionType(bank_movement: Bank_Movement)
	{
		this.selected_bank_movement = bank_movement;
		this.transaction_type = bank_movement.transaction_type as Transaction_Type;
		this.show_change_transaction_type = true;
	}

	changeTransactionType(evt: Event)
	{
		evt.preventDefault();
		evt.stopPropagation();

		if (!this.selected_bank_movement)
			return;

		this.is_loading = true;
		let bank_movement_id = this.selected_bank_movement.id;
		let transaction_type = this.transaction_type;

		this.subs.sink = this.rest.updatePath('transaction_type', { bank_movement_id, transaction_type })
		.subscribe
		({
			next: (_response) =>
			{
				this.showSuccess('Se cambio el tipo de pago correctamente');
				window.location.reload();
			},
			error: (error) => this.showError(error)
		});
	}

	cancelarComex(evt: Event)
	{
		evt.preventDefault();
		evt.stopPropagation();

		this.subs.sink = this.confirmation.showConfirmAlert(
			this.order_info,
			'Cancelar Venta',
			'¿Estas seguro de cancelar la orden "#' + this.order_info.order.id + '"?'
		)
		.pipe
		(
			filter(x => x.accepted),
			mergeMap((response) =>
			{
				this.is_loading = true;
				return this.rest.comex('cancelar_venta', { order_id: response.obj.order.id });
			})
		)
		.subscribe({
			next: (_response) =>
			{
				this.is_loading = false;
				this.order_info.order.external_id = '';
				this.showSuccess('Se cancelo correctamente');
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	confirmDeliverOrder(evt: Event | null = null)
	{
		if (evt)
		{
			evt.preventDefault();
			evt.stopPropagation();
		}

		this.subs.sink = this.confirmation.showConfirmAlert(
			this.order_info,
			'Entregar Orden',
			'¿Marcar toda la orden #' + this.order_info.order.id + ' como entregada? Se descontará el inventario pendiente de sus artículos.'
		)
		.pipe
		(
			filter(response => response.accepted),
			mergeMap(() =>
			{
				this.is_loading = true;
				return this.rest.updateOrderDeliveryStatus(this.order_info.order.id, 'DELIVERED');
			}),
			mergeMap(() => this.rest_order_info.get(this.order_info.order.id))
		)
		.subscribe
		({
			next: (order_info) =>
			{
				this.is_loading = false;
				this.order_info = order_info;
				this.refreshComputedOrderDisplay();
				this.rest.sendNotification('order', this.order_info.order.id, this.order_info.order.store_id);
				this.showSuccess('La orden se marcó como entregada');
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	confirmDeliverOrderItem(oii: OrderItemInfo, evt: Event | null = null)
	{
		if (evt)
		{
			evt.preventDefault();
			evt.stopPropagation();
		}

		this.subs.sink = this.confirmation.showConfirmAlert(
			this.order_info,
			'Entregar Artículo',
			'¿Marcar "' + oii.item.name + '" (cant. ' + oii.order_item.qty + ') como entregado? Se descontará su inventario pendiente.'
		)
		.pipe
		(
			filter(response => response.accepted),
			mergeMap(() =>
			{
				this.is_loading = true;
				return this.rest.markOrderItemsAsDelivered([oii.order_item.id]);
			}),
			mergeMap(() => this.rest_order_info.get(this.order_info.order.id))
		)
		.subscribe
		({
			next: (order_info) =>
			{
				this.is_loading = false;
				this.order_info = order_info;
				this.refreshComputedOrderDisplay();
				this.rest.sendNotification('order', this.order_info.order.id, this.order_info.order.store_id);
				this.showSuccess('El artículo se marcó como entregado');
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	showAgregarResponse(coii: COIIResponses)
	{
		if (this.order_info.order.client_user_id == null)
		{
			this.showError('No se puede agregar respuesta a una orden sin cliente');
			return;
		}

		this.selected_form = coii.form;
		this.selected_order_item_info = coii;
		this.show_assign_response = true;

		let search_obj: SearchObject<Response> = this.getEmptySearch();
		search_obj.limit = 9999;
		search_obj.eq.user_id = this.order_info.order.client_user_id;
		search_obj.eq.form_id = coii.form.id;

		this.subs.sink = this.rest_response_info
		.search(search_obj)
		.subscribe
		({
			error: (error) => this.showError(error),
			next: (responses) =>
			{
				this.response_info_array = responses.data;
			}
		});
	}

	onSelectedResponse(response_id: number | '')
	{
		if (response_id == '')
		{
			this.selected_response = null;
			this.selected_response_id = null;
			return;
		}

		this.selected_response = this.response_info_array.find(r => r.response.id == response_id)?.response || null;
		this.selected_response_id = this.selected_response?.id || null;
	}

	submitOrderItemResponse(evt: Event)
	{
		evt.preventDefault();
		evt.stopPropagation();

		if (this.selected_order_item_info == null || this.selected_response == null)
		{
			this.showError('No hay respuesta seleccionada');
			return;
		}

		this.subs.sink = this.rest_order_item_response.create
		({
			order_item_id: this.selected_order_item_info.order_item.id,
			response_id: this.selected_response.id,
			serial_number: this.serial_number
		})
		.subscribe
		({
			error: (error) => this.showError(error),
			next: (_response) =>
			{
				this.showSuccess('Se agrego la respuesta correctamente');
				this.selected_order_item_info = null;
				this.selected_response = null;
				this.show_assign_response = false;

				window.location.reload();
			}
		});
	}

	showChangeSerial(order_item_response_info: COrderItemResponse)
	{
		this.selected_order_item_response = order_item_response_info.order_item_response;
		this.is_loading = true;

		let obs: Observable<SerialInfo | null> = order_item_response_info.order_item_response.serial_id
			? this.rest_serial_info.get(order_item_response_info.order_item_response.serial_id)
			: of(null);

		this.subs.sink = obs.subscribe
		({
			error: (_error: any) =>
			{
				this.is_loading = false;
				this.showError('No se pudo encontral la informacion del numero de serie actual');
			},
			next: (serial_info: SerialInfo | null) =>
			{
				this.is_loading = false;
				this.selected_serial = serial_info ? serial_info.serial : null;
				this.serial_number = serial_info ? serial_info.serial.serial_number : '';
				this.show_change_serial = true;
			}
		});
	}

	submitSerial(_evt: Event)
	{
		if (!this.selected_order_item_response)
			return;

		let current_oir = this.selected_order_item_response;
		this.subs.sink = this.rest_serial_info.search({ eq: { serial_number: this.serial_number }, limit: 1 }).pipe
		(
			mergeMap((response: RestResponse<SerialInfo>) =>
			{
				if (response.total)
				{
					let serial_id = response.data[0].serial.id;
					let updated: Order_Item_Response = { ...current_oir, serial_id };
					return of(updated);
				}

				return throwError(() => new Error('No se encontro el numero de serie'));
			}),
			mergeMap((order_item_response) =>
			{
				return this.rest_order_item_response.update(order_item_response);
			})
		)
		.subscribe
		({
			error: (error) =>
			{
				this.showError(error);
				this.is_loading = false;
			},
			next: (_response) =>
			{
				this.showSuccess('Se cambio el numero de serie correctamente');
				window.location.reload();
			}
		});
	}

	updateInstallmentPagination(): void
	{
		this.paginated_installment_array = this.cinstallment_array.slice(this.pagination_start, this.pagination_start + this.pagination_size);
		this.installment_total_pages = Math.ceil(this.cinstallment_array.length / this.pagination_size);
		this.installment_current_page = Math.floor(this.pagination_start / this.pagination_size) + 1;
	}

	nextPage()
	{
		if (this.pagination_start + this.pagination_size < this.cinstallment_array.length)
		{
			this.pagination_start += this.pagination_size;
			this.updateInstallmentPagination();
		}
	}

	previousPage()
	{
		if (this.pagination_start >= this.pagination_size)
		{
			this.pagination_start -= this.pagination_size;
			this.updateInstallmentPagination();
		}
	}

	goToFirstPage()
	{
		this.pagination_start = 0;
		this.updateInstallmentPagination();
	}

	goToLastPage()
	{
		const last_page_start = Math.floor((this.cinstallment_array.length - 1) / this.pagination_size) * this.pagination_size;
		this.pagination_start = last_page_start;
		this.updateInstallmentPagination();
	}

	showAgregarNotaCredito()
	{
		this.credit_note_amount = this.order_info.order.total;
		this.show_agregar_nota_credito = true;
	}

	showNotaCreditoPorImpuestos()
	{
		if (!this.order_info || !this.order_info.sat_factura || !this.order_info.sat_factura.uuid)
		{
			this.showError('No hay factura valida para esta orden');
			return;
		}

		let xml_attachment_id = this.order_info.sat_factura.xml_attachment_id;

		if (!xml_attachment_id)
		{
			this.showError('La factura no tiene XML disponible');
			return;
		}

		if (this.computePendingAmount() <= 0)
		{
			this.showError('La orden no tiene saldo pendiente para acreditar');
			return;
		}

		this.credit_note_group_row_array = [];
		this.credit_note_groups_total = 0;
		this.credit_note_ungrouped_count = 0;
		this.credit_note_ungrouped_total = 0;
		this.credit_note_forma_pago = CREDIT_NOTE_FORMA_PAGO_DEFAULT;
		this.credit_note_serie = this.order_info.store.default_sat_serie || CREDIT_NOTE_SERIE_DEFAULT;
		this.show_nota_credito_grupos = true;
		this.is_loading = true;

		this.subs.sink = this.rest.getFileContentAsString(xml_attachment_id)
		.subscribe({
			next: (xml) =>
			{
				try
				{
					let grouped = groupCfdiConceptsByTax(parseCfdiConceptos(xml));

					if (grouped.groups.length == 0)
					{
						this.is_loading = false;
						this.show_nota_credito_grupos = false;
						this.showError('El XML no tiene conceptos con impuestos acreditables');
						return;
					}

					this.credit_note_group_row_array = grouped.groups.map((group) => ({
						label: formatCfdiTaxGroupLabel(group),
						iva: group.iva,
						isr: group.isr,
						ieps: group.ieps,
						concepto_count: group.concepto_count,
						xml_total: group.total,
						amount: group.total,
						note: group.has_ieps_cuota ? 'Incluye IEPS por cuota, que no se expresa como tasa' : null
					}));

					let remaining = this.computePendingAmount();

					for (let row of this.credit_note_group_row_array)
					{
						row.amount = Math.round(Math.max(0, Math.min(row.xml_total, remaining)) * 100) / 100;
						remaining = Math.round((remaining - row.amount) * 100) / 100;
					}

					this.onCreditNoteGroupAmountChange();
					this.credit_note_ungrouped_count = grouped.ungrouped_count;
					this.credit_note_ungrouped_total = grouped.ungrouped_total;
					this.is_loading = false;
				}
				catch (e)
				{
					this.is_loading = false;
					this.show_nota_credito_grupos = false;
					this.showError(e);
				}
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.show_nota_credito_grupos = false;
				this.showError(error);
			}
		});
	}

	onCreditNoteGroupAmountChange(): void
	{
		this.credit_note_groups_total = this.credit_note_group_row_array
			.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
	}

	computeReturnsTotal(): number
	{
		if (!this.returns_info_array?.length)
			return 0;

		let total = this.returns_info_array.reduce((sum, r) => sum + (Number(r?.returns?.total) || 0), 0);
		return Math.round(total * 100) / 100;
	}

	computeOrderNetTotal(): number
	{
		if (!this.order_info?.order)
			return 0;

		let total = Number(this.order_info.order.total) || 0;
		let discount = Number(this.order_info.order.discount) || 0;
		return Math.round((total - discount - this.computeReturnsTotal()) * 100) / 100;
	}

	computePendingAmount(): number
	{
		if (!this.order_info?.order)
			return 0;

		if (this.order_info.order.paid_status == 'PAID')
			return 0;

		let amount_paid = Number(this.order_info.order.amount_paid) || 0;
		return Math.round((this.computeOrderNetTotal() - amount_paid) * 100) / 100;
	}

	generateCreditNoteByGroups()
	{
		if (this.is_loading)
			return;

		if (!this.order_info || !this.order_info.sat_factura || !this.order_info.sat_factura.uuid)
		{
			this.showError('No hay factura valida para esta orden');
			return;
		}

		let included = this.credit_note_group_row_array.filter(row => (Number(row.amount) || 0) > 0);

		for (let i = 0; i < included.length; i++)
		{
			if (included[i].amount - included[i].xml_total > 0.005)
			{
				this.showError('monto #' + (i + 1) + ': no puede ser mayor al total facturado del grupo ($' + included[i].xml_total.toFixed(2) + ')');
				return;
			}
		}

		let pending = this.computePendingAmount();
		this.onCreditNoteGroupAmountChange();

		if (this.credit_note_groups_total - pending > 0.005)
		{
			this.showError('El total a acreditar no puede ser mayor al saldo pendiente ($' + pending.toFixed(2) + ')');
			return;
		}

		let rows: CreditNoteAmountRow[] = included.map((row, i) => ({
			index: i + 1,
			amount: row.amount,
			iva: row.iva,
			isr: row.isr,
			ieps: row.ieps
		}));

		let errors = validateCreditNoteAmounts(rows);

		if (errors.length > 0)
		{
			this.showError(errors.join('. '));
			return;
		}

		this.is_loading = true;
		this.subs.sink = this.rest.createCreditNoteByItems
		(
			this.order_info.sat_factura.id,
			this.order_info.order.id,
			'01',
			buildCreditNoteAmountsPayload(rows),
			normalizeCreditNoteFormaPago(this.credit_note_forma_pago),
			normalizeCreditNoteSerie(this.credit_note_serie)
		)
		.subscribe({
			next: (_response) =>
			{
				this.is_loading = false;
				this.showSuccess('Nota de crédito generada exitosamente');
				this.show_nota_credito_grupos = false;
				this.router.navigateByUrl('/', { skipLocationChange: true })
				.then(() =>
				{
					this.router.navigate([this.path], { queryParams: {} });
				});
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	onAttachmentUploaded(attachment_info: AttachmentInfo)
	{
		if (!attachment_info?.attachment?.id)
		{
			return;
		}

		this.is_loading = true;
		this.subs.sink = this.rest_order_attachment.create
		({
			order_id: this.order_info.order.id,
			attachment_id: attachment_info.attachment.id,
			title: this.new_attachment_title || null
		})
		.subscribe
		({
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			},
			next: (order_attachment) =>
			{
				this.is_loading = false;
				this.order_attachment_array.push(order_attachment);
				this.attachment_map[attachment_info.attachment.id] = attachment_info.attachment;
				this.order_attachment_info_array.push({
					order_attachment: order_attachment,
					attachment: attachment_info.attachment
				});
				this.rebuildAttachmentGalleryItems();
				this.new_attachment_title = '';
				this.showSuccess('Archivo adjuntado correctamente');
			}
		});
	}

	computeSoldItemBatches(item: OrderItemInfo): Order_Item_Batch[]
	{
		return (item?.batches || []).filter(b => !b.item_exception_id);
	}

	getExceptionStockItem(item: OrderItemInfo, stock_item_id: number | null): Item | null
	{
		if (!stock_item_id)
		{
			return null;
		}
		return item?.exception_stock_items?.find(si => si.id == stock_item_id) || null;
	}

	computeIngredientBatchGroups(item: OrderItemInfo): IngredientBatchGroup[]
	{
		if (!item)
		{
			return [];
		}
		const groups: IngredientBatchGroup[] = [];
		const service_type = this.order_info?.order?.service_type;

		for (const ie of (item.exceptions || []))
		{
			if (!ie.stock_item_id)
			{
				continue;
			}
			const batches = (item.batches || []).filter(b => b.item_exception_id == ie.id);
			const is_excluded = item.order_item_exceptions?.some(oie => oie.item_exception_id == ie.id);
			const stock_item = this.getExceptionStockItem(item, ie.stock_item_id);
			const is_batch_tracked = !!(stock_item && stock_item.batch_option && stock_item.batch_option !== 'NONE');
			const is_sale_timing = !ie.removal_timing || ie.removal_timing === 'SALE';
			const matches_order_type = !ie.order_type || ie.order_type === 'ALL' || !service_type || ie.order_type === service_type;

			if (batches.length > 0 || (!is_excluded && is_sale_timing && matches_order_type && is_batch_tracked))
			{
				groups.push({
					item_exception: ie,
					stock_item: stock_item,
					batches: batches
				});
			}
		}

		return groups;
	}

	updateBatchModalComputed(): void
	{
		if (this.edit_batch_exception && this.edit_batch_stock_item)
		{
			this.edit_batch_target_option = this.edit_batch_stock_item.batch_option || 'BATCH_AND_EXPIRATION';
		}
		else
		{
			this.edit_batch_target_option = this.edit_batch_item?.item?.batch_option || 'NONE';
		}

		const base_qty = this.edit_batch_item?.order_item?.qty || 0;
		this.required_batch_qty = this.edit_batch_exception
			? Number((base_qty * (this.edit_batch_exception.stock_qty || 1)).toFixed(4))
			: base_qty;

		this.edit_batches_total = Number(this.edit_batch_array.reduce((sum, b) => sum + (Number(b.qty) || 0), 0).toFixed(4));

		const start = this.batch_page * this.batch_page_size;
		this.paginated_available_batch_array = this.available_batch_array.slice(start, start + this.batch_page_size);
		this.batch_total_pages = Math.ceil(this.available_batch_array.length / this.batch_page_size);
		this.batch_current_page = this.batch_page + 1;
	}

	showEditBatches(item: OrderItemInfo, item_exception?: Item_Exception)
	{
		if (!item_exception && (item.item.batch_option === 'NONE' || this.computeSoldItemBatches(item).length === 0))
		{
			this.showError('Este artículo no tiene lotes');
			return;
		}
		this.edit_batch_item = item;
		this.edit_batch_exception = item_exception || null;
		this.edit_batch_stock_item = item_exception ? this.getExceptionStockItem(item, item_exception.stock_item_id) : null;

		const source_batches = item_exception
			? (item.batches || []).filter(b => b.item_exception_id == item_exception.id)
			: this.computeSoldItemBatches(item);

		this.edit_batch_array = source_batches.map(b => ({
			batch: b.batch || '',
			expiration_date: b.expiration_date || '',
			qty: b.qty
		}));
		this.batch_page = 0;
		const target_item_id = (item_exception ? item_exception.stock_item_id : item.item.id) as number;
		this.is_loading = true;
		this.subs.sink = this.rest_batch_record.search({
			eq: {
				item_id: target_item_id,
				store_id: this.order_info.order.store_id,
				is_current: 1
			},
			gt: { qty: 0 },
			limit: 1000
		}).subscribe({
			next: (response) =>
			{
				this.is_loading = false;
				this.available_batch_array = response.data.map(b => ({
					batch: b.batch || '',
					expiration_date: b.expiration_date ? String(b.expiration_date) : '',
					qty: b.qty
				}));
				this.updateBatchModalComputed();
				this.show_edit_batches = true;
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	saveBatches()
	{
		if (!this.edit_batch_item)
		{
			return;
		}

		const target_item_id = (this.edit_batch_exception
			? this.edit_batch_exception.stock_item_id
			: this.edit_batch_item.item.id) as number;

		this.is_loading = true;
		this.subs.sink = this.rest.updateOrderBatches(this.order_info.order.id, [
			{
				item_id: target_item_id,
				order_item_id: this.edit_batch_item.order_item.id,
				item_exception_id: this.edit_batch_exception ? this.edit_batch_exception.id : null,
				batches: this.edit_batch_array
			}
		]).subscribe({
			next: () =>
			{
				this.is_loading = false;
				this.show_edit_batches = false;
				this.showSuccess('Lotes actualizados correctamente');
				window.location.reload();
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	addBatchRow()
	{
		this.edit_batch_array.push({ batch: '', expiration_date: '', qty: 0 });
		this.updateBatchModalComputed();
	}

	removeBatchRow(index: number)
	{
		this.edit_batch_array.splice(index, 1);
		this.updateBatchModalComputed();
	}

	onBatchQtyChange()
	{
		this.updateBatchModalComputed();
	}

	nextBatchPage()
	{
		if (this.batch_page < this.batch_total_pages - 1)
		{
			this.batch_page++;
			this.updateBatchModalComputed();
		}
	}

	prevBatchPage()
	{
		if (this.batch_page > 0)
		{
			this.batch_page--;
			this.updateBatchModalComputed();
		}
	}

	selectAvailableBatch(available: { batch: string; expiration_date: string; qty: number })
	{
		const current_total = this.edit_batch_array.reduce((sum, b) => sum + (Number(b.qty) || 0), 0);
		const remaining = this.required_batch_qty - current_total;
		if (remaining <= 0)
		{
			this.showError('Ya se alcanzó la cantidad requerida');
			return;
		}
		const qty_to_add = Math.min(available.qty, remaining);
		const existing = this.edit_batch_array.find(b => b.batch === available.batch && b.expiration_date === available.expiration_date);
		if (existing)
		{
			existing.qty += qty_to_add;
		}
		else
		{
			this.edit_batch_array.push({
				batch: available.batch,
				expiration_date: available.expiration_date,
				qty: qty_to_add
			});
		}
		this.updateBatchModalComputed();
	}
}

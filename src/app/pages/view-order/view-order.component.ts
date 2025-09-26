import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe, CurrencyPipe, DecimalPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {forkJoin, from, of, throwError} from 'rxjs';
import {filter, mergeMap} from 'rxjs/operators';
import {OrderInfo,OrderItemInfo, PaymentInfo, ResponseInfo, ReturnsInfo, SerialInfo} from '@shared/Models';
import {Billing_Data,Order, Currency_Rate, Form, Installment, Response, Store, User, Sat_Factura, Bank_Movement, Order_Item_Response, Order_Item, Serial} from '@shared/RestModels';
import {Rest, RestResponse, SearchObject} from '@shared/services/rest.service';
import {BaseComponent} from '@shared/base/base.component';
import {GetEmpty} from '@shared/GetEmpty';
import {Utils} from '@shared/Utils';
import { ItemNamePipe } from '@shared/pipes/item-name.pipe';
import { Title } from '@angular/platform-browser';
import { ConfirmationService } from 'src/app/modules/shared/services/confirmation.service';

type cstatus = 'PENDIENTE' | 'PAGADO' | 'VENCIDO';
type Transaction_Type = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'PAYPAL' | 'CHECK';

interface CInstallment extends Installment
{
	due_status:cstatus;
}

interface CFormRespomse
{
	form:Form;
	response:Response[];
}

interface COrder_Item_Response extends Order_Item_Response
{
	order_id:number;
	form_id:number;
}

interface OrderItemResponseInfo
{
	order_item_response:Order_Item_Response;
	order_item:Order_Item;
	response:Response;
	serial: Serial | null;
}


//OrderItemInfoConFormulariosYRespuestas
interface COIIResponses extends OrderItemInfo
{
	form:Form;
	responses:OrderItemResponseInfo[];
}


@Component({
	selector: 'app-view-order',
	templateUrl: './view-order.component.html',
	styleUrls: ['./view-order.component.css'],
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
	constructor(
		rest: RestService,
		titleService: Title,
		route: ActivatedRoute,
		router: Router,
		confirmation: ConfirmationService
	) {
		super(rest, titleService, route, router, confirmation);
	}
	sat_forma_pago:string = '';
	rest_user = this.rest.initRestSimple<User>('user');
	rest_order_info = this.rest.initRest('order_info');
	rest_payment_info = this.rest.initRest('payment_info');
	rest_returns_info = this.rest.initRest('returns_info');
	rest_installment = this.rest.initRestSimple<Installment>('installment');
	rest_response_info = this.rest.initRest('response_info');
	rest_form = this.rest.initRestSimple<Form>('form');
	rest_sat_factura = this.rest.initRestSimple<Sat_Factura>('sat_factura');
	rest_reenvia_factura = this.rest.initRestSimple<any>('reenvia_factura');
	rest_serial_info = this.rest.initRest('serial_info');
	order_info:OrderInfo = GetEmpty.orderInfo(this.rest);
	show_agregar_marbetes:boolean = false;
	selected_order_item_info:OrderItemInfo | null = null;
	show_facturar:boolean = false;
	show_add_payment_to_order:boolean = false;
	billing_data_list:Billing_Data[] = [];
	payment_info_list: PaymentInfo[] = [];
	active_payment_list: PaymentInfo[] = [];
	deleted_payment_list: PaymentInfo[] = [];
	currency_rate_list: Currency_Rate[] = [];
	returns_info_list: ReturnsInfo[] = [];
	client_order_info_list: OrderInfo[] = [];
	cancel_user:User | null = null;
	fecha_pago:string = '';
	cashier_user:User | null = null;
	sat_serie:string = 'A';
	has_forms:boolean = false;
	coii_response_list:COIIResponses[] = [];
	serial_number:string = '';

	reenviar_factura_name:string = '';
	reenviar_factura_email:string = '';
	show_reenviar_factura:boolean = false;
	environment = environment;

	cinstallment_list:CInstallment[] = [];
	cformresponse_list:CFormRespomse[] = [];

	response_info_list:ResponseInfo[] = [];
	selected_response_id:number | null = null;

	selected_serial:Serial | null = null;


	pago_factura_email:string = '';

	payment_type_dic:Record<string,string> =
	{
		'CASH': 'Efectivo',
		'CREDIT_CARD': 'Tarjeta Credito',
		'DEBIT_CARD' : 'Tarjeta Debito',
		'PAYPAL' : 'Paypal',
		'CHECK'		: 'Cheque',
		'DISCOUNT'	: 'Descuento',
		'RETURN_DISCOUNT':'Descuento por devolución',
		'TRANSFER'	: 'Transferencia',
	};

	show_refacturar: boolean = false;
	store: Store = GetEmpty.store();
	cancelar_factura_enabled: boolean = false;
	show_change_transaction_type: boolean = false;
	selected_bank_movement: Bank_Movement | null = null;
	transaction_type: Transaction_Type = 'CASH';
	rest_order_item_response_info:Rest<COrder_Item_Response,OrderItemResponseInfo> = this.rest.initRest('order_item_response_info');
	rest_order_item_response:Rest<COrder_Item_Response,Order_Item_Response> = this.rest.initRest('order_item_response');
	forms: Form[] = [];
	selected_form: Form | null;
    show_change_serial: boolean = false;
	selected_order_item_response: Order_Item_Response | null = null;
	show_confirm_cancel: boolean = false;
	cancel_reason: string = '';

	ngOnInit(): void
	{
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((paramMap: ParamMap)=>
			{
				this.has_forms = false;

				this.cancel_reason = '';

				this.setTitle('Orden #'+paramMap.get('id'));
				this.path = '/view-order/'+paramMap.get('id');
				this.is_loading = true;

				let cdate = new Date();
				cdate.setSeconds(0);

				let date = Utils.getLocalMysqlStringFromDate(cdate);
				this.fecha_pago = Utils.getLocalMysqlStringFromDate(cdate).replace(' ','T');

				let search:SearchObject<Billing_Data> = this.getEmptySearch();
				search.limit = 99999;

				console.log('Has offline',paramMap.get('offline'));

				let facturar = this.route.snapshot.queryParamMap.has('facturar');

				return forkJoin
				({
					order_info: paramMap.has('offline')
						? from(this.rest.getOfflineOrderInfoBySyncId( paramMap.get('sync_id') ) )
						: this.rest.order_info.get( paramMap.get('id')),
					billing_data: paramMap.has('offline') ? of({total:0, data:[]}) : this.rest.getBillingData(false),
					payment:
						paramMap.has('offline')
						? from(this.rest.getPaymentInfoByOrderSyncId( paramMap.get('sync_id') ) )
						: this.rest.payment_info.search({search_extra:{order_id:paramMap.get('id'), hades: this.rest.has_ares ? 1 : null}, csv: { status: ['ACTIVE', 'DELETED'] }}),
					price_type: this.rest.getPriceTypes(false),
					currency_rate: this.rest.getCurrencyRates(),
					store: this.rest.store.get(this.rest.user.store_id),
					returns: this.rest.returns_info.search({search_extra:{order_id:paramMap.get('id')}}),
					facturar: of( facturar )
				});
			}),
			mergeMap( responses =>
			{
				if( responses.order_info.order.ares && !this.rest.has_ares )
				{
					this.order_info = GetEmpty.orderInfo( this.rest );
					throw new Error( 'La orden no existe' );
				}

				this.store = responses.store;
				let installments_obs = responses.order_info.order.installment_months > 0
					? this.rest.installment.search({ eq: { order_id: responses.order_info.order.id, status: 'ACTIVE' }, limit: 9999})
					: of({total:0, data:[]});

				//check for the forms id in the order items who have item.form_id
				let form_ids:number[] = [];

				responses.order_info.items.forEach(item=>
				{
					if (item.item.form_id)
					{
						form_ids.push(item.item.form_id);
					}
				});

				let sat_facturas_ids = responses.payment.data.map(p=>p.payment.sat_factura_id).filter(id=>id!=null);

				let reponses_obs = form_ids.length > 0
					? this.rest_response_info.search({ csv: { form_id: form_ids }, eq:{user_id: responses.order_info.client.id}, limit: 9999})
					: of({total:0, data:[]});

				let order_item_response_obs = form_ids.length > 0
					? this.rest_order_item_response_info.search({ csv: { form_id: form_ids }, eq:{ order_id: responses.order_info.order.id}, limit: 9999})
					: of({total:0, data:[]});

				let forms_obs = form_ids.length > 0
					? this.rest_form.search({ csv: { id: form_ids }, limit: 9999})
					: of({total:0, data:[]});

				let sat_factura_search_obj:SearchObject<Sat_Factura> = this.rest_sat_factura.getEmptySearch();
				sat_factura_search_obj.limit = 9999;
				sat_factura_search_obj.csv = { id: sat_facturas_ids };

				// let sat_factura_search_obj:Partial<SearchObject<Sat_Factura>> =
				// {
				// 	limit: 9999,
				// 	csv: { id: sat_facturas_ids }
				// }

				let obs_sat_facturas = sat_facturas_ids.length == 0
					? of({total:0, data:[] as Sat_Factura[]})
					: this.rest_sat_factura.search(sat_factura_search_obj);

				return forkJoin({
					order_info: of(responses.order_info),
					billing_data: of(responses.billing_data),
					payment: of(responses.payment),
					price_type: of(responses.price_type),
					currency_rate: of(responses.currency_rate),
					installments: installments_obs,
					response: reponses_obs,
					sat_facturas: obs_sat_facturas,
					returns: of(responses.returns),
					facturar: of(responses.facturar),
					order_item_response: order_item_response_obs,
					forms: forms_obs
				});
			})
		)
		.subscribe(s_resp=>
		{
			console.log('LLego la informacion del orden info', s_resp.order_info);
			//console.log('cformResponse final', s_resp.response);
			let price_type	= s_resp.price_type.data.find((pt)=>pt.id == s_resp.order_info.order.price_type_id );

			this.response_info_list = s_resp.response.data;
			this.forms = s_resp.forms.data;

			let rango_para_cancelar = 60*60*24*1000; //En milisegundos

			s_resp.order_info.price_type = price_type;
			this.order_info = s_resp.order_info;

			this.cancelar_factura_enabled = this.order_info?.sat_factura ? true : false;
			//(
			//	this.order_info.order.total < 1000 ||
			//	( Date.now() - this.order_info.sat_factura.created.getTime() ) < rango_para_cancelar
			//);

			if (this.order_info.order.cancelled_by_user_id)
			{
				this.subs.sink = this.rest.user.get(this.order_info.order.cancelled_by_user_id).subscribe((cancel_user)=>
				{
					this.cancel_user = cancel_user;
				},
				(error)=>this.showError('Error obteniendo usuario que cancelo: ' + error));
			}
			this.billing_data_list = s_resp.billing_data.data;
			this.payment_info_list = s_resp.payment.data.map((payment)=>
			{
				let sat_factura = s_resp.sat_facturas.data.find((sf)=>sf.payment_id == payment.payment.id);
				return {
					...payment,
					sat_factura
				};
			});

			this.active_payment_list = this.payment_info_list.filter(p => p.payment.status === 'ACTIVE');
			this.deleted_payment_list = this.payment_info_list.filter(p => p.payment.status === 'DELETED');
			this.reenviar_factura_email = this.order_info.order.sat_receptor_email;
			this.reenviar_factura_name	= this.order_info?.client?.name || this.order_info.order.client_name;
			this.currency_rate_list = s_resp.currency_rate.data;
			this.pago_factura_email = this.order_info.order.sat_receptor_email;
			this.returns_info_list = s_resp.returns.data;

			if( this?.returns_info_list?.length )
			{
				this.subs.sink = this.rest.user.get(this.returns_info_list[0].returns.cashier_user_id)
				.subscribe((response)=>
				{
					this.cashier_user = response;
				},(error)=>this.showError('Error obteniendo el usuario que devolvio: ' + error));
			}

			if(this.order_info.order.client_user_id)
			{
				this.client_order_info_list.push(this.order_info);
			}

			if(s_resp.installments.total > 0)
			{
				this.cinstallment_list = s_resp.installments.data.map((installment:Installment)=>
				{
					let due_status:cstatus = 'PENDIENTE';

					if (!installment.paid_timestamp && new Date(installment.due_date) < new Date())
					{
						due_status = 'VENCIDO';
					}

					if (installment.paid_timestamp)
					{
						due_status = 'PAGADO';
					}

					return {...installment, due_status};
				});
			}

			if ( s_resp.response.total > 0 )
			{
				s_resp.response.data.forEach((response_info:ResponseInfo)=>
				{
					let form_response = this.cformresponse_list.find((fr)=>fr.form.id == response_info.form.id);

					if (!form_response)
					{
						form_response = {form:response_info.form, response:[]};
						this.cformresponse_list.push(form_response);
					}

					form_response.response.push(response_info.response);
				});
			}

			this.is_loading = false;

			if( s_resp.facturar )
			{
				this.showFacturar(null);
			}

			this.has_forms = this.order_info.items.some((oii:OrderItemInfo)=>
			{
				return oii.item.form_id != null;
			});


			this.coii_response_list = this.order_info.items
			.filter((oii)=>oii.item.form_id)
			.map((oii:OrderItemInfo)=>
			{
				let form = this.forms.find((f)=>f.id == oii.item.form_id) as Form;
				let responses = s_resp.order_item_response.data
					.filter((oir)=>
					{
						return oir.order_item_response.order_item_id == oii.order_item.id
					});

				return {
					...oii,
					form,
					responses
				};
			})
		},error=>this.showError(error));
	}

	acumulaVentaComex(evt: Event)
	{
		evt.preventDefault();
		evt.stopPropagation();


		this.onSubscriptionSuccess
		(
			this.rest.comex('acumula_venta', {order_id: this.order_info.order.id}),
			(response) =>
			{
				console.log('AcumulaVentaComex', response);
				this.showSuccess('Se acumulo correctamente')
			}
		);
	}

	duplicateOrder(evt:Event)
	{
		this.onSubscriptionSuccess
		(
			this.rest.updatePath('duplicate_order',{order_id:this.order_info.order.id})
			,(response)=>
			{
				this.showSuccess('Se duplico correctamente');
				this.router.navigate(['/view-order/'+response.order_id]);
			}
		)
	}

	showFacturar(_evt:Event)
	{
		this.sat_serie = this.order_info.store.default_sat_serie;
		this.pago_factura_email = this.order_info.order.sat_receptor_email;
		this.show_facturar = true;
	}

	onTerminoFacturar(withSuccess:boolean)
	{
		if( withSuccess )
		{
			this.subs.sink = this.rest.order_info.get( this.order_info.order.id )
			.subscribe( (order_info)=>
			{
				this.order_info = order_info;
			})
		}
		this.show_facturar = false;
	}

	replayFactura()
	{
		this.is_loading = true;

		this.sink = this.rest.replayFactura( this.order_info.sat_factura.id )
		.subscribe((sat_factura)=>
		{
			this.order_info.sat_factura = sat_factura;
		},(error)=>this.showError(error));
	}

	showPaymentForm()
	{
		this.show_add_payment_to_order = true;
	}

	onPayment(payment_info:PaymentInfo | null)
	{
		this.show_add_payment_to_order = false;

		if( payment_info != null )
		{
			this.router.navigateByUrl('/',{skipLocationChange: true})
			.then(()=>
			{
				this.router.navigate([this.path],{queryParams: {}});
			});
		}
	}

	showPdfFile(attachment_id:number)
	{
		window.location.href = this.rest.getFilePath(attachment_id);
	}

	confirmCancelOrder(evt:Event)
	{
		this.show_confirm_cancel = false;
		this.sink = this.rest.cancelOrder(this.order_info.order.id, this.cancel_reason)
		.subscribe
		({
			error:(error)=> this.showError(error),
			next:(_response)=>
			{
				this.order_info.order.status = 'CANCELLED';
				this.order_info.order.cancellation_reason = this.cancel_reason;
				this.showSuccess('La orden se canceló con éxito');
			}
		});
	}

	getPdfUrl(order_id:number)
	{
		return this.rest.getApiUrl()+'/getFacturaPdf.php?order_id='+order_id;
	}

	getPaymentPdfUrl(order_id:number)
	{
		return this.rest.getApiUrl()+'/getFacturaPdf.php?payment_id='+order_id;
	}

	resendFactura(evt:Event)
	{
		this.is_loading = true;
		let x:any = evt;

		this.subs.sink = this.rest.reenvia_factura.create
		({
			order_id: this.order_info.order.id,
			email: this.reenviar_factura_email,
			name: this.reenviar_factura_name
		})
		.subscribe
		({
			error:(error)=>this.showError(error),
			next:()=>
			{
				this.reenviar_factura_email = this.order_info.order.sat_receptor_email;
				this.reenviar_factura_name	= this.order_info?.client?.name || this.order_info.order.client_name;
				this.is_loading = false;
				x.target.reset();
				this.showSuccess('Se reenvío la factura correctamente');
				window.location.reload();
			}
		});
	}

	selected_payment:PaymentInfo | null = null;
	show_facturar_pago: boolean = false;

	showFacturarPago(p:PaymentInfo)
	{
		this.selected_payment = p;

		if (p?.payment?.created)
		{
			let fecha = new Date(p.payment.created);
			fecha.setSeconds(0);
			this.fecha_pago = Utils.getLocalMysqlStringFromDate(fecha).replace(' ', 'T');
		}

		this.sat_serie = this.order_info.store.default_sat_serie;
		this.show_facturar_pago = true;
	}

	facturarElPago(_evt:Event)
	{
		let d = Utils.getLocalDateFromMysqlString(this.fecha_pago);
		let fecha_de_pago = Utils.getMysqlStringFromLocalDate(d);
		fecha_de_pago = fecha_de_pago.replace(' ','T');

		this.subs.sink = this.rest
		.updatePath('facturar_pago',
		{
			payment_id: this.selected_payment.payment.id,
			email: this.pago_factura_email,
			fecha_de_pago,
			sat_serie: this.sat_serie
		})
		.subscribe
		({
			error:(error)=>this.showError(error),
			next:(result)=>
			{
				this.is_loading = false;
				this.show_facturar_pago = false;
				this.showSuccess('El pago se facturo correctamente');
				window.location.reload();
			}
		});
	}

	resetFacturacion(evt:Event)
	{
		evt.preventDefault();

		let payload = {
			order_id: this.order_info.order.id,
			sat_forma_pago: this.sat_forma_pago
		};

		this.subs.sink = this.rest
		.update('reiniciarFacturacion',payload)
		.subscribe((response)=>
		{
			this.showSuccess('Se reinicio correctamente')
		},(error)=>this.showError(error));
	}

	cancelarPago(payment_id:number)
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
			filter(result=>result.accepted),
			mergeMap(()=>
			{
				this.is_loading = true;
				return this.rest.cancelPayment(payment_id);
			}),
		)
		.subscribe
		({
			next:(response)=>this.showSuccess('El pago se cancelo correctamente'),
			error:(error)=>this.showError(error)
		});
	}

	changeAddress(evt:any)
	{

	}

	cancelarFactura()
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
			filter(result=>result.accepted),
			mergeMap(()=>
			{
				this.is_loading = true;
				let sat_factura_id = this.order_info.sat_factura.id
				return this.rest.cancelar_factura.create({ sat_factura_id });
			}),
		)
		.subscribe
		({
			next:(response)=>this.showSuccess('La factura se cancelo correctamente'),
			error:(error)=>this.showError(error)
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
			filter(result=>result.accepted),
			mergeMap(()=>
			{
				this.is_loading = true;
				return this.rest.cancelar_factura.create({ sat_factura_id });
			}),
		)
		.subscribe
		({
			next:(response)=>this.showSuccess('La cancelacion del pago ha sido solicitado'),
			error:(error)=>this.showError(error)
		});
	}

	showChangeTransactionType(bank_movement:Bank_Movement)
	{
		this.selected_bank_movement = bank_movement;
		this.transaction_type = bank_movement.transaction_type as Transaction_Type;
		this.show_change_transaction_type = true;
	}



	changeTransactionType(evt:Event)
	{
		evt.preventDefault();
		evt.stopPropagation();

		this.is_loading = true;

		console.log('QUEEEE PEDO');
		let bank_movement_id = this.selected_bank_movement.id as number;
		let transaction_type = this.transaction_type;

		this.sink = this.rest.updatePath('transaction_type',{bank_movement_id, transaction_type})
		.subscribe
		({
			next:(response)=>
			{
				this.showSuccess('Se cambio el tipo de pago correctamente');
				window.location.reload();
			},
			error:(error)=>this.showError(error)
		});
	}

	cancelarComex(evt:Event)
	{
		evt.preventDefault();
		evt.stopPropagation();

		this.is_loading = true;

		let obs = this.confirmation.showConfirmAlert(this.order_info,'Cancelar Venta','¿Estas seguro de cancelar la orden "#'+this.order_info.order.id+'"?')
		.pipe
		(
			filter(x=>x.accepted),
			mergeMap((response)=>
			{
				let oi = response.obj as OrderInfo;
				return this.rest.comex('cancelar_venta',{order_id:response.obj.order.id});
			})
		);

		let on_cancelation_success = (_response)=>{
			this.order_info.order.external_id = '';
			this.showSuccess('Se cancelo correctamente')
		};

		this.onSubscriptionSuccess( obs , on_cancelation_success );
	}

	showAgregarResponse(coii: COIIResponses)
	{
		if( this.order_info.order.client_user_id == null )
		{
			//Must never happen
			this.showError('No se puede agregar respuesta a una orden sin cliente');
			return;
		}

		this.selected_form = coii.form;

		this.selected_order_item_info = coii;
		this.show_assign_response = true;

		let search_obj:SearchObject<Response> = this.getEmptySearch();
		search_obj.limit = 9999;
		search_obj.eq.user_id = this.order_info.order.client_user_id;
		search_obj.eq.form_id = coii.form.id;

		this.subs.sink = this.rest.response_info
		.search(search_obj)
		.subscribe
		({
			error:(error)=>this.showError(error),
			next:(responses)=>{
				this.response_info_list = responses.data;
			}
		});
	}

	selected_response:Response | null = null;
	show_assign_response:boolean = false;

	addResponseToOrderItem(evt:Event)
	{
		if( this.selected_order_item_info == null )
		{
			this.showError('No hay respuesta seleccionada');
			return;
		}

		if( this.selected_response == null )
		{
			this.showError('No hay respuesta seleccionada');
			return;
		}

		this.sink = this.rest_order_item_response.create
		({
			order_item_id: this.selected_order_item_info.order_item.id,
			response: this.selected_response.id,
			serial: this.selected_serial ? this.selected_serial.id : null,
		})
		.subscribe
		({
			error:(error)=>this.showError(error),
			next:(response)=>
			{
				this.showSuccess('Se agrego la respuesta correctamente');
				this.selected_order_item_info = null;
				this.selected_response = null;
				this.show_assign_response = false;

				window.location.reload();
			}
		});
	}

	onSelectedResponse(response_id:number | '')
	{
		if( response_id == '' )
		{
			this.selected_response = null;
			this.selected_response_id = null;
			return;
		}

		this.selected_response = this.response_info_list.find((r)=>r.response.id == response_id)?.response || null;
		this.selected_response_id = this.selected_response?.id || null;
	}

	submitOrderItemResponse(evt:Event)
	{
		evt.preventDefault();
		evt.stopPropagation();

		if( this.selected_order_item_info == null )
		{
			this.showError('No hay respuesta seleccionada');
			return;
		}

		if( this.selected_response == null )
		{
			this.showError('No hay respuesta seleccionada');
			return;
		}

		this.sink = this.rest_order_item_response.create
		({
			order_item_id: this.selected_order_item_info.order_item.id,
			response_id: this.selected_response.id,
			serial_number: this.serial_number
		})
		.subscribe
		({
			error:(error)=>this.showError(error),
			next:(response)=>
			{
				this.showSuccess('Se agrego la respuesta correctamente');
				this.selected_order_item_info = null;
				this.selected_response = null;
				this.show_assign_response = false;

				window.location.reload();
			}
		});
	}

	showChangeSerial(order_item_response_info:OrderItemResponseInfo)
	{

		this.selected_order_item_response = order_item_response_info.order_item_response;

		this.is_loading = true;

		let obs = order_item_response_info.order_item_response.serial_id
			? this.rest.serial_info.get(order_item_response_info.order_item_response.serial_id)
			: of(null);

		this.sink = obs.subscribe
		({
			error:(error)=>
			{
				this.is_loading = false;
				this.showError('No se pudo encontral la informacion del numero de serie actual');
			},
			next:(serial_info)=>
			{
				this.is_loading = false;
				this.selected_serial = serial_info ? serial_info.serial : null;
				this.serial_number = serial_info ? serial_info.serial.serial_number : '';
				this.show_change_serial = true;
			}
		})
	}

	submitSerial(evt:Event)
	{
		this.sink = this.rest.serial_info.search({eq:{serial_number:this.serial_number}, limit:1}).pipe
		(
			mergeMap((response:RestResponse<SerialInfo>)=>
			{
				if( response.total )
				{
					let serial_id = response.data[0].serial.id;
					let x:Order_Item_Response = {...this.selected_order_item_response,serial_id};
					return of( x );
				}

				return throwError(new Error('No se encontro el numero de serie'));
			}),
			mergeMap((order_item_response)=>
			{
				return this.rest_order_item_response.update(order_item_response);
			})
		)
		.subscribe
		({
			error:(error)=>
			{
				this.showError(error);
				this.is_loading = false;
			},
			next:(response)=>
			{
				this.showSuccess('Se cambio el numero de serie correctamente');
				window.location.reload();
			}
		});
	}

	testPrint(evt:Event)
	{
		const myHeaders = new Headers();
		myHeaders.append("Content-Type", "application/json");

		const raw = JSON.stringify({
			"type": "ticket_de_corte",
			"printer": {
				"ip": "192.168.68.202",
				"port": 9100
			},
			"productos": [
				{
					"nombre": "Chile 1 Kg",
					"cantidad": 1,
					"precio": 58
				},
				{
					"nombre": "Limon 1 Kg",
					"cantidad": 2,
					"precio": 61
				},
				{
					"nombre": "Manzana 1 Kg",
					"cantidad": 1,
					"precio": 54
				}
			],
			"total": 173,
			"subtotal": 149.14,
			"iva": 23.86,
			"recibido": 173,
			"cambio": 0,
			"atendio": "ADMIN",
			"nombre": "Xmart",
			"sucursal": "Sucursal Plaza Mision",
			"direccion": "Plaza Mision Av. Reforma 1122, Comercial Misión, 22830 Ensenada, B.C. ",
			"RFC": "XX0XXXXX0XX00X0X",
			"telefono": "(646) 225-8954",
			"ventaId": "161",
			"fecha": "2025-06-04 14:00",
			"cliente": "PÚBLICO GRAL 15:00",
			"codigo_facturacion": "Z93CNRIMUD"
		});

		const requestOptions = {
			method: "POST",
			headers: myHeaders,
			body: raw,
			redirect: "follow" as RequestRedirect,
		};

		fetch("http://192.168.68.202:3000/imprimir", requestOptions)
			.then((response) => response.text())
			.then((result) => console.log(result))
			.catch((error) => console.error(error));
	}

	getExternalLink(path:string, id:number):string
	{
		return `${this.rest.external_app_url}/#/${path}/${id}`;
	}
}

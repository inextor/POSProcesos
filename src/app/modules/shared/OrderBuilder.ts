import { GetEmpty } from './GetEmpty';
import { ItemInfo, OrderInfo, OrderItemInfo } from './Models';
import { Category, Currency_Rate, Order, Order_Item, Price, Price_Type, Quote_Item, Stock_Record, Store, User } from './RestModels';
import { Utils } from './Utils';
import { RestService } from './services/rest.service';

export class OrderBuilder
{
	private _price_type:Price_Type;
	private _client_user:User | null = null;
	private _store: Store;
	private _cashier_user: User;
	_order_info:OrderInfo;
	rest: RestService;
	currency_rate_list: Currency_Rate[] = [];

	constructor(rest:RestService,price_type:Price_Type,store:Store, cashier_user:User)
	{
		this._price_type = price_type;
		this._store = store;
		this._cashier_user = cashier_user;
		this.rest = rest;
		this._order_info = this.getEmptyOrderInfo();
	}

	reset()
	{
		if( !this._order_info.order.id )
		{
			if( this._order_info.items.length == 0)
			{
				this._order_info = this.getEmptyOrderInfo();
				return;
			}
		}
	}

	public get price_type():Price_Type
	{
		return this._price_type;
	}

	public get order_info():OrderInfo
	{
		return this._order_info;
	}

	public set price_type(price_type:Price_Type)
	{
		this._price_type = price_type;
	}

	public get store():Store
	{
		return this._store;
	}
	public set store(store:Store)
	{
		this._store = store;
	}

	public set user_client(user:User | null)
	{
		this._client_user = user;

		if( user )
		{
			this.order_info.order.client_name = user.name
			this.order_info.order.client_user_id = user.id
		}
		else
		{
			this.order_info.order.client_user_id = null;

			let date = new Date();
			let hour = Utils.zero(date.getHours())+':'+Utils.zero(date.getMinutes());
			this.order_info.order.client_name = 'PÚBLICO GRAL '+hour;
		}
	}


	public get cashier_user():User
	{
		return this._cashier_user;
	}

	public set cashier_user(user:User)
	{
		this._cashier_user = user;

		if( user.id )
		{
			this._order_info.cashier = user;
			this._order_info.order.cashier_user_id = user.id;
		}
	}

	getEmptyOrderInfo():OrderInfo
	{
		let tax_percent = this.store.tax_percent;
		let version_created = this.rest.getVersion();
		let items:OrderItemInfo[] = [];
		let order:Order = {
			amount_paid: 0,
			ares: 0,
			cancellation_timestamp: null,
			billing_data_id: this.store.default_billing_data_id,
			cashier_user_id: this.cashier_user.id,
			created: new Date(),
			currency_id: this.store.default_currency_id,
			cancellation_reason: '',
			cancelled_by_user_id: null,
			closed_timestamp: null,
			discount: 0,
			initial_payment: 0,
			sat_isr: 0,
			sat_ieps: 0,
			discount_calculated: 0,
			price_type_id: this.price_type.id,
			sat_forma_pago: '99',
			sat_serie: this.store?.default_sat_serie || 'A',
			sat_exchange_rate: 0,
			sat_domicilio_fiscal_receptor: '',
			sat_regimen_fiscal_receptor: '',
			sat_regimen_capital_receptor: '',
			service_type: 'QUICK_SALE',
			status: 'PENDING',
			paid_status: 'PENDING',
			store_id: this.store.id,
			subtotal: 0,
			sync_id: this.rest.getSyncId(),
			system_activated: null,
			table_id: null,
			tag: '',
			tax: 0,
			tax_percent,
			total: 0,
			updated: new Date(),
			version_created,
			version_updated: version_created,
			address: null,
			authorized_by: null,
			billing_address_id: null,
			city: null,
			client_name: null,
			client_user_id: null,
			delivery_status: 'PENDING',
			delivery_user_id: null,
			facturacion_code: '',
			facturado: 'YES',
			guests: null,
			id: 0,
			lat: null,
			lng: null,
			marked_for_billing: 'YES',
			note: null,
			paid_timetamp: null,
			period_id: null,
			quote_id: null,
			sat_codigo_postal: null,
			sat_pdf_attachment_id: null,
			sat_razon_social: null,
			sat_receptor_email: null,
			sat_receptor_rfc: null,
			sat_serie_consecutive: null,
			sat_uso_cfdi: null,
			sat_xml_attachment_id: null,
			shipping_address_id: null,
			shipping_cost: 0,
			state: null,
			store_consecutive: null,
			suburb: null
		};


		this._order_info = {
			items,
			order,
			//structured_items:[],
			cashier: this.cashier_user,
			delivery_user: null,
			client: null,
			store: this.store,
			purchase: null,
			offers: [],
			price_type:this.price_type
		};
		return this._order_info
	}

	incrementOrderItemInfo()
	{

	}

	/*
		* return null si no se pudo agregar
	*/
	addItemInfoWithPriceNumber(item_info:ItemInfo,qty:number,price_number:number,currency_id:string, note:string = '',tax_included:'YES'|'NO' = 'YES'): OrderItemInfo
	{
		let price:Price = GetEmpty.price();
		price.price = price_number;
		price.price_type_id = this.order_info.price_type.id
		price.currency_id = currency_id;
		price.tax_included = tax_included;
		price.price_list_id = this.store.price_list_id;

		return this.addItemInfo(item_info, qty, price, note);
	}

	addItemInfo(item_info:ItemInfo,qty:number, price:Price,note:string = ''): OrderItemInfo
	{
		if( item_info.item.has_serial_number == 'YES' )
		{
			//this.rest.showError('Se debe Usar Funcion agregar #serie');
			throw new Error('Se debe Usar Funcion agregar #serie');
		}

		if( item_info.item.note_required == 'YES' && note.trim() == '')
		{
			//this.rest.showError('La nota no puede estar vacia');
			//return null;
		}


		if( item_info.options.length)
		{
			//this.rest.showError('Articulo con Opciones no soportadas');
			throw new Error('Articulo con Opciones no soportadas');
			//return null;
		}

		let unitary_price		= price.price;
		let date = new Date();

		let order_item = GetEmpty.order_item(item_info.item);
		order_item.original_unitary_price= unitary_price;
		order_item.unitary_price_meta = unitary_price;
		order_item.tax_included = price.tax_included;
		order_item.qty = qty;
			//this.rest.setOrderItemPrice();

		let stock_record = item_info.records.find((sr:Stock_Record)=>
		{
			return sr.store_id == this.store.id;
		});

		if( item_info.item.availability_type == 'ON_STOCK' && !stock_record )
		{
			throw new Error('No se encuentra el stock para el articulo #' + item_info.item.id + ' en sucursal #' + this.store.id);
		}

		this.setOrderItemPrice(order_item, price ,this.order_info.store.default_currency_id, this.order_info.order.currency_id,this.currency_rate_list);

		let order_item_info:OrderItemInfo = {
            order_item,
            item: item_info.item,
            category: item_info.category,
            category_zero: 0,
            records: item_info.records,
            stock_record: stock_record,
            price: price,
            prices: item_info.prices,
            exceptions: item_info.exceptions,
            order_item_exceptions: [],
            options: [],
            serials: [],
            serials_string: '',
            created: date,
            commanda_type_id: item_info.item.commanda_type_id,
            item_options: []
        };

		this.addOrderItem([ order_item_info ]);
		return order_item_info;
	}

	addOrderItem(order_item_info:OrderItemInfo[]):void
	{
		order_item_info.forEach((i:OrderItemInfo)=>
		{
			//Para ver si ya hay uno con el mismo precio agregarlo
			let price = i.price || i.prices.find((p:Price)=>{
				return p.price_type_id == this.order_info.order.price_type_id
					&& p.price_list_id == this.order_info.store.price_list_id
			})

			if( !(i.order_item.item_option_id) )
			{
				let other_oii = this.order_info.items.find((o_oii)=>
				{
					return o_oii.item.id == i.item.id &&
						!o_oii.order_item.item_option_id &&
						o_oii.order_item.status == 'ACTIVE' &&
						!o_oii.order_item.discount && !o_oii.order_item.discount_percent
				});

				//Si ya hay uno previo ponemos el precio del articulo anterior
				if( other_oii )
				{
					i.order_item.unitary_price = other_oii.order_item.unitary_price;
					i.order_item.unitary_price_meta = other_oii.order_item.unitary_price_meta;
					i.order_item.original_unitary_price = other_oii.order_item.original_unitary_price;
				}
				else if( price )
				{
					this.setOrderItemPrice(i.order_item, price,this.order_info.store.default_currency_id, this.order_info.order.currency_id, this.currency_rate_list);
				}
			}
			let tax = i.item.applicable_tax == 'DEFAULT' ? this.order_info.order.tax_percent : 0;
			this.updateOrderItemPrice(i.order_item,tax, 0)
		});

		this.order_info.items.push( ...order_item_info );
		this.updateOrderTotal();
	}

	applyDiscountPercent(selected_order_item:OrderItemInfo,discount_percent:number)
	{
		let tax_percent = selected_order_item.item.applicable_tax == 'EXEMPT' ? 0 : this.order_info.order.tax_percent;
		selected_order_item.order_item.discount_percent = discount_percent;
		selected_order_item.order_item.original_unitary_price = selected_order_item.order_item.unitary_price_meta;

		if( selected_order_item.order_item.tax_included == 'YES' )
		{
			selected_order_item.order_item.original_unitary_price = selected_order_item.order_item.unitary_price_meta*(1-discount_percent/100);
		}
		else
		{
			selected_order_item.order_item.original_unitary_price = (selected_order_item.order_item.unitary_price_meta*(1+tax_percent))*(1-discount_percent/100);
		}

		let tax = selected_order_item.item.applicable_tax == 'DEFAULT' ?this.order_info.order.tax_percent: 0;
	}

	updateOrderTotal()
	{

		let total:number = 0;
		let subtotal:number = 0;
		let tax:number = 0;

		this.order_info.items.forEach((order_item_info:OrderItemInfo)=>
		{
			if( order_item_info.order_item.original_unitary_price == 0 )
				return;

			let item_tax_percent = order_item_info.item.applicable_tax == 'DEFAULT' ? this.order_info.order.tax_percent : 0;

			if( order_item_info.order_item.discount_percent )
			{
				this.applyDiscountPercent(order_item_info,order_item_info.order_item.discount_percent);
			}

			this.updateOrderItemPrice(order_item_info.order_item,item_tax_percent, 0);

			let multiply = 1;
			if( order_item_info.order_item.type == 'REFUND' )
			{
				multiply = -1;
			}

			if( order_item_info.order_item.is_free_of_charge != 'YES' )
			{
				total += multiply*Math.ceil( order_item_info.order_item.total*100 )/100;
				subtotal += multiply*order_item_info.order_item.subtotal;
				tax += multiply*order_item_info.order_item.tax;
			}
		});

		this.order_info.order.subtotal = subtotal;
		this.order_info.order.total = total;
		this.order_info.order.tax = tax;
	}



	//addOrderItem(order_item_info:OrderItemInfo[]):void
	//{
	//	order_item_info.forEach((i:OrderItemInfo)=>
	//	{
	//		let price = i.prices.find((p:Price)=>{
	//			return p.price_type_id == this.order_info.order.price_type_id
	//				&& p.price_list_id == this.order_info.store.price_list_id
	//		})

	//		if( !(i.order_item.item_option_id) )
	//		{
	//			let other_oii = this.order_info.items.find((o_oii)=>
	//			{
	//				return o_oii.item.id == i.item.id &&
	//					!o_oii.order_item.item_option_id &&
	//					o_oii.order_item.status == 'ACTIVE' &&
	//					!o_oii.order_item.discount && !o_oii.order_item.discount_percent
	//			});

	//			//Si ya hay uno previo ponemos el precio del articulo anterior
	//			if( other_oii )
	//			{
	//				i.order_item.unitary_price = other_oii.order_item.unitary_price;
	//				i.order_item.unitary_price_meta = other_oii.order_item.unitary_price_meta;
	//				i.order_item.original_unitary_price = other_oii.order_item.original_unitary_price;
	//			}
	//			else
	//			{
	//				this.rest.setOrderItemPrice(i.order_item, price,this.order_info.store.default_currency_id, this.order_info.order.currency_id, this.currency_rate_list);
	//			}
	//		}
	//		let tax = i.item.applicable_tax == 'DEFAULT' ? this.order_info.order.tax_percent : 0;
	//		this.rest.updateOrderItemPrice(i.order_item,tax, 0)
	//	});

	//	this.order_info.items.push( ...order_item_info );
	//	this.updateOrderTotal();

	//	this.order_item_search_index = this.order_info.items.length-1;
	//}

	setOrderItemPrice(ii:Order_Item | Quote_Item, price: Price,default_currency_id:string, order_currency_id:string, rates:Currency_Rate[]):boolean
	{
		if( price.currency_id == order_currency_id )
		{
			ii.original_unitary_price = price.price;

			if( 'unitary_price_meta' in ii )
				ii.unitary_price_meta = price.price;

			return true;
		}

		//Stor_id = 'MXN'
		//Order	= 'USD'
		//Precio	= 'MXN'
		//TipoCambio = 'USD'

		//let cr:Currency_Rate | undefined = rates.find( (r)=> r.currency_id == order_currency_id);

		let cr:Currency_Rate | undefined = rates.find((r)=>
		{
			if( order_currency_id == default_currency_id )
			{
				return r.currency_id == price.currency_id;
			}

			return r.currency_id == order_currency_id;
		});

		if(!cr )
		{
			return false;
		}

		if( default_currency_id == order_currency_id )
		{
			ii.original_unitary_price = price.price * cr.rate;
			if( 'unitary_price_meta' in ii )
				ii.unitary_price_meta = price.price * cr.rate;
		}
		else
		{
			ii.original_unitary_price = price.price / cr.rate;
			if( 'unitary_price_meta' in ii )
				ii.unitary_price_meta = price.price / cr.rate;
		}

		return true;
	}

	roundTo4(number:number):number
	{
		return Math.floor(number*1000)/1000;
	}

	//No se toca
	updateOrderItemPrice(order_item:Order_Item | Quote_Item, tax_percent:number,extra_charge_percent:number)
	{
		if( order_item.tax_included == 'NO' )
		{
			order_item.unitary_price = order_item.original_unitary_price*(1+(extra_charge_percent*extra_charge_percent));
			order_item.subtotal	= this.roundTo4(order_item.unitary_price*order_item.qty);
			///order_item.tax		= (order_item.subtotal-order_item.discount)*(tax_percent/100);
			//order_item.total	= (order_item.subtotal-order_item.discount)+order_item.tax;
			order_item.tax		= order_item.subtotal*(tax_percent/100);
			order_item.total	= order_item.subtotal+order_item.tax;
		}
		else
		{
			//No es tan sencillo como parece
			//no es lo mismo
			//100/3 --->este valor la compu no lo entiende y la facturacion vale ferga
			//que 33.3333

			//primero hay que multiplar todo nos va a dar el valor mas grande
			//Luego sacamos los precios individuales y lo truncamos a 4
			//volvemos a multiplicar con los valores truncados y ese va a ser el total

			let up:number = (order_item.original_unitary_price * order_item.qty) * (1+(extra_charge_percent/100));
			order_item.unitary_price = this.roundTo4( up /(1+(tax_percent/100)))/order_item.qty;
			order_item.subtotal = order_item.unitary_price*order_item.qty;
			//order_item.tax	= (order_item.subtotal-order_item.discount)*(tax_percent/100);
			//order_item.total	= order_item.tax+(order_item.subtotal-order_item.discount);
			order_item.tax		= order_item.subtotal*(tax_percent/100);
			order_item.total	= order_item.tax+order_item.subtotal;
		}
	}
}

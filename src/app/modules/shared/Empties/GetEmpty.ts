import { ExtendedReservation, ItemInfo, OrderInfo, OrderItemInfo, ReservationInfo, ReservationItemInfo, ShippingInfo } from "./Models";
import { User_Permission,Preferences,Production_Area,Process, Production, Shipping, Store, Payroll, User_Extra_Fields, User, Production_Area_Item, Item, Category, Reservation, Reservation_Item, Period, Order, Price_Type, Order_Item, Price, Item_Exception, Role, Role_Item_Price, Ecommerce_Item_Role, Address, Payroll_Value, Item_Online, Work_Log_Rules } from "./RestModels";
import { RestService } from "./services/rest.service";

export class GetEmpty
{
	static item_info(): ItemInfo
	{
		return {
			item: GetEmpty.item(),
			category: null,
			price: undefined,
			prices: [],
			options: [],
			exceptions: [],
			records: [],
			stock_record: undefined,
			serials: [],
			item_options: []
		};
	}
	static role(): Role
	{
		return {
			created: new Date(),
			created_by_user_id: 0,
			id: 0,
			name: '',
			updated: new Date(),
			updated_by_user_id: 0
		}
	}
	static role_item_price(): Role_Item_Price {
		let p: Role_Item_Price = {
			id: 0,
			price: 1,
			created_by_user_id: 1,
			updated_by_user_id: 1,
			created: new Date(),
			updated: new Date(),
			item_id: 0,
			role_id: 0
		}
		return p;
	}
	static price(): Price
	{
		let p:Price = {
			id: 0,
			price: 1,
			price_type_id: 1,
			currency_id: 'MXN',
			tax_included: 'YES',
			created_by_user_id: 1,
			updated_by_user_id: 1,
			created: new Date(),
			updated: new Date(),
			item_id: 0,
			percent: 0,
			price_list_id: 0
		}
		return p;
	}

	static order_item(item:Item): Order_Item
	{
		let order_item:Order_Item =
		{
			commanda_id: null,
			commanda_status: "PENDING",
			created: new Date(),
			created_by_user_id: null,
			delivered_qty: 0,
			delivery_status: "PENDING",
			discount: 0,
			discount_percent: 0,
			exceptions: '',
			has_separator: "NO",
			id: 0,
			id_payment: null,
			ieps_type: "RATE",
			ieps_value: 0,
			is_free_of_charge: "NO",
			is_item_extra: "NO",
			item_extra_id: null,
			item_group: Date.now(),
			item_id: item.id,
			item_option_id: null,
			item_option_qty: 1,
			note: null,
			offer_id: null,
			order_id: 0,
			original_unitary_price: 0,
			paid_qty: null,
			preparation_status: "PENDING",
			price_id: null,
			qty: 0,
			reservation_item_id: null,
			return_required: "NO",
			status: "ACTIVE",
			stock_status: "IN_STOCK",
			subtotal: 0,
			system_preparation_ended: null,
			system_preparation_started: null,
			tax: 0,
			tax_included: "YES",
			total: 0,
			type: "NORMAL",
			unitary_price: 0,
			unitary_price_meta: 0,
			updated: new Date(),
			updated_by_user_id: null
		};

		return order_item;
	}

	static orderItemInfo(item:Item,category:Category | null = null,price:Price | null = null, exceptions:Item_Exception[] = [],prices:Price[] = []):OrderItemInfo
	{
		let order_item = GetEmpty.order_item(item);

		let order_item_info:OrderItemInfo =
		{
			order_item,
			created: new Date(),
			order_item_exceptions: [],
			serials_string: "",
			commanda_type_id: item.commanda_type_id,
			item: item,
			category: null,
			//category_zero: 0,
			price: undefined,
			prices,
			options: [],
			exceptions: [],
			records: [],
			stock_record: undefined,
			serials: [],
			category_zero: null,
			item_options: []
		};

		return order_item_info;
	}
	static period(user:User): Period
	{
		let date = new Date();
		let minutes_offset = date.getTimezoneOffset();
		return {
			id:0,
			created: new Date(),
			created_by_user_id: user.id,
			reservation_id: 0,
			end_timestamp: new Date(),
			note: '',
			start_timestamp: new Date(),
			status:'ACTIVE',
			updated: new Date(),
			minutes_offset,
			updated_by_user_id: user.id,
		};
	}
	static getEmptyReservationInfo(): ReservationInfo
	{
		return {
			reservation: GetEmpty.reservation(),
			user: GetEmpty.user(),
			client_user: null,
			address: null,
			items: []
		};
	}

	static category(): Category {
		return {
			background: 'transparent',
			code: '',
			created: new Date(),
			created_by_user_id: null,
			default_clave_prod_serv: '',
			display_status: 'NORMAL',
			id:0,
			image_id: null,
			image_style: 'CONTAIN',
			name: '',
			shadow_color: '#000000',
			sort_weight: 10,
			text_color: '#FFFFFF',
			text_style:'CENTER',
			type: '',
			updated: new Date(),
			updated_by_user_id: null,
		};
	}
	static item():Item
	{
		let date = new Date();
		return {
			id: 0,
			applicable_tax: 'DEFAULT',
			availability_type: 'ALWAYS',
			background: 'transparent',
			brand_id: null,
			category_id: null,
			clave_sat: null,
			code: null,
			commanda_type_id: null,
			commission: 0,
			commission_currency_id: 'MXN',
			commission_type: 'NONE',
			created: date,
			created_by_user_id: null,
			description: '',
			extra_name: '',
			form_id: null,
			for_reservation: 'NO',
			has_serial_number: 'NO',
			image_id: null,
			image_style: 'COVER',
			json_tags: [],
			measurement_unit: null,
			name: '',
			note_required: 'NO',
			on_sale: 'YES',
			partial_sale: 'NO',
			period_type: 'MONTHLY',
			product_id: null,
			provider_user_id: null,
			reference_currency_id: 'MXN',
			reference_price: 0,
			return_action: 'RETURN_TO_STOCK',
			shadow_color: '#000000',
			sort_weight: 1,
			status: 'ACTIVE',
			text_color: '#FFFFFF',
			text_style: 'CENTER',
			unidad_medida_sat_id: 'H87',
			updated: date,
			updated_by_user_id: null,
			currency_id: "",
			response_requirement_qty: "ONCE_PER_CLIENT",
			ieps_type: "RATE",
			ieps_value: 0,
			stock_type: "NORMAL",
			tax_percent: 0
		};
	}

	static order_info(rest:RestService,store:Store,price_type:Price_Type):OrderInfo
	{
		let tax_percent = 0;

		if( !rest.user )
		{
			throw new Error('No user');
		}

		let user = rest.user as User;

		let version_created = rest.getVersion();
		let items:OrderItemInfo[] = [];
		let order:Order = {
			id: 0,
			address: "",
			amount_paid: 0,
			ares: 0,
			client_name: "",
			marked_for_billing: 'NO',
			delivery_user_id: null,
			note: "",
			sat_codigo_postal: null,
			sat_pdf_attachment_id: null,
			sat_razon_social: null,
			authorized_by: null,
			cancellation_timestamp: null,
			billing_data_id: null,
			billing_address_id: null,
			city: "",
			delivery_status: 'PENDING',
			client_user_id: null,
			facturacion_code: "",
			paid_timetamp: null,
			sat_serie_consecutive: null,
			sat_receptor_rfc: '',
			sat_uso_cfdi: '',
			facturado: 'NO',
			guests: 1,
			lat: null,
			lng: null,
			cashier_user_id: user.id,
			created: new Date(),
			currency_id: 'MXN',
			cancellation_reason: '',
			cancelled_by_user_id: null,
			closed_timestamp: null,
			discount: 0,
			initial_payment: 0,
			sat_isr: 0,
			sat_ieps: 0,
			discount_calculated: 0,
			price_type_id: price_type.id,
			sat_forma_pago: '99',
			sat_serie: 'A',
			sat_factura_id: null,
			sat_exchange_rate: 1,
			sat_domicilio_fiscal_receptor: '',
			sat_regimen_fiscal_receptor: '',
			sat_regimen_capital_receptor: '',
			service_type: 'QUICK_SALE',
			status: 'PENDING',
			paid_status: 'PENDING',
			period_id: null,
			store_id: user.store_id as number,
			subtotal: 0,
			sync_id: rest.getSyncId(),
			system_activated: null,
			table_id: null,
			tag: '',
			tax: 0,
			tax_percent: 16,
			total: 0,
			updated: new Date(),
			version_created,
			version_updated: version_created,
			quote_id: null,
			sat_receptor_email: null,
			sat_xml_attachment_id: null,
			shipping_address_id: null,
			shipping_cost: 0,
			state: null,
			store_consecutive: null,
			suburb: null
		};

		let empty:OrderInfo = {
			items,
			order,
			//structured_items:[],
			cashier: rest.user,
			delivery_user: null,
			client: null,
			store,
			purchase: null,
			offers: [],
			price_type
		};
		return empty;
	}
	static shipping_info(): ShippingInfo
	{
		return {
			shipping: GetEmpty.shipping(),
			items: []
		};
	}
	static shipping(): Shipping
	{
		return {
			created: new Date(),
			created_by_user_id: null,
			date: '',
			delivery_timestamp: null,
			from_store_id: null,
			id:0,
			note: '',
			purchase_id: null,
			received_by_user_id : null,
			requisition_id : null,
			shipping_company: '',
			shipping_guide: '',
			status:'PENDING',
			to_store_id: 0,
			updated: new Date(),
			updated_by_user_id: 0,
		}
	}

	static process():Process
	{
		return {
			category_id:null,
    		created:new Date(),
    		generator_type:"ON_DEMAN",
    		id:0,
    		item_id:null,
    		json_tags:undefined,
    		name:'',
    		production_area_id:0,
    		status:'ACTIVE',
    		updated:new Date(),
		};
	}

	static reservation():ExtendedReservation
	{
		return {
			id:0,
			_end: '',
			address_id: null,
			client_name: '',
			created: new Date(),
			created_by_user_id: 0,
			condition:'ACTIVE',
			currency_id: 'MXN',
			note: '',
			price_type_id: 1,
			start: '',
			status:'ACTIVE',
			store_id: 0,
			updated: new Date(),
			updated_by_user_id: 0,
			user_id: null,
			_timestamp_next_delivery: null,
			_timestamp_next_return: null,
			_timestamp_next_dispatch_after: null,
			_to_schedule:0,
			_to_schedule_delivery :0,
			_to_schedule_return:0,
			_to_be_returned:0,
			_to_be_delivered:0,
			_to_assign:0,
			_return_assignments:0,
			_delivery_assignments:0,
			_count_items:0,
			_total_qty:0,
		};
	}

	static reservation_item():Reservation_Item
	{
		return {
			id:0,
			created: new Date(),
			delivered_qty: 0,
			end: null,
			item_id: 0,
			last_period_id: null,
			note: '',
			period_type: 'MONTHLY',
			price: 0,
			qty: 0,
			reservation_id: 0,
			returned_qty: 0,
			scheduled_delivery: null,
			scheduled_return: null,
			serial_item_id: 0,
			start: '',
			status:'ACTIVE',
			tax_included: 'YES',
			updated: new Date(),
		};
	}

	static reservation_item_info():ReservationItemInfo
	{
		return {
			reservation_item: GetEmpty.reservation_item(),
			item: GetEmpty.item(),
			serial_item: GetEmpty.item(),
			category: null,
			return_assignments: [],
			delivery_assignments: [],
			serials: [],
		};
	}

	static reservation_info():ReservationInfo
	{
		return {
			reservation: GetEmpty.reservation(),
			client_user: null,
			user: null,
			address: null,
			items: []
		};
	}

	static user():User
	{
		return {
			created: new Date(),
			created_by_user_id: null,
			credit_days: 0,
			credit_limit: 0,
			default_billing_address_id: null,
			default_shipping_address_id: null,
			email:'',
			id:0,
			image_id: null,
			lat: null,
			lng: null,
			name:'',
			password:'',
			phone:'',
			platform_client_id: null,
			points: 0,
			price_type_id: null,
			production_area_id: null,
			status:'ACTIVE',
			store_id: 0,
			type: 'CLIENT',
			updated: new Date(),
			updated_by_user_id: null,
			username:'',
			workshift_id: null,
		};
	}

	static address(): Address
	{
		return {
			address: null,
			city: null,
			country: null,
			created: new Date(),
			email: null,
			id: 0,
			lat: null,
			lng: null,
			name: '',
			note: null,
			phone: null,
			rfc: null,
			sat_regimen_capital: null,
			sat_regimen_fiscal: null,
			sat_uso_cfdi: null,
			state: null,
			status: 'ACTIVE',
			suburb: null,
			type: 'BILLING',
			updated: new Date(),
			user_id: 0,
			zipcode: null
		};
	}

	static user_permission():User_Permission
	{
		return {
			add_accounts:0,
			add_asistance:0,
			add_bills:0,
			add_commandas:0,
			add_consumptions:0,
			add_credit_limit:0,
			add_credit_sales:0,
			add_form:0,
			add_item_points:0,
			add_items:0,
			add_marbetes:0,
			add_merma:0,
			add_offers:0,
			add_payments:0,
			add_payroll:0,
			add_providers:0,
			add_purchases:0,
			add_requisition:0,
			add_roles:0,
			add_stock:0,
			add_user:0,
			advanced_order_search:0,
			approve_bill_payments:0,
			approve_requisition:0,
			asign_marbetes:0,
			caldos:0,
			cancel_closed_orders:0,
			cancel_ordered_item:0,
			cancel_payments:0,
			cancelar_factura:0,
			change_client_prices:0,
			created:new Date(),
			created_by_user_id:null,
			currency_rates:0,
			delete_draft_items:0,
			discounts:0,
			edit_billing_data:0,
			factura_global:0,
			facturar_orden:0,
			fullfill_orders:0,
			global_add_stock:0,
			global_bills:0,
			global_order_delivery:0,
			global_pos:0,
			global_prices:0,
			global_purchases:0,
			global_receive_shipping:0,
			global_requisition:0,
			global_send_shipping:0,
			global_stats:0,
			hades:0,
			is_provider:0,
			open_cashier_box_anytime:0,
			order_delivery:0,
			pay_bills:0,
			pay_payrolls:0,
			pos:0,
			preferences:0,
			price_types:0,
			print_pre_receipt:0,
			production:0,
			purchases:0,
			pv_returns:0,
			quotes:0,
			receive_shipping:0,
			reiniciar_facturacion:0,
			reports:0,
			return_money:0,
			send_shipping:0,
			shipping_receive_type:'CAPTURE_QTY',
			show_tables:0,
			stocktake:0,
			store_prices:0,
			updated:new Date(),
			updated_by_user_id:null,
			user_id:0,
			view_accounts:0,
			view_asistance:0,
			view_commandas:0,
			view_payroll:0,
			view_payrolls:0,
			view_reservations:0,
			view_responses:0,
			view_stock:0,
			view_stock_alerts:0,
		};
	}

	static user_extra_fields(user_id:number):User_Extra_Fields
	{
		return {
			id:0,
			user_id,
			json_fields:{},
		};
	}

	static preferences():Preferences
	{
		return {
			ask_for_guests_number:1,
			default_pos_availability_type:'ALWAYS',
			background_image_id:null,
			background_image_size:'cover',
			btn_primary_bg_color:'#000000',
			btn_primary_bg_color_hover:null,
			btn_primary_border_color:null,
			btn_primary_border_color_hover:'#000000',
			btn_primary_border_width:1,
			btn_primary_text_color:null,
			btn_primary_text_color_hover:null,
			btn_secondary_bg_color:null,
			btn_secondary_bg_color_hover:null,
			btn_secondary_border_color:null,
			btn_secondary_border_color_hover:null,
			btn_secondary_border_width:1,
			btn_secondary_text_color:null,
			btn_secondary_text_color_hover:null,
			button_border_radius:'0.5em',
			button_style:null,
			card_background_color:null,
			card_background_image_id:null,
			card_background_opacity:60,
			card_border_color:null,
			card_border_radius:'0.5em',
			charts_colors:'#000000',
			chat_upload_attachment_image_id:null,
			chat_upload_image_id:null,
			created:new Date(),
			currency_price_preference:'ONLY_DEFAULT_CURRENCY',
			default_cash_close_receipt:1,
			default_ticket_format:1,
			default_file_logo_image_id:null,
			default_input_type:'TACTILE',
			default_price_type_id:null,
			default_product_image_id:null,
			default_print_receipt:1,
			default_ticket_image_id:null,
			default_user_logo_image_id:null,
			display_categories_on_items:'YES',
			header_background_color:null,
			header_text_color:null,
			id:1,
			item_selected_background_color:'#000000',
			item_selected_text_color:'#FFFFFF',
			link_color:'#000000',
			login_background_image_id:null,
			login_background_image_size:'cover',
			login_image_id:null,
			logo_image_id:null,
			menu_background_color:'#FFFFFF',
			menu_background_image_id:null,
			menu_background_image_size:'cover',
			menu_background_type:'IMAGE',
			menu_color_opacity:60,
			menu_icon_color:'#000000',
			menu_text_color:'#000000',
			menu_title_color:'#000000',
			name:'',
			pv_bar_background_color:'#000000',
			pv_bar_text_color:'#FFFFFF',
			pv_bar_total_color:'#FFFFFF',
			pv_show_all_categories:'NO',
			pv_show_orders:'OPEN_SAME_DAY',
			radius_style:null,
			submenu_background_color:'#FFFFFF',
			submenu_color_opacity:80,
			submenu_icon_color:'#000000',
			submenu_text_color:'#000000',
			text_color:'#000000',
			titles_color:null,
			touch_size_button:'100px',
			update_prices_on_purchases:0,
			touch_text_color:'#FFFFFF',
			touch_text_shadow_color:'#000000',
			default_return_action:'RETURN_TO_STOCK',
			link_hover:'#000000',
			stock_negative_values_allowed:0,
			ecommerce_enabled:0,
			updated:new Date(),
			comex_enabled:0,
			offers_enabled:0,
			production_enabled:0,
			reservations_enabled:0,
			restaurant_enabled:0,
			user_attachments:"DISABLED",
			default_cash_close_type:"SIMPLE"
		};
	}

	static production_area():Production_Area
	{
		return {
			created: new Date(),
			id:0,
			store_id: 0,
			name:'',
			status:'ACTIVE',
			updated: new Date(),
		}
	}

	static production():Production
	{
		return {
			control: '',
			alternate_qty: 0,
			created: new Date(),
			created_by_user_id: 0,
			id: 0,
			item_id: 0,
			merma_qty: 0,
			merma_reason: '',
			produced: '',
			produced_by_user_id: null,
			production_area_id: 0,
			qty: 0,
			qty_reported: 0,
			store_id: 0,
			status: 'ACTIVE',
			updated: new Date(),
			verified_by_user_id: null,
		}
	}

	static production_area_item():Production_Area_Item
	{
		return {
			created: new Date(),
			id:0,
			item_id: 0,
			production_area_id: 0,
			status: 'ACTIVE',
			updated: new Date(),
		}
	}

	static payroll():Payroll
	{
		return{
			id:0,
			user_id:0,
			store_id:0,
			created_by_user_id:0,
			updated_by_user_id:0,
			start_date:'',
			end_date:'',
			status:'ACTIVE',
			created:new Date(),
			updated:new Date(),
			subtotal:0,
			total:0,
			paid_status:'PENDING',
			paid_timestamp:null
		}
	}

	static payroll_value():Payroll_Value
	{
		return {
			id:0,
			payroll_id:0,
			payroll_concept_id:0,
			description: '',
			type:'PERCEPTION',
			value:0,
			status:'ACTIVE',
		}
	}

	static payroll_info()
	{
		return {
			payroll: GetEmpty.payroll(),
			work_logs: [],
			payroll_concept_values: []
		}
	}

	static store():Store
	{
		return {
			address:"",
			accept_cash: 1,
			accept_transfer: 1,
			accept_credit_card: 1,
			accept_check: 1,
			business_name:'',
			city:'',
			lat: null,
			lng: null,
			client_user_id:null,
			created: new Date(),
			qr_size: 'PERCENT_100',
			created_by_user_id: null,
			default_billing_data_id: null,
			default_currency_id:'MXN',
			default_claveprodserv: '',
			default_sat_item_name: '',
			default_sat_serie: 'A',
			electronic_transfer_percent_fee: 0,
			autofacturacion_settings: 'DISABLED',
			autofacturacion_day_limit: 7,
			main_pc_ip:null,
			modo_facturacion: 'DESGLOSADA',
			id: 0,
			image_id: null,
			name:'',
			offline_search_enabled: 0,
			max_cash_amount:0,
			paypal_email: '',
			phone:'',
			pos_category_preferences:'DEFAULT_BY_PRODUCT',
			price_list_id: 0,
			printer_ticket_config:'',
			print_receipt_copies: 1,
			production_enabled: 0,
			rfc:'',
			sales_enabled: 1,
			show_facturacion_qr: 'NO',
			state:'',
			status:'DISABLED',
			suggested_tip: 0,
			tax_percent: 16,
			ticket_footer_text:'',
			ticket_image_id:null,
			updated: new Date(),
			updated_by_user_id : null,
			zipcode: ''
		}
	}

	static work_log_rules():Work_Log_Rules
	{
		return {
			id:0,
			store_id:0,
			json_rules:{}
		}
	}
	static item_online(): Item_Online
	{
		return {
			id: 0,
			created_by_user_id: 0,
			created: new Date(),
			item_id: 0,
			store_id: 0,
			preference: 'SHOW',
			updated_by_user_id: 0,
			updated: new Date(),
		};
	}

	static item_store(): any
	{
		return {
			id: 0,
			created_by_user_id: 0,
			created: new Date(),
			item_id: 0,
			store_id: 0,
			pos_preference: 'SHOW',
			is_available_online: null,
			updated_by_user_id: 0,
			updated: new Date(),
		};
	}

	static category_store(): any
	{
		return {
			id: 0,
			created_by_user_id: 0,
			created: new Date(),
			category_id: 0,
			store_id: 0,
			pos_preference: 'SHOW',
			updated_by_user_id: 0,
			updated: new Date(),
		};
	}
}

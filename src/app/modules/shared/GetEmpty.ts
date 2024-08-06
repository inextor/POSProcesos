import { ShippingInfo } from "./Models";
import { User_Permission,Preferences,Production_Area,Process, Production, Shipping, Store, Payroll, Payroll_Concept_Value, Work_log_rules, User_extra_fields, User, Production_Area_Item, Item, Category } from "./RestModels";

export class GetEmpty
{
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
			id:0,
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
			currency_id: null,
			description: '',
			extra_name: '',
			form_id: null,
			for_reservation:'NO',
			has_serial_number: 'NO',
			image_id: null,
			image_style:'COVER',
			json_tags:[],
			measurement_unit: null,
			name: '',
			note_required: 'NO',
			on_sale:'YES',
			partial_sale: 'NO',
			period_type: 'MONTHLY',
			product_id: null,
			provider_user_id: null,
			reference_currency_id: 'MXN',
			reference_price: 0,
			return_action: 'RETURN_TO_STOCK',
			shadow_color: '#000000',
			sort_weight: 1,
			status:'ACTIVE',
			text_color: '#FFFFFF',
			text_style: 'CENTER',
			unidad_medida_sat_id: 'H87',
			updated: date,
			updated_by_user_id:null,
		};
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
			created: new Date(),
			id:0,
			name:'',
			category_id: null,
			production_area_id:0,
			type: 'SALE_ITEM',
			item_id: null,
			status:'ACTIVE',
			updated: new Date(),
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
	static user_permission():User_Permission
	{
		return {
			add_asistance:0,
			add_bills:0,
			add_commandas:0,
			add_credit_sales:0,
			add_items:0,
			add_form:0,
			add_marbetes:0,
			add_payments:0,
			add_payroll:0,
			add_providers:0,
			add_purchases:0,
			add_requisition:0,
			add_stock:0,
			add_user:0,
			advanced_order_search:0,
			approve_bill_payments:0,
			asign_marbetes:0,
			caldos:0,
			cancel_closed_orders:0,
			cancel_ordered_item:0,
			change_client_prices:0,
			created: new Date(),
			created_by_user_id: null,
			currency_rates:0,
			discounts:0,
			edit_billing_data:0,
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
			pos:0,
			preferences:0,
			price_types:0,
			print_pre_receipt:0,
			production:0,
			purchases:0,
			pv_returns:0,
			quotes:0,
			receive_shipping:0,
			reports:0,
			shipping_receive_type: 'CAPTURE_QTY',
			show_tables:0,
			send_shipping:0,
			stocktake:0,
			store_prices:0,
			updated: new Date(),
			updated_by_user_id: null,
			user_id:0,
			view_asistance:0,
			view_commandas:0,
			view_payroll:0,
			view_responses:0,
			view_stock:0,
			view_stock_alerts:0
		};
	}

	static user_extra_fields(user_id:number):User_extra_fields
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
			ask_for_guests_number: 1,
			default_pos_availability_type: 'ALWAYS',
			background_image_id: null,
			background_image_size: 'cover',
			btn_primary_bg_color: '#000000',
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
			charts_colors: '#000000',
			chat_upload_attachment_image_id:null,
			chat_upload_image_id:null,
			created:new Date(),
			currency_price_preference:'ONLY_DEFAULT_CURRENCY',
			default_cash_close_receipt: 1,
			default_ticket_format: 1,
			default_file_logo_image_id:null,
			default_input_type:'TACTILE',
			default_price_type_id:null,
			default_product_image_id:null,
			default_print_receipt: 1,
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
			pv_show_all_categories: 'NO',
			pv_show_orders: 'OPEN_SAME_DAY',
			radius_style:null,
			submenu_background_color:'#FFFFFF',
			submenu_color_opacity:80,
			submenu_icon_color:'#000000',
			submenu_text_color:'#000000',
			text_color: '#000000',
			titles_color:null,
			touch_size_button: '100px',
			update_prices_on_purchases: 0,
			touch_text_color: '#FFFFFF',
			touch_text_shadow_color: '#000000',
			default_return_action: 'RETURN_TO_STOCK',
			link_hover:'#000000',
			stock_negative_values_allowed: 0,
			updated:new Date()
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
			created: new Date(),
			created_by_user_id: 0,
			id: 0,
			item_id: 0,
			merma_qty: 0,
			merma_reason: '',
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
		}
	}

	static payroll_concept_value():Payroll_Concept_Value
	{
		return {
			id:0,
			payroll_id:0,
			payroll_concept_id:0,
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
			address:'',
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

	static work_log_rules():Work_log_rules
	{
		return {
			id:0,
			store_id:0,
			json_rules:{}
		}
	}
}

/*GENERATED AUTOMATICALLY PLEASE DO NOT EDIT */

export interface Address{
	address:string | null;
	city:string | null;
	country:string | null;
	created:Date;
	email:string | null;
	id:number;
	lat:number | null;
	lng:number | null;
	name:string;
	note:string | null;
	phone:string | null;
	rfc:string | null;
	sat_regimen_capital:string | null;
	sat_regimen_fiscal:string | null;
	state:string | null;
	status:'ACTIVE'|'DELETED';
	suburb:string | null;
	type:'BILLING'|'SHIPPING'|'BILLING_AND_SHIPPING';
	updated:Date;
	user_id:number
	zipcode:string | null;
}
export interface Attachment{
	content_type:string;
	created:Date;
	file_type_id:number | null;
	filename:string | null;
	height:number | null;
	id:number;
	original_filename:string;
	size:number;
	status:'ACTIVE'|'DELETED';
	updated:Date;
	uploader_user_id:number | null;
	width:number | null;
}
export interface Bank_Account{
	account:string;
	alias:string;
	bank:string;
	bank_rfc:string | null;
	created:Date;
	currency:string;
	email:string | null;
	id:number;
	is_a_payment_method:'NO'|'YES';
	name:string;
	updated:Date;
	user_id:number | null;
}
export interface Bank_Movement{
	amount_received:number;
	bank_account_id:number | null;
	card_ending:string | null;
	client_user_id:number | null;
	created:Date;
	currency_id:string | null;
	id:number;
	invoice_attachment_id:number | null;
	note:string | null;
	origin_bank_name:string | null;
	paid_date:string | null;
	payment_id:number | null;
	provider_user_id:number | null;
	receipt_attachment_id:number | null;
	received_by_user_id:number | null;
	reference:string | null;
	status:'ACTIVE'|'DELETED';
	total:number;
	transaction_type:'CASH'|'CREDIT_CARD'|'DEBIT_CARD'|'CHECK'|'COUPON'|'TRANSFER'|'DISCOUNT'|'RETURN_DISCOUNT'|'PAYPAL';
	type:'expense'|'income';
	updated:Date;
}
export interface Bank_Movement_Bill{
	amount:number;
	bank_movement_id:number
	bill_id:number
	created:Date;
	currency_amount:number;
	currency_id:string;
	exchange_rate:number;
	id:number;
	updated:Date;
}
export interface Bank_Movement_Order{
	amount:number;
	bank_movement_id:number
	created:Date;
	created_by_user_id:number | null;
	currency_amount:number;
	currency_id:string | null;
	exchange_rate:number;
	id:number;
	order_id:number
	status:'ACTIVE'|'DELETED';
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Bill{
	accepted_status:'PENDING'|'ACCEPTED'|'REJECTED';
	amount_paid:number;
	aproved_by_user_id:number | null;
	bank_account_id:number | null;
	created:Date;
	currency_id:string | null;
	due_date:string | null;
	folio:string | null;
	id:number;
	invoice_attachment_id:number | null;
	name:string;
	note:string | null;
	organization_id:number | null;
	paid_by_user_id:number | null;
	paid_date:string | null;
	paid_status:'PENDING'|'PAID';
	paid_to_bank_account_id:number | null;
	pdf_attachment_id:number | null;
	provider_user_id:number | null;
	purchase_id:number | null;
	receipt_attachment_id:number | null;
	status:'DELETED'|'ACTIVE';
	store_id:number | null;
	total:number;
	updated:Date;
}
export interface Billing_Data{
	address:string | null;
	city:string | null;
	created:Date;
	created_by_user_id:number | null;
	id:number;
	password:string | null;
	porcentaje_ISR:number;
	precision:number;
	razon_social:string | null;
	regimen_capital:string | null;
	regimen_fiscal:string | null;
	remaining_credits:number | null;
	rfc:string;
	state:string | null;
	updated:Date;
	updated_by_user_id:number | null;
	usuario:string | null;
	zipcode:string | null;
}
export interface Box{
	created:Date;
	id:number;
	production_item_id:number | null;
	serial_number_range_end:number | null;
	serial_number_range_start:number | null;
	status:'ACTIVE'|'DELETED';
	store_id:number | null;
	type_item_id:number
	updated:Date;
}
export interface Box_Content{
	box_id:number
	id:number;
	initial_qty:number
	item_id:number
	qty:number
	serial_number_range_end:number | null;
	serial_number_range_start:number | null;
}
export interface Brand{
	created:Date;
	created_by_user_id:number | null;
	description:string | null;
	id:number;
	image_id:number | null;
	name:string;
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Cart_Item{
	created:Date;
	id:number;
	item_id:number
	qty:number | null;
	session_id:string | null;
	type:'IN_CART'|'BUY_LATER';
	updated:Date;
	user_id:number | null;
}
export interface Cash_Close{
	cash_on_hand:number;
	created:Date;
	created_by_user_id:number
	end:string;	// 'Hora de la dispositivo del cajero, No es una hora fiable, para hacer las cuentas solo sirve para imprimir el ticket',
	id:number;
	since:Date;
	start:string;	// 'Hora de la dispositivo del cajero, No es una hora fiable, para hacer las cuentas solo sirve para imprimir',
	updated:Date;
}
export interface Cashier_Withdrawal{
	amount:number;
	created:Date;
	currency_id:string;
	id:number;
	store_id:number
	user_id:number
}
export interface Category{
	background:string | null;
	code:string | null;
	created:Date;
	created_by_user_id:number | null;
	default_clave_prod_serv:string | null;
	display_status:'NORMAL'|'HIDDEN';
	id:number;
	image_id:number | null;
	image_style:'COVER'|'CONTAIN';
	name:string;
	shadow_color:string | null;
	sort_weight:number | null;
	text_color:string | null;
	text_style:'NEVER'|'CENTER'|'DOWN';
	type:string | null;
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Category_Store{
	category_id:number
	created:Date;
	created_by_user_id:number
	id:number;
	pos_preference:'SHOW'|'HIDE'|'DEFAULT';
	store_id:number
	updated:Date;
	updated_by_user_id:number
}
export interface Category_Tree{
	child_category_id:number
	created:Date;
	created_by_user_id:number
	depth:number
	id:number;
	parent_category_id:number
	path:string | null;
	updated:Date;
	updated_by_user_id:number
}
export interface Category_Type{
	TYPE:'PRODUCT_FOR_SALE'|'TOOL'|'RAW_MATERIAL';
	id:string;
}
export interface Check_In{
	created_by_user_id:number | null;
	current:number;
	id:number;
	timestamp_end:Date;
	timestamp_start:Date;
	updated_by_user_id:number | null;
	user_id:number
}
export interface Check_In_Raw{
	created:Date;
	created_by_user_id:number
	id:number;
	user_id:number
}
export interface Commanda{
	commanda_type_id:number
	has_sound:number;
	id:number;
	name:string;
	order_display_preferences:'ALL_ORDERS'|'COMMANDA_TYPE_ORDERS';
	print_preferences:'ONLY_DISPLAY'|'PRINT_PARTIAL'|'FULL_PRINT'|'PRINT_ONLY_NEW_ITEMS';
	printer_ip:string | null;
	printer_port:string | null;
	store_id:number
}
export interface Commanda_Type{
	created:Date;
	id:number;
	name:string;
	updated:Date;
}
export interface Currency{
	id:string;
	name:string;
}
export interface Currency_Rate{
	currency_id:string;
	id:number;
	rate:number;
	store_id:number
}
export interface File_Type{
	content_type:string;
	created:Date;
	extension:string | null;
	id:number;
	image_id:number | null;
	is_image:'NO'|'YES';
	name:string;
	updated:Date;
}
export interface Fund{
	amount:number;
	cashier_hour:string;	// 'Se usa para imprimir el corte de caja, esta hora no es segura para hacer comparaciones de rango los usuario suelen cambiar las horas de los dispositivos, y se afecta en los cambios de horario anualmente, pero es para la refererencia en el misma linea de tiempo',
	created:Date;
	created_by_user_id:number
	currency_id:string;
	id:number;
	store_id:number | null;
	updated:Date;
}
export interface Image{
	content_type:string;
	created:Date;
	filename:string;
	height:number
	id:number;
	is_private:number;
	original_filename:string | null;
	size:number
	uploader_user_id:number | null;
	width:number
}
export interface Ingredient{
	created:Date;
	created_by_user_id:number
	id:number;
	item_id:number | null;
	name:string;
	order_type:'ALL'|'TOGO'|'IN_PLACE'|'PICK_UP'|'QUICK_SALE';
	qty:number;
	stock_item_id:number | null;
	updated:Date;
	updated_by_user_id:number
}
export interface Item{
	applicable_tax:'DEFAULT'|'EXEMPT'|'PERCENT';
	availability_type:'ON_STOCK'|'BY_ORDER'|'ALWAYS';
	background:string | null;
	brand_id:number | null;
	category_id:number | null;
	clave_sat:string | null;
	code:string | null;
	commanda_type_id:number | null;
	commission:number | null;
	commission_currency_id:string | null;
	commission_type:'NONE'|'AMOUNT'|'PERCENT';
	created:Date;
	created_by_user_id:number | null;
	currency_id:string | null;
	description:string | null;
	extra_name:string | null;
	has_serial_number:'NO'|'YES';
	id:number;
	image_id:number | null;
	image_style:'COVER'|'CONTAIN';
	measurement_unit:string | null;
	name:string;
	note_required:'NO'|'YES';
	on_sale:'NO'|'YES';
	partial_sale:'NO'|'YES';
	product_id:number | null;
	provider_user_id:number | null;
	reference_price:number;
	return_action:'RETURN_TO_STOCK'|'ADD_TO_MERMA'|'TRANSFORM_INTO_ITEM';
	shadow_color:string | null;
	sort_weight:number | null;
	status:'ACTIVE'|'DELETED';
	text_color:string | null;
	text_style:'NEVER'|'CENTER'|'DOWN';
	unidad_medida_sat_id:string | null;
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Item_Attribute{
	id:number;
	item_id:number
	name:string;
	value:string;
}
export interface Item_Exception{
	created:Date;
	description:string;
	id:number;
	item_id:number
	list_as_exception:'YES'|'NO';
	order_type:'ALL'|'TOGO'|'IN_PLACE'|'PICK_UP'|'QUICK_SALE';
	stock_item_id:number | null;
	stock_qty:number;
	updated:Date;
}
export interface Item_Option{
	id:number;
	included_extra_qty:number
	included_options:number | null;
	item_id:number
	max_extra_qty:number | null;
	max_options:number | null;
	min_options:number | null;
	name:string;
	status:'ACTIVE'|'DELETED';
}
export interface Item_Option_Value{
	charge_type:'OPTIONAL'|'INCLUDED'|'EXTRA_CHARGE';
	extra_price:number;
	id:number;
	item_id:number
	item_option_id:number | null;
	max_extra_qty:number | null;
	portion_amount:number;
	price:number;
	status:'ACTIVE'|'DELETED';
}
export interface Item_Points{
	created:Date;
	created_by_user_id:number
	id:number;
	item_id:number
	points_percent:number
	updated:Date;
	updated_by_user_id:number
}
export interface Item_Recipe{
	created:Date;
	id:number;
	item_id:number
	parent_item_id:number
	portion_qty:number;
	print_on_recipe:'NO'|'YES';
	updated:Date;
}
export interface Item_Store{
	created:Date;
	created_by_user_id:number
	id:number;
	item_id:number
	pos_preference:'SHOW'|'HIDE'|'DEFAULT';
	store_id:number
	updated:Date;
	updated_by_user_id:number
}
export interface Keyboard_Shortcut{
	created:Date;
	created_by_user_id:number | null;
	id:number;
	key_combination:string;
	name:string;
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Merma{
	box_id:number | null;
	created:Date;
	created_by_user_id:number
	id:number;
	item_id:number
	note:string | null;
	price:number;
	qty:number
	shipping_id:number | null;
	store_id:number
	updated:Date;
}
export interface Notification_Token{
	created:Date;
	id:number;
	provider:string;
	status:'ACTIVE'|'DELETED';
	token:string;
	updated:Date;
	user_id:number
}
export interface Offer{
	category_id:number | null;
	coupon_code:string | null;
	created:Date;
	created_by_user_id:number
	description:string | null;
	discount:number;
	gift_item_id:number | null;
	hour_end:string;
	hour_start:string;
	id:number;
	image_id:number | null;
	is_cumulative:'NO'|'YES';
	is_valid_friday:number;
	is_valid_monday:number;
	is_valid_saturday:number;
	is_valid_sunday:number;
	is_valid_thursday:number;
	is_valid_tuesday:number;
	is_valid_wednesday:number;
	item_id:number | null;
	m:number | null;
	n:number | null;
	name:string | null;
	percent_qty:number | null;
	price:number;
	status:'ACTIVE'|'DELETED';
	store_id:number | null;
	type:'PERCENT_DISCOUNT'|'N_X_M'|'AMOUNT_DISCOUNT'|'GIFT'|'FIXED_PRICE';
	updated:Date;
	updated_by_user_id:number;
	valid_from:string;
	valid_thru:string;
}
export interface Order{
	address:string | null;
	amount_paid:number;
	ares:number | null;
	authorized_by:string | null;
	billing_address_id:number | null;
	billing_data_id:number | null;
	cancellation_reason:string | null;
	cancellation_timestamp:Date;
	cancelled_by_user_id:number | null;
	cashier_user_id:number | null;
	city:string | null;
	client_name:string | null;
	client_user_id:number | null;
	closed_timestamp:Date;
	created:Date;
	currency_id:string;
	delivery_status:'PENDING'|'SENT'|'DELIVERED'|'CANCELLED'|'READY_TO_PICKUP';
	delivery_user_id:number | null;
	discount:number;
	discount_calculated:number;
	facturacion_code:string;
	facturado:'NO'|'YES';
	guests:number | null;
	id:number;
	lat:number | null;
	lng:number | null;
	marked_for_billing:'YES'|'NO';
	note:string | null;
	paid_status:'PENDING'|'PAID'|'PARTIALLY_PAID';
	paid_timetamp:Date;
	price_type_id:number
	quote_id:number | null;
	sat_codigo_postal:string | null;
	sat_domicilio_fiscal_receptor:string | null;
	sat_forma_pago:string | null;
	sat_ieps:number;
	sat_isr:number;
	sat_pdf_attachment_id:number | null;
	sat_razon_social:string | null;
	sat_receptor_email:string | null;
	sat_receptor_rfc:string | null;
	sat_regimen_capital_receptor:string | null;
	sat_regimen_fiscal_receptor:string | null;
	sat_serie:string | null;
	sat_serie_consecutive:number | null;
	sat_uso_cfdi:string | null;
	sat_xml_attachment_id:number | null;
	service_type:'TOGO'|'IN_PLACE'|'PICK_UP'|'QUICK_SALE';
	shipping_address_id:number | null;
	shipping_cost:number;
	state:string | null;
	status:'PENDING'|'CANCELLED'|'ACTIVE'|'CLOSED';
	store_consecutive:number | null;
	store_id:number
	subtotal:number;
	suburb:string | null;
	sync_id:string | null;
	system_activated:Date;
	table_id:number | null;
	tag:string | null;
	tax:number;
	tax_percent:number;
	total:number;
	updated:Date;
	version_created:string | null;
	version_updated:string | null;
}
export interface Order_Item{
	commanda_id:number | null;
	commanda_status:'NOT_DISPLAYED'|'PENDING'|'DISMISSED';
	created:Date;
	created_by_user_id:number | null;
	delivered_qty:number;
	delivery_status:'PENDING'|'DELIVERED';
	discount:number;
	discount_percent:number | null;
	exceptions:string | null;
	has_separator:'NO'|'YES';
	id:number;
	id_payment:number | null;
	is_free_of_charge:'NO'|'YES';
	is_item_extra:'NO'|'YES';
	item_extra_id:number | null;
	item_group:number | null;
	item_id:number
	item_option_id:number | null;
	item_option_qty:number | null;
	note:string | null;
	offer_id:number | null;
	order_id:number
	original_unitary_price:number;
	paid_qty:number | null;
	preparation_status:'PENDING'|'IN_PREPARATION'|'READY'|'DELIVERED';
	price_id:number | null;
	qty:number;
	return_required:'NO'|'YES';
	status:'ACTIVE'|'DELETED';
	stock_status:'IN_STOCK'|'STOCK_REMOVED';
	subtotal:number;
	system_preparation_ended:Date;
	system_preparation_started:Date;
	tax:number;
	tax_included:'NO'|'YES';
	total:number;
	type:'NORMAL'|'REFUND';
	unitary_price:number;
	unitary_price_meta:number;
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Order_Item_Cost{
	child_items_cost:number;
	cost:number;
	created:Date;
	id:number;
	ingredients_cost:number;
	item_cost:number;
	item_id:number
	name:string;
	order_id:number
	order_item_id:number
	qty:number;
	sale_profit:number;
	sale_total:number;
	store_id:number
	total:number;
}
export interface Order_Item_Exception{
	created:Date;
	description:string;
	id:number;
	item_exception_id:number
	order_item_id:number
	stock_item_id:number | null;
	updated:Date;
}
export interface Order_Item_Serial{
	id:number;
	item_id:number
	order_item_id:number
	serial_id:number
}
export interface Order_Offer{
	amount:number;
	coupon_code:string;
	created:Date;
	created_by_user_id:number
	id:number;
	offer_id:number
	order_id:number
	updated:Date;
	updated_by_user_id:number
}
export interface Pallet{
	created:Date;
	created_by_user_id:number | null;
	id:number;
	production_item_id:number | null;
	store_id:number | null;
	updated:Date;
}
export interface Pallet_Content{
	box_id:number
	created:Date;
	created_by_user_id:number | null;
	id:number;
	pallet_id:number
	status:'ACTIVE'|'REMOVED';
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Parent_Process{
	child_process_id:number
	created:Date;
	id:number;
	parent_process_id:number
	updated:Date;
}
export interface Payment{
	change_amount:number;
	concept:string | null;
	created:Date;
	created_by_user_id:number | null;
	currency_id:string | null;
	exchange_rate:number;
	facturado:'YES'|'NO';
	id:number;
	paid_by_user_id:number | null;
	payment_amount:number;
	received_amount:number;
	sat_pdf_attachment_id:number | null;
	sat_uuid:string | null;
	sat_xml_attachment_id:number | null;
	status:'ACTIVE'|'DELETED';
	store_id:number | null;
	sync_id:string | null;
	tag:string | null;
	type:'income'|'expense';
	updated:Date;
}
export interface Paypal_Access_Token{
	access_token:string;
	created:Date;
	expires:Date;
	id:number;
	raw_response:string | null;
}
export interface Paypal_Order{
	buyer_user_id:number
	create_response:string;
	created:Date;
	id:string;
	log:string | null;
	order_id:number | null;
	status:string;
}
export interface Points_Log{
	client_user_id:number
	created:Date;
	created_by_user_id:number
	id:number;
	item_id:number
	order_id:number
	points:number;
	updated:Date;
}
export interface Post{
	created:Date;
	created_by_user_id:number
	id:number;
	images_ids:string;
	post:string;
	title:string;
	updated:Date;
	updated_by_user_id:number
}
export interface Preferences{
	ask_for_guests_number:number;
	background_image_id:number | null;
	background_image_size:'repeat'|'cover';
	btn_primary_bg_color:string | null;
	btn_primary_bg_color_hover:string | null;
	btn_primary_border_color:string | null;
	btn_primary_border_color_hover:string | null;
	btn_primary_border_width:number | null;
	btn_primary_text_color:string | null;
	btn_primary_text_color_hover:string | null;
	btn_secondary_bg_color:string | null;
	btn_secondary_bg_color_hover:string | null;
	btn_secondary_border_color:string | null;
	btn_secondary_border_color_hover:string | null;
	btn_secondary_border_width:number | null;
	btn_secondary_text_color:string | null;
	btn_secondary_text_color_hover:string | null;
	button_border_radius:string | null;
	button_style:string | null;
	card_background_color:string | null;
	card_background_image_id:number | null;
	card_background_opacity:number | null;
	card_border_color:string | null;
	card_border_radius:string | null;
	charts_colors:string | null;
	chat_upload_attachment_image_id:number | null;
	chat_upload_image_id:number | null;
	created:Date;
	currency_price_preference:'ONLY_DEFAULT_CURRENCY'|'MULTIPLE_CURRENCY';
	default_cash_close_receipt:number | null;
	default_file_logo_image_id:number | null;
	default_input_type:'TACTILE'|'KEYBOARD';
	default_pos_availability_type:'ALWAYS'|'ON_STOCK';
	default_price_type_id:number | null;
	default_print_receipt:number | null;
	default_product_image_id:number | null;
	default_return_action:'RETURN_TO_STOCK'|'ADD_TO_MERMA'|'TRANSFORM_TO_PRODUCT';
	default_ticket_format:number | null;
	default_ticket_image_id:number | null;
	default_user_logo_image_id:number | null;
	display_categories_on_items:'YES'|'NO';
	header_background_color:string | null;
	header_text_color:string | null;
	id:number;
	item_selected_background_color:string | null;
	item_selected_text_color:string | null;
	link_color:string | null;
	link_hover:string | null;
	login_background_image_id:number | null;
	login_background_image_size:'repeat'|'cover';
	login_image_id:number | null;
	logo_image_id:number | null;
	menu_background_color:string | null;
	menu_background_image_id:number | null;
	menu_background_image_size:'cover'|'repeat';
	menu_background_type:'IMAGE'|'COLOR';
	menu_color_opacity:number | null;
	menu_icon_color:string | null;
	menu_text_color:string | null;
	menu_title_color:string | null;
	name:string | null;
	pv_bar_background_color:string | null;
	pv_bar_text_color:string | null;
	pv_bar_total_color:string | null;
	pv_show_all_categories:'NO'|'YES';
	pv_show_orders:'ALL_OPEN'|'OPEN_SAME_DAY';
	radius_style:string | null;
	stock_negative_values_allowed:number;
	submenu_background_color:string | null;
	submenu_color_opacity:number | null;
	submenu_icon_color:string | null;
	submenu_text_color:string | null;
	text_color:string | null;
	titles_color:string | null;
	touch_size_button:string | null;
	touch_text_color:string | null;
	touch_text_shadow_color:string | null;
	update_prices_on_purchases:number | null;
	updated:Date;
}
export interface Price{
	created:Date;
	created_by_user_id:number | null;
	currency_id:string | null;
	id:number;
	item_id:number
	percent:number;
	price:number;
	price_list_id:number
	price_type_id:number
	tax_included:'NO'|'YES';
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Price_List{
	created:Date;
	created_by_user_id:number | null;
	id:number;
	name:string;
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Price_Log{
	created:Date;
	created_by_user_id:number
	id:number;
	item_id:number
	new_percent:number;
	new_price:number;
	old_percent:number;
	old_price:number;
	old_tax_included:'YES'|'NO';
	price_list_id:number
	price_type_id:number
	tax_included:'NO'|'YES';
	updated:Date;
}
export interface Price_Type{
	created:Date;
	id:number;
	model:'AMOUNT'|'PERCENT'|'ALL';
	name:string;
	show_bill_code:'YES'|'NO';
	sort_priority:number | null;
	tax_model:'TAX_INCLUDED'|'PLUS_TAX'|'ALL';
	type:'RETAIL'|'WHOLESALE';
	updated:Date;
	wholesale_min_qty:number;
	wholesale_type:'BY_ARTICLE'|'BY_CATEGORY';
}
export interface Process{
	category_id:number | null;
	created:Date;
	id:number;
	item_id:number | null;
	name:number
	production_area_id:number
	status:'ACTIVE'|'DELETED';
	type:'SALE_ITEM'|'SALE_CATEGORY'|'SHIPPING'|'SHIPPING_ITEM';
	updated:Date;
}
export interface Process_Status{
	created:Date;
	id:number;
	mark_task_as_done:number;
	name:string;
	process_id:number
	status:'ACTIVE'|'DELETED';
	updated:Date;
}
export interface Product{
	id:number;
	name:number
}
export interface Production{
	created:Date;
	created_by_user_id:number
	id:number;
	item_id:number
	merma_qty:number | null;
	produced_by_user_id:number
	qty:number
	store_id:number
	updated:Date;
	verified_by_user_id:number | null;
}
export interface Production_Area{
	created:Date;
	id:number;
	name:string;
	updated:Date;
}
export interface Production_Area_Item{
	created:Date;
	id:number;
	item_id:number
	production_area_id:number
	updated:Date;
}
export interface Purchase{
	created:Date;
	created_by_user_id:number | null;
	id:number;
	order_id:number | null;
	provider_name:string | null;
	provider_user_id:number | null;
	status:'ACTIVE'|'DELETED';
	stock_status:'PENDING'|'ADDED_TO_STOCK'|'SHIPPING_CREATED';
	store_id:number
	total:number;
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Purchase_Detail{
	created:Date;
	description:string | null;
	id:number;
	item_id:number
	purchase_id:number
	qty:number;
	serial_number:string | null;
	status:'ACTIVE'|'DELETED';
	stock_status:'PENDING'|'ADDED_TO_STOCK';
	total:number
	unitary_price:number;
	updated:Date;
}
export interface Push_Notification{
	app_path:string | null;
	body:string;
	created:Date;
	icon_image_id:number | null;
	id:number;
	link:string | null;
	object_id:string | null;
	object_type:string;
	priority:'normal'|'high';
	push_notification_id:string | null;
	read_status:'PENDING'|'READ';
	response:string | null;
	sent_status:number | null;
	title:string;
	updated:Date;
	user_id:number
}
export interface Quote{
	approved_status:'PENDING'|'SENT'|'DECLINED'|'APPROVED'|'CANCELLED';
	approved_time:string | null;
	attachment_id:number | null;
	client_user_id:number | null;
	created:Date;
	created_by_user_id:number
	email:string;
	id:number;
	name:string;
	phone:string;
	price_type_id:number | null;
	store_id:number
	sync_id:string;
	tax_percent:number;
	updated:Date;
	valid_until:string | null;
}
export interface Quote_Item{
	created:Date;
	discount:number;
	discount_percent:number;
	id:number;
	item_id:number
	original_unitary_price:number;
	provider_price:number;
	qty:number;
	quote_id:number
	status:'ACTIVE'|'DELETED';
	subtotal:number;
	tax:number;
	tax_included:'YES'|'NO';
	total:number;
	unitary_price:number;
	updated:Date;
}
export interface Requisition{
	created:Date;
	created_by_user_id:number | null;
	date:string | null;
	id:number;
	requested_to_store_id:number | null;
	required_by_store_id:number
	status:'PENDING'|'CANCELLED'|'NOT_APPROVED'|'SHIPPED';
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Requisition_Item{
	aproved_status:'NOT_APPROVED'|'APPROVED';
	created:Date;
	id:number;
	item_id:number
	qty:number
	requisition_id:number
	status:'ACTIVE'|'DELETED';
	updated:Date;
}
export interface Returned_Item{
	created:Date;
	id:number;
	item_id:number
	returned_qty:number
	returns_id:number
	total:number;
	updated:Date;
}
export interface Returns{
	amount_paid:number;
	cashier_user_id:number
	client_user_id:number | null;
	code:string;
	created:Date;
	id:number;
	note:string | null;
	order_id:number
	store_id:number
	total:number;
	updated:Date;
}
export interface Sat_Factura{
	created:Date;
	created_by_user_id:number | null;
	id:number;
	order_id:number | null;
	pdf_attachment_id:number
	updated:Date;
	updated_by_user_id:number | null;
	uuid:string;
	xml_attachment_id:number | null;
}
export interface Sat_Response{
	created:Date;
	created_by_user_id:number | null;
	id:number;
	id_order:number
	request:string | null;
	response:string | null;
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Serial{
	additional_data:string | null;
	created:Date;
	created_by_user_id:number | null;
	description:string | null;
	id:number;
	item_id:number
	serial_number:string;
	status:'ACTIVE'|'INACTIVE';
	store_id:number
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Serial_Image{
	created:Date;
	description:string | null;
	id:number;
	image_id:number
	serial_id:number
	updated:Date;
}
export interface Serie_Counter{
	counter:number | null;
	created:Date;
	id:string;
	updated:Date;
}
export interface Session{
	created:Date;
	id:string;
	status:'ACTIVE'|'INACTIVE';
	updated:Date;
	user_id:number | null;
}
export interface Shipping{
	created:Date;
	created_by_user_id:number | null;
	date:string | null;
	delivery_timestamp:string | null;
	from_store_id:number | null;
	id:number;
	note:string | null;
	purchase_id:number | null;
	received_by_user_id:number | null;
	requisition_id:number | null;
	shipping_company:string;
	shipping_guide:string;
	status:'PENDING'|'DELIVERED'|'SENT'|'CANCELLED';
	to_store_id:number
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Shipping_Item{
	box_id:number | null;
	created:Date;
	id:number;
	item_id:number | null;
	pallet_id:number | null;
	qty:number
	received_qty:number | null;
	requisition_item_id:number | null;
	serial_number:string | null;
	shipping_id:number
	shrinkage_qty:number | null;
	updated:Date;
}
export interface Stock_Alert{
	created:Date;
	created_by_user_id:number
	id:number;
	item_id:number
	max:number | null;
	min:number | null;
	store_id:number
	updated:Date;
	updated_by_user_id:number
}
export interface Stock_Record{
	created:Date;
	created_by_user_id:number
	description:string | null;
	id:number;
	is_current:number;
	item_id:number
	movement_qty:number;
	movement_type:'POSITIVE'|'NEGATIVE'|'ADJUSTMENT';
	order_item_id:number | null;
	previous_qty:number;
	production_item_id:number | null;
	purchase_detail_id:number | null;
	qty:number;
	serial_number_record_id:number | null;
	shipping_item_id:number | null;
	store_id:number
	updated:Date;
	updated_by_user_id:number
}
export interface Stocktake{
	created:Date;
	created_by_user_id:number | null;
	id:number;
	name:string | null;
	status:'ACTIVE'|'CLOSED';
	store_id:number
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Stocktake_Item{
	box_content_id:number | null;
	box_id:number | null;
	created:Date;
	created_by_user_id:number | null;
	creation_qty:number | null;
	current_qty:number | null;
	id:number;
	item_id:number | null;
	pallet_id:number | null;
	stocktake_id:number
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Stocktake_Scan{
	box_content_id:number | null;
	box_id:number | null;
	created:Date;
	created_by_user_id:number | null;
	id:number;
	item_id:number | null;
	pallet_id:number | null;
	qty:number
	stocktake_id:number
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Storage{
	created:Date;
	created_by_user_id:number | null;
	id:number;
	section:string;
	shelf:string;
	sort_order:number | null;
	store_id:number
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Storage_Item{
	created:Date;
	created_by_user_id:number | null;
	id:number;
	item_id:number
	storage_id:number
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Store{
	address:string | null;
	autofacturacion_day_limit:number | null;
	autofacturacion_enabled:'YES'|'NO';
	autofacturacion_settings:'ONLY_SAME_MONTH'|'ONLY_DAY_LIMIT'|'BOTH'|'DISABLED';
	business_name:string | null;
	city:string | null;
	client_user_id:number | null;
	created:Date;
	created_by_user_id:number | null;
	default_billing_data_id:number | null;
	default_claveprodserv:string | null;
	default_currency_id:string | null;
	default_sat_item_name:string | null;
	default_sat_serie:string | null;
	electronic_transfer_percent_fee:number;
	exchange_rate:number;
	id:number;
	image_id:number | null;
	lat:number | null;
	lng:number | null;
	main_pc_ip:string | null;
	max_cash_amount:number;
	modo_facturacion:'DESGLOSADA'|'COMPACTA';
	name:string | null;
	paypal_email:string | null;
	phone:string | null;
	pos_category_preferences:'DEFAULT_BY_PRODUCT'|'HIDE_BY_DEFAULT'|'SHOW_BY_DEFAULT';
	price_list_id:number | null;
	print_receipt:number | null;
	print_receipt_copies:number | null;
	printer_ticket_config:string | null;
	qr_size:'PERCENT_25'|'PERCENT_50'|'PERCENT_75'|'PERCENT_100';
	rfc:string | null;
	show_facturacion_qr:'NO'|'YES';
	state:string | null;
	status:'ACTIVE'|'DISABLED';
	suggested_tip:number | null;
	tax_percent:number;
	ticket_footer_text:string | null;
	ticket_image_id:number | null;
	updated:Date;
	updated_by_user_id:number | null;
	zipcode:string | null;
}
export interface Store_Bank_Account{
	bank_account_id:number
	created:Date;
	id:number;
	name:string;
	store_id:number
	updated:Date;
}
export interface Store_Sale_Report{
	amount_description:string;
	ares_order_ids:string;
	average_order_amount:number;
	created:Date;
	created_by_user_id:number
	date:string | null;
	discounts:number
	end:Date;
	expense_payments:number
	id:number;
	income_payments:number
	localtime_end:string;
	localtime_start:string;
	order_count:number
	order_ids:string;
	start:Date;
	store_consecutive:number
	store_id:number
	total_sales:number
	updated:Date;
	updated_by_user_id:number
}
export interface Table{
	attended_by_user_id:number | null;
	capacity:number | null;
	clean_status:'CLEAN'|'NEED_CLEANING';
	created:Date;
	created_by_user_id:number | null;
	id:number;
	is_dirty:'NO'|'YES';
	name:string;
	order_id:number | null;
	ordered_status:'PENDING'|'ORDERED';
	status:'ACTIVE'|'DELETED';
	store_id:number
	updated:Date;
	updated_by_user_id:number | null;
}
export interface Task{
	category_id:number | null;
	counter:number | null;
	created:Date;
	description:string;
	id:number;
	in_charge_user_id:number | null;
	is_done:number;
	item_id:number | null;
	order_id:number | null;
	over_extend_qty:number | null;
	parent_task_id:number | null;
	process_id:number
	process_status_id:number | null;
	qty:number | null;
	requisition_id:number | null;
	status:'ACTIVE'|'DELETED';
	updated:Date;
}
export interface Task_Comment{
	comment:string;
	created:Date;
	id:number;
	task_id:number
	type:'SYSTEM'|'USER';
	updated:Date;
	user_id:number | null;
}
export interface Unidad_Medida_Sat{
	descripcion:string | null;
	id:string;
	nombre:string;
}
export interface User{
	created:Date;
	created_by_user_id:number | null;
	credit_days:number | null;
	credit_limit:number;
	default_billing_address_id:number | null;
	default_shipping_address_id:number | null;
	email:string | null;
	id:number;
	image_id:number | null;
	lat:number | null;
	lng:number | null;
	name:string;
	password:string | null;
	phone:string | null;
	platform_client_id:number | null;
	points:number;
	price_type_id:number | null;
	status:'ACTIVE'|'DELETED';
	store_id:number | null;
	type:'CLIENT'|'USER';
	updated:Date;
	updated_by_user_id:number | null;
	username:string | null;
}
export interface User_Permission{
	add_bills:number;
	add_commandas:number;
	add_items:number;
	add_marbetes:number;
	add_payments:number;
	add_providers:number;
	add_purchases:number;
	add_requisition:number;
	add_stock:number;
	add_user:number;
	advanced_order_search:number;
	approve_bill_payments:number;
	asign_marbetes:number;
	caldos:number;
	cancel_closed_orders:number;
	cancel_ordered_item:number;
	change_client_prices:number;
	created:Date;
	created_by_user_id:number | null;
	currency_rates:number;
	discounts:number;
	edit_billing_data:number;
	fullfill_orders:number;
	global_add_stock:number;
	global_bills:number;
	global_order_delivery:number;
	global_pos:number;
	global_prices:number;
	global_purchases:number;
	global_receive_shipping:number;
	global_requisition:number;
	global_send_shipping:number;
	global_stats:number;
	hades:number;
	is_provider:number;
	open_cashier_box_anytime:number;
	order_delivery:number;
	pay_bills:number;
	pos:number;
	preferences:number;
	price_types:number;
	print_pre_receipt:number;
	production:number;
	purchases:number;
	pv_returns:number;
	quotes:number;
	receive_shipping:number;
	reports:number;
	send_shipping:number;
	stocktake:number;
	store_prices:number;
	updated:Date;
	updated_by_user_id:number | null;
	user_id:number
	view_commandas:number;
	view_stock:number;
}


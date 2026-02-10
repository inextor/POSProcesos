import { Address, Attachment, Bill, Cash_Close, Cash_Count, Bank_Movement, Bank_Movement_Order, Category, Delivery_Assignment, File_Type, Item, Item_Exception, Item_Option, Item_Option_Value, Offer, Order, Order_Item, Order_Item_Exception, Order_Item_Serial, Payment, Period, Price, Price_Type, Process, Production, Production_Area, Purchase, Purchase_Detail, Requisition, Requisition_Item, Reservation, Reservation_Item, Reservation_Item_Serial, Return_Assignment, Serial, Serial_Image, Shipping, Shipping_Item, Stock_Record, Store, Task, Transformation, Transformation_Input, Transformation_Output, User } from "./RestModels";

interface CSerial extends Serial
{
	store_name?:string;
}
export interface SearchTerm
{
	term: string;
	position: number;
	item_id: number;
}
export interface SerialInfo
{
	serial:CSerial;
	images:Serial_Image[];
	order_item_serial?:Order_Item_Serial;
	selected: boolean; //Just a help variable used in lists
}

export interface OrderItemInfo extends ItemInfo
{
	order_item:Order_Item; //Obligatorio
	created:Date;
	//serials:SerialInfo[];
	order_item_exceptions: Order_Item_Exception[];
	serials_string:string;
	commanda_type_id:number | null;
	draw_separator?:boolean;//Not in backend
	category_zero: number | null;
}

export interface OrderItemStructureInfo extends OrderItemInfo
{
	childs:OrderItemInfo[];
	total_options:number;
	total_cost:number;
}

export interface OrderInfo
{
	period?: Period;
	id?:number; //en offline
	order: Order; //Obligatorio
	items: OrderItemInfo[]; //Obligatorio
//	structured_items: OrderItemStructureInfo[]; //Obligatorio
//	resume_of_items?: OrderItemStructureInfo[];
	client: User | null;
	cashier: User | null;
	delivery_user: User | null;
	price_type: Price_Type;
	store: Store;
	purchase: Purchase | null;
	offers:Offer[];
}

export interface StructuredOrderInfo extends OrderInfo
{
	structured_items: OrderItemStructureInfo[]; //Obligatorio
}

export interface ProductionInfo
{
	user: User;
	production:Production;
	production_area: Production_Area | null;
	item:Item;
	category:Category | null;
}

export interface RequisitionItemInfo
{
	requisition_item:Requisition_Item;
	item: Item;
	category:Category | null;
}

export interface RequisitionInfo
{
	requisition:Requisition;
	items:RequisitionItemInfo[];
	required_by_store:Store;
	requested_to_store:Store|null;
	user:User;
	shipping:Shipping | null;
}


export interface SerialItemInfo
{
	serial_info:SerialInfo;
	item_info:ItemInfo;
}

export interface TaskInfo
{
	proccess	: Process;
	task		: Task;
	category	: Category | null;
	item		: Item | null;
	Order		: Order | null;
	OrderItem	: Order_Item | null;
	requisition	: Requisition | null;
	in_charge	: User | null;

}

export interface ShippingItemInfo
{
	item: Item;
	shipping_item:Shipping_Item;
	category:Category | null;
	available?:number;
}

export interface ShippingInfo
{
	shipping:Partial<Shipping>;
	items:Partial<ShippingItemInfo>[];
	//purchase:Purchase;
}
export interface SocketMessage
{
	type:string;
	store_id:number;
	order_id?:number;
	message?:string;
	id?:string | number;
}

export interface ReservationItemSerialInfo
{
	reservation_item_serial:Reservation_Item_Serial;
	serial:Serial;
}

export interface DeliveryAssignmentInfo
{
	delivery_assignment:Delivery_Assignment;
	user:User;
}

export interface ReturnAssignmentInfo
{
	return_assignment:Return_Assignment;
	user:User;
}

export interface ItemOptionValueInfo
{
	item_option_value: Item_Option_Value;
	item:Item;
	category?:Category;
}
export interface ItemOptionInfo
{
	item_option:Item_Option;
	values:ItemOptionValueInfo[];
}

export interface ItemInfo
{
	item:Item;
	category:Category | null;
	//product?:Product; //Category
	item_options:ItemOptionInfo[];
	//attributes?:Item_Attribute[];
	price?:Price;
	prices:Price[];
	records:Stock_Record[];
	stock_record?:Stock_Record;
	options:ItemOptionInfo[];
	exceptions:Item_Exception[];
	display_category?:boolean;
	serials:SerialInfo[];
}

//export interface ItemInfo
//{
//	item:Item;
//	category:Category | null;
//	category_zero: number;
//	//product?:Product; //Category
//	//item_options?:ItemOptionInfo[];
//	//attributes?:Item_Attribute[];
//
//	price:Price | undefined;
//	prices:Price[];
//	//records:Stock_Record[];
//	//stock_record:Stock_Record;
//	options:ItemOptionInfo[];
//	exceptions:Item_Exception[];
//	display_category?:boolean;
//	//serials:SerialInfo[];
//}

export interface ItemStockInfo extends ItemInfo
{
	total:number;
}

export interface ReservationItemInfo
{
	reservation_item:Reservation_Item;
	category:Category | null;
	item:Item;
	serial_item:Item;
	serials:ReservationItemSerialInfo[];
	return_assignments:ReturnAssignmentInfo[];
	delivery_assignments:DeliveryAssignmentInfo[];
}

//
export interface ExtendedReservation extends Reservation
{
	_end:string;
	_to_schedule:number;
	_to_schedule_delivery :number;
	_to_schedule_return:number;

	_to_be_returned:number | null;
	_to_be_delivered:number|null;

	_to_assign:number|null
	_return_assignments:number|null
	_delivery_assignments:number|null;

	_count_items:number; //Numbero de articulos en reserva actualmente, En caso de que modificaron los articulos este valor se actualizara
	_total_qty:number; //De esos articualos, cuantos de reservaron, En caso de que modificaron los articulos este valor se actualizara
	//Ej, si rentaron Solo 10 baños, _count_ items = 1 y _total_qty_ = 10
	//Si rentaron 10 baños y 10 cajas de papel, _count_ items = 2 y _total_qty_ = 20
	_timestamp_next_dispatch_after: Date | null;
	_timestamp_next_delivery:Date | null;
	_timestamp_next_return:Date | null;
}

export interface ReservationInfo
{
	client_user: User | null;
	reservation:ExtendedReservation;
	items:ReservationItemInfo[]
	user:User | null;
	address:Address | null;
}


export interface CashCountInfo
{
	currency_id: string;
	denomination: number;
	type: string;
	total_quantity: number;
	total_amount: number;
	total_cash_closes: number;
	first_date: string;
	last_date: string;
}

export interface MovementInfo
{
	bank_movement:Bank_Movement;
	bank_movement_orders:Bank_Movement_Order[];
}

export interface PaymentInfo
{
	payment:Payment;
	movements:MovementInfo[];
}

export interface AttachmentInfo
{
	attachment:Attachment;
	file_type?:File_Type;
}

export interface PurchaseDetailInfo
{
	purchase_detail:Purchase_Detail;
	item:Item;
	category:Category | null;
}

export interface PurchaseInfo
{
	purchase:Purchase;
	details:PurchaseDetailInfo[];
	bill:Partial<Bill>;
	shipping:Shipping | null;
	bank_movements_info:any[];
}

export interface ItemMovement
{
	item_id:number,
	item_name:string,
	item_code:string|null,
	reference_price:number,
	category_id:number|null,
	total_received:number,
	total_requested:number,
	total_merma:number,
	total_sold:number,
	sold_amount:number,
	total_produced:number
}

export interface TransformationInfo
{
	transformation: Transformation;
	provider_user: User | null;
	inputs: Transformation_Input[];
	outputs: Transformation_Output[];
}

import { Category, Delivery_Assignment, Item, ItemOptionInfo, Item_Exception, Offer, Order, Order_Item, Order_Item_Exception, Price, Price_Type, Process, Production, Purchase, Requisition, Requisition_Item, Reservation, Reservation_Item, Reservation_Item_Serial, Return_Assignment, Serial, SerialInfo, Shipping, Shipping_Item, Stock_Record, Store, Task, User } from "./RestModels";


export interface ItemInfo
{
	item:Item;
	category:Category | null;
	category_zero: number;
	//product?:Product; //Category
	//item_options?:ItemOptionInfo[];
	//attributes?:Item_Attribute[];

	price:Price | null;
	prices:Price[];
	//records:Stock_Record[];
	//stock_record:Stock_Record;
	options:ItemOptionInfo[];
	exceptions:Item_Exception[];
	display_category?:boolean;
	//serials:SerialInfo[];
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
}


export interface OrderInfo
{
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


export interface ProductionInfo
{
	user: User;
	production:Production;
	item:Item;
	category:Category | null;
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
	reservation:ExtendedReservation;
	items:ReservationItemInfo[]
	user:User | null;
}

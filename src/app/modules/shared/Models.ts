import { Category, Item, Order, Order_Item, Process, Production, Requisition, Requisition_Item, Reservation, Reservation_Item, Reservation_Item_Serial, Serial, Shipping, Shipping_Item, Store, Task, User } from "./RestModels";

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

export interface ReservationItemInfo
{
	reservation_item:Reservation_Item;
	category:Category | null;
	item:Item;
	serial_item:Item;
	serials:ReservationItemSerialInfo[];
}

export interface ReservationInfo
{
	reservation:Reservation;
	items:ReservationItemInfo[]
}

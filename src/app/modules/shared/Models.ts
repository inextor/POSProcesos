import { Category, Item, Order, Order_Item, Process, Production, Requisition, Requisition_Item, Shipping, Shipping_Item, Store, Task, User } from "./RestModels";

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
}

export interface ShippingInfo
{
	shipping:Shipping;
	items:ShippingItemInfo[];
	//purchase:Purchase;
}



import { Category, Item, Production, Requisition, Requisition_Item, Shipping, Store, User } from "./RestModels";

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

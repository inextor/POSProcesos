import { Rest, RestSimple } from "./Rest";

export interface DataRelation<T>
{
	rest:Rest<T,any>;
	source_field:string;
	target_field:keyof T;
	is_multiple?:boolean;
	name?:string;
	relations?:DataRelation<any>[];
	source_obj?:string;
	target_obj?:string;
	custom_map?:(data:any)=>any;
}

//jexport class RelationResponse<T>
//j{
//j	data_relations:DataRelation<any>[];
//j	data:T;
//j	total:number;
//j	compound:Record<string,any>;
//j}

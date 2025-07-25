import { RestSimple } from "./Rest";

export interface DataRelation<T>
{
	rest:RestSimple<T>;
	source_field:string;
	target_field:keyof T;
	is_multiple?:boolean;
	name?:string;
	relations?:DataRelation<any>[];
	source_obj?:string; target_obj?:string;
}

//jexport class RelationResponse<T>
//j{
//j	data_relations:DataRelation<any>[];
//j	data:T;
//j	total:number;
//j	compound:Record<string,any>;
//j}

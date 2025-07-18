# Gemini

# About components organization

almost all components extends from the base component, the base component is the component that contains the common methods,
all components that had routes muste be stored in src/app/pages there are exception because of a bad design,
but new onew all must be in src/app/pages and be generated by the cli ng generate component pages/{new-component-name}
all listings must the name and route must be of the form /list-{{name-of-the-model}}
to add a new record the components the name must be of the form add-{{name-of-the-model}},
the same component must be enable to edit the record, but the route must be of the form /edit-{{name-of-the-model}}/{{id-of-the-record

the component must be called save-{{name-of-the-model}}

for example for the model role the routes must be:

```
/add-role	 //To add new role
/edit-role/1  //To edit role with id 1
/save-role	//To save role
/list-role	//To list all roles
/list-role?eq.name=admin //To search all roles with name admin
```
# calls to backend

to call to the backen it's necessary to use a rest object this rest object must be intialized
with rest.initRest('{rest_model}')  or rest.initRestSimple('{rest_model}')

initRestSimple is used when the response is a simple object and all the search enabled properties are defined in the model

initRest is used when the response is a complex object and all the search enabled properties still are defined in the model,
but the response has the model defined in the response as a property and other related model properties. initRest must be
initialized with initRest('{{rest_model}}_info');


example:

```typescript

let rest_item = this.rest.initRestSimple<Item>('Item',[list_of_propeerties_to_be_enable_to_search_defined_in_item]);
//Item are the search model and ItemInfo is the response model
let rest_item_info = this.rest.initRest<Item,ItemInfo>('Item_info',[list_of_propeerties_to_be_enable_to_search_defined_in_item]);
```

```
a get by id example:

this.rest.getItem(id).subscribe((response)=>{
	this.item = response.data;
});
```

```
a get by search example:

//lt less than, gt greater than, eq equal, ne not equal,

let serach_object<Item> = {
	lt:{ created: new Date() },
	limit:10,
	offset:0
	sort_order:'id_ASC,name_DESC'
};


this.rest_item.search({}).subscribe((response:RestResponse<Item>)=>
{
	this.items = response.data;
});
```
The search object can be obtained from the rest object
```typescript
let s:SearchObject<Item> = this.rest_item.getEmptySearch();

//other way to get the search object

let s:SearchObject<Item> = this.rest_item.getEmptySearch();

```

the search can be made also with the params object, not recommended only for temporary use

```typescript
import { ParamMap } from '@angular/router';

this.rest_item.search(ParamMap).subscribe((response:RestResponse<Item>)=>
{
	this.items = response.data;
});
```

for listing the search with the object is the recommended way, so on the html part
can be used to add form controls to filter the search, the search methods is define in the base.component

```html
<form (submit)="search(search_object)" ngNativeValidate>
	<div class="row">
		<div class="col-4">
			<input type="text" class="form-control" name="name" [(ngModel)]="search_object.eq.name">
		</div>
		<div class="col-4">
			<button type="submit" class="btn btn-primary" value="Buscar">Search</button>
		</div>
	</div>
</form>
```

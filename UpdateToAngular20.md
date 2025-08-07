# Updating component from Angular 11 to 20


Use the new flow control syntax instead of the old one like *ngIf must use @if
for the rest declared on rest service use the initRest from the rest service

the variables of type Rest,RestSimple declared on the rest.service are not in the angular 20 version.
instead you must declare them in the component where will be used.

old one angular 11 on the rest.service

```typescript
//Old Angular 11 on the rest.service
Rest<Order,OrderInfo> order_info = this.initRest('order_info');

//Now Angular 20 must be on the component where will be used
Rest<Order,OrderInfo> rest_order_info = this.rest.initRest('order_info');

//Old Angular 11 on the component where will be used
this.rest.order_info.search(order_serch) 

//Now Angular 20 must be on the component where will be used
this.rest_order_info.search(order_serch)

```



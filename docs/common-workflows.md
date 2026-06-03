# Common Workflows

## Creating a New Page

1. Generate the component:
```
ng generate component pages/page-name
```

2. Add a lazy-loaded route in `app.routes.ts`:
```typescript
{
    path: 'route-path',
    loadComponent: () => import('./pages/page-name/page-name.component')
        .then(m => m.PageNameComponent),
    canActivate: [authGuard]
}
```

3. Extend `BaseComponent` for built-in functionality:
```typescript
export class PageNameComponent extends BaseComponent implements OnInit { ... }
```

## Working with REST APIs

### Initialize REST Endpoint
```typescript
let rest_entity = this.rest.initRestSimple<ModelType>('endpoint_name');
```

### Search Records
```typescript
rest_entity.search({}).subscribe(response => {
    this.entity_list = response.data;
});
```

### Search with Filters
```typescript
let search = this.getEmptySearch<ModelType>();
search.eq.status = 'ACTIVE';
search.lk.name = '%search_term%';
search.sort_order = ['name_ASC'];
rest_entity.search(search).subscribe(response => {
    this.entity_list = response.data;
});
```

### Get Single Record
```typescript
rest_entity.get(id).subscribe(response => {
    this.entity = response;
});
```

### Create / Update
```typescript
// Create
rest_entity.create(this.entity).subscribe(() => {
    this.rest.showSuccess('Created successfully');
    this.location.back();
});

// Update
rest_entity.update(this.entity).subscribe(() => {
    this.rest.showSuccess('Updated successfully');
    this.location.back();
});
```

### Delete
```typescript
rest_entity.delete(this.entity).subscribe(() => {
    this.rest.showSuccess('Deleted successfully');
});
```

## Handling Route Parameters

The standard save-page pattern:

```typescript
ngOnInit() {
    this.route.paramMap.pipe(
        mergeMap((paramMap) => forkJoin({
            entity: paramMap.has('id')
                ? this.entity_rest.get(paramMap.get('id'))
                : of(GetEmpty.entity_type()),
            // Load dependent data
            categories: this.rest.initRestSimple<Category>('category').search({})
        }))
    ).subscribe((response) => {
        this.is_loading = false;
        this.entity = response.entity;
        this.categories = response.categories.data;
    });
}
```

## Search with Query Parameters

Extract search parameters from URL query params:

```typescript
this.subs.sink = this.getQueryParamObservable().subscribe(params => {
    let search = this.getSearch<ModelType>(params, ['name', 'status']);
    this.search(search);
});
```

## Subscription Management

Uses `SubSink` (from `subsink` package) for automatic cleanup:

```typescript
ngOnInit() {
    this.subs.sink = this.rest_entity.search({}).subscribe(response => {
        this.entity_list = response.data;
    });
}

// No need to unsubscribe - BaseComponent handles it
```

## Error Handling

```typescript
// Show notifications
this.rest.showError(error);      // Red error toast
this.rest.showSuccess(message);  // Green success toast
this.rest.showWarning(message);  // Yellow warning toast

// Extract error string
let errorMsg = Utils.getErrorString(error);
```

## Date Handling

```typescript
// API expects MySQL UTC strings
let mysqlDate = Utils.getUTCMysqlStringFromDate(new Date());

// API returns MySQL strings - parse to Date
let date = Utils.getDateFromUTCMysqlString('2024-01-15 14:30:00');

// Display with Spanish formatting
let display = Utils.getDateString(date, true);

// Convert Date objects in payload before sending
let payload = Utils.transformDatesToString(myObject);
```

## Order Operations

```typescript
// Normalize order items
let normalizedItems = this.rest.normalizarOrderItems(orderItems);

// Create structured order info
let structured = this.rest.createStructuredItems(orderInfo);

// Build order with OrderBuilder
let builder = new OrderBuilder();
// ... add items, calculate totals
```

## File Uploads

```typescript
// Upload attachment
this.rest.uploadAttachment(file, isPrivate).subscribe(info => {
    // info contains attachment details
    this.entity.image_id = info.id;
});

// Get image URL
let imageUrl = this.rest.getImagePath(imageId);

// Get file URL
let fileUrl = this.rest.getFilePath(fileId, true); // download=true
```

## Reports

```typescript
// Get report data
this.rest.getReport('report_name', {
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    store_id: 1
}).subscribe(data => {
    // Process report data
});

// Report by path
this.rest.getReportByPath('reports/sales/summary', queryParams).subscribe(data => { ... });
```

## Sending Real-Time Notifications

```typescript
// Notify other clients about an update
this.rest.sendNotification('order', orderId);
this.rest.sendNotification('update', entityId);
```

## Accessing Build Info

```typescript
import { BuildInfo } from './modules/shared/BuildInfo';
console.log('Build timestamp:', BuildInfo.timestamp);
```

## External Scripts Usage

```typescript
// Excel utilities are available globally
// excelUtils.js is loaded via angular.json scripts

// Mapping functions
// maps.js is loaded via angular.json scripts
```

# Backend Search Skill

## Overview
This skill provides guidance on how to perform searches against the backend API using the `Rest` class in the POSReservaciones20 Angular application.

## Rest Class Location
`src/app/modules/shared/services/Rest.ts`

## SearchObject Interface

```typescript
interface SearchObject<T> {
  page: number;           // Page number (0-indexed)
  limit: number;          // Items per page
  eq: Partial<T>;         // Equals (=)
  gt: Partial<T>;         // Greater than (>)
  lt: Partial<T>;         // Less than (<)
  ge: Partial<T>;        // Greater or equal (>=)
  le: Partial<T>;        // Less or equal (<=)
  different: Partial<T>; // Different (!=)
  lk: Partial<T>;        // LIKE (text search)
  nn: string[];          // NOT NULL fields
  is_null: string[];     // IS NULL fields
  csv: CsvArray<T>;     // IN query (comma-separated values)
  start: Partial<T>;     // Starts with (prefix)
  ends: Partial<T>;      // Ends with (suffix)
  sort_order: string[]; // Sort order: 'field_ASC' or 'field_DESC'
  search_extra: Record<string, any>; // Extra search parameters
}
```

## Parameter Suffixes (Backend Mapping)

| Suffix | Operator | Example |
|--------|----------|---------|
| (none) | = | `eq.id=5` |
| `>` | > | `gt.price=100` |
| `<` | < | `lt.stock=10` |
| `>~` | >= | `ge.quantity=5` |
| `<~` | <= | `le.age=18` |
| `!` | != | `different.status=CANCELLED` |
| `~~` | LIKE | `lk.name=pizza` |
| `^` | LIKE 'value%' | `start.name=pro` |
| `$` | LIKE '%value' | `ends.name=ing` |
| `,` | IN | `csv.id=1,2,3` |
| `_NN` | NOT NULL | `_NN=field1,field2` |
| `_NULL` | IS NULL | `_NULL=field1,field2` |
| `_sort` | ORDER BY | `_sort=id_DESC,name_ASC` |

## Initializing Rest Endpoints

### Using RestService (in components)

```typescript
constructor(private rest: RestService) {}

// Simple endpoint with default fields
rest_entity = this.rest.initRestSimple<EntityType>('endpoint_name');

// With specific fields
rest_entity = this.rest.initRestSimple<EntityType>('endpoint_name', ['id', 'name', 'status']);

// Full endpoint with extra keys
rest_entity = this.rest.initRest<ModelType, ResponseType>('endpoint_name');
```

### Rest Class Methods

```typescript
// GET search
search(searchObj: Partial<SearchObject<T>>): Observable<RestResponse<T>>

// POST search
searchAsPost(searchObj: Partial<SearchObject<T>>): Observable<RestResponse<T>>

// Search with related entities
searchWithRelations(searchObj: Partial<SearchObject<T>>, relations: DataRelation<T>[]): Observable<RestResponse<any>>

// Fetch all pages
searchAll(searchObj: Partial<SearchObject<T>>, page_size?: number, as_post?: boolean): Observable<RestResponse<T>>

// Get empty search object
getEmptySearch(): SearchObject<T>

// Convert route query params to search object
getSearchObject(paramMap: ParamMap): SearchObject<T>
```

## Usage in List Components

### Basic Pattern

```typescript
import { Rest, SearchObject, RestResponse } from '../../modules/shared/services/Rest';
import { RestService } from '../../modules/shared/services/rest.service';
import { BaseComponent } from '../../modules/shared/shared/base/base.component';
import { mergeMap, of } from 'rxjs';

@Component({...})
export class ListExampleComponent extends BaseComponent implements OnInit {

  rest_entity: Rest<EntityType, EntityType>;
  search_object: SearchObject<EntityType>;
  entity_list: EntityType[] = [];

  constructor(private rest: RestService) {
    // Initialize REST endpoint
    this.rest_entity = this.rest.initRestSimple('entity_name', ['id', 'name', 'status']);
    this.search_object = this.rest_entity.getEmptySearch();
  }

  ngOnInit() {
    this.subs.sink = this.getQueryParamObservable().pipe(
      mergeMap(([query_params, param_map]) => {
        // Convert route query params to search object
        let search = this.rest_entity.getSearchObject(query_params);
        
        // Or manually create search object
        // let search = { eq: { status: 'ACTIVE' }, page: 0, limit: 50 };
        
        return this.rest_entity.search(search);
      })
    ).subscribe({
      next: (response: RestResponse<EntityType>) => {
        this.entity_list = response.data;
      },
      error: (error) => {
        this.showError(error);
      }
    });
  }
}
```

### Search Examples

```typescript
// 1. Simple equality
{ eq: { status: 'ACTIVE' } }

// 2. Text search (LIKE)
{ lk: { name: 'pizza' } }

// 3. Multiple values (IN)
{ csv: { id: [1, 2, 3] } }

// 4. Combined search
{ 
  eq: { status: 'ACTIVE', type: 'PRODUCT' },
  lk: { name: 'burger' },
  page: 0,
  limit: 50,
  sort_order: ['name_ASC', 'created_DESC']
}

// 5. Date range
{ 
  ge: { created: new Date('2024-01-01') },
  lt: { created: new Date('2024-12-31') }
}

// 6. Not null / Null checks
{ 
  nn: ['deleted_at'],
  is_null: ['parent_id']
}

// 7. With extra search params
{ 
  search_extra: { category_name: 'electronics' },
  eq: { status: 'ACTIVE' }
}
```

### Using Relations

```typescript
// Define relations
let storeRelation = this.rest_store.getRelation('store_id');
let itemRelation = this.rest_item_info.getRelation('item_id');
itemRelation.source_field = 'item_id';
itemRelation.target_field = 'id';
itemRelation.target_obj = 'item';

let relations = [storeRelation, itemRelation];

// Search with relations
this.rest_item_store.searchWithRelations(search_object, relations).subscribe({
  next: (response) => {
    // response.data contains merged objects with relations
    // Each item has: { entity_name: item, relation_name: related_data }
  }
});
```

## Complete Component Example

```typescript
import { Component, OnInit } from '@angular/core';
import { RestService } from '../../modules/shared/services/rest.service';
import { BaseComponent } from '../../modules/shared/shared/base/base.component';
import { Rest, SearchObject, RestResponse } from '../../modules/shared/services/Rest';
import { mergeMap } from 'rxjs';

interface MyEntity {
  id: number;
  name: string;
  status: string;
}

@Component({
  selector: 'app-list-entity',
  templateUrl: './list-entity.component.html',
  standalone: true
})
export class ListEntityComponent extends BaseComponent implements OnInit {

  rest_entity: Rest<MyEntity, MyEntity>;
  search_object: SearchObject<MyEntity>;
  entity_list: MyEntity[] = [];

  constructor(private rest: RestService) {
    this.rest_entity = this.rest.initRestSimple<MyEntity>('entity_name', ['id', 'name', 'status']);
    this.search_object = this.rest_entity.getEmptySearch();
  }

  ngOnInit() {
    this.subs.sink = this.getQueryParamObservable().pipe(
      mergeMap(([query_params, param_map]) => {
        let search = this.rest_entity.getSearchObject(query_params);
        return this.rest_entity.search(search);
      })
    ).subscribe({
      next: (response: RestResponse<MyEntity>) => {
        this.entity_list = response.data;
        this.is_loading = false;
      },
      error: (error) => {
        this.showError(error);
        this.is_loading = false;
      }
    });
  }

  // Manual search method
  search(term: string, status: string = 'ACTIVE') {
    let search = {
      lk: { name: term },
      eq: { status: status },
      page: 0,
      limit: 50,
      sort_order: ['name_ASC']
    } as Partial<SearchObject<MyEntity>>;

    this.rest_entity.search(search).subscribe({
      next: (response) => {
        this.entity_list = response.data;
      }
    });
  }
}
```

## Common Patterns

### Pagination
```typescript
// Page size is default 50, but can be overridden
let search = this.rest_entity.getEmptySearch();
search.page = 0;
search.limit = 25;

// Or in query params: ?page=0&limit=25
```

### Sorting
```typescript
// Single sort
search.sort_order = ['name_ASC'];

// Multiple sorts
search.sort_order = ['status_ASC', 'name_ASC'];
```

### Filtering from Form
```typescript
// In component
search(term: string) {
  let search = this.rest_entity.getEmptySearch();
  
  if (term) {
    search.lk = { name: term, description: term };
  }
  
  search.eq = { status: 'ACTIVE' };
  search.page = 0;
  
  this.rest_entity.search(search).subscribe(...);
}
```

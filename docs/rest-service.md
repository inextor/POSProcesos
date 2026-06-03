# REST Service

## RestService

**File:** `src/app/modules/shared/services/rest.service.ts`

Central service for all API communication, application state, session management, real-time updates, and offline support.

### Initialization

```typescript
constructor(private rest: RestService) {}

// Initialize a REST endpoint
let rest = this.rest.initRestSimple<ModelType>('endpoint_name');

// Search records
rest_entity.search({}).subscribe(response => {
  this.entity_list = response.data;
});

// Get single record
rest_entity.get(id).subscribe(response => {
  this.entity = response;
});

// Create record
rest_entity.create(data).subscribe(response => {
  // handle success
});

// Update record
rest_entity.update(data).subscribe(response => {
  // handle success
});

// Delete record
rest_entity.delete(data).subscribe(response => {
  // handle success
});
```

### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `socket` | `Socket \| null` | Socket.IO client instance |
| `socket_is_connected` | `boolean` | Socket connection status |
| `local_db` | `any` | IndexedDB reference |
| `path` | `string` | API path from environment |
| `domain_configuration` | `object` | Auto-detected domain config |
| `updates` | `Observable<SocketMessage>` | Real-time update stream |
| `user` | `User \| null` | Current logged-in user |
| `user_permission` | `User_Permission` | Current user permissions |
| `preferences` | `Preferences` | User preferences |
| `is_offline` | `boolean` | Offline mode flag |
| `show_menu` | `boolean` | Menu visibility toggle |
| `url_base` | `string` | Base URL for API calls |
| `url_platform` | `string` | Platform API URL |

### REST Initialization Methods

```typescript
// Standard REST (typed response + model)
initRest<T, U>(path: string, fields?: string[], extra_keys?: string[]): Rest<T, U>

// Simple REST (same type for response and model)
initRestSimple<T>(path: string, fields?: string[], extra_keys?: string[]): RestSimple<T>

// Platform REST
initRestPlatform<T, U>(path: string, fields?: string[], extra_keys?: string[])
```

### API Methods (direct calls)

```typescript
// Generic API update
update<T>(method: string, data: any): Observable<T>

// Reservation-specific updates
reservationUpdates<T>(method: string, data: any): Observable<T>

// SAT invoice replay
replayFactura(sat_factura_id: number): Observable<Sat_Factura>

// Reports
getReport(report_name: string, query: Record<string, any>): Observable<any>
getReportByPath(report_name: string, query: any): Observable<any>
```

### File / Image Helpers

```typescript
// Upload file attachment
uploadAttachment(file: File, is_private?: boolean): Observable<AttachmentInfo>

// Get image URL
getImagePath(...image_ids: number[]): string

// Get file URL
getFilePath(file_id: number, download?: boolean): string

// Get platform image URL
getPlatformImagePath(image1_id: number): string

// Get login logo URL
getLoginLogo(): string
```

### Session Management

```typescript
getUserFromSession(): User | null
getPreferencesFromSession(): Preferences
getPreferencesInfo(): Promise<Preferences>
getSessionStart(): Date
getSyncId(): string
getVersion(): string
logout(redirect?: boolean): void
```

### UI Helpers

```typescript
showError(error: any): void
showSuccess(msg: string): void
showWarning(msg: string): void
applyTheme(): void
hideMenu(): void
toggleMenu(): void
```

### Offline

```typescript
forceSyncOfflineItems(): Promise<any>
get is_offline(): boolean
set is_offline(b: boolean)
```

## Rest\<U, T\>

**File:** `src/app/modules/shared/services/Rest.ts`

Low-level API client class instantiated by `RestService`.

### Methods

| Method | Description |
|--------|-------------|
| `get(id)` / `getAsPromise(id)` | Fetch single record |
| `getAll()` | Fetch all records |
| `search(so)` | Search with SearchObject filter |
| `searchAsPost(so)` | POST-based search |
| `searchAll(obj_search, page_size, as_post)` | Recursively fetch all pages |
| `create(obj)` / `createAsPromise(obj)` | Create record |
| `update(obj)` / `updateAsPromise(obj)` | Update record |
| `delete(obj)` / `deleteT(obj)` | Delete record |
| `batchCreate(obj[])` | Batch create |
| `batchUpdate(obj[])` | Batch update |
| `batchUpdateJSON(obj[])` | Batch update (JSON) |
| `getParamsFromSearch(searchObj)` | Convert SearchObject to HttpParams |

### SearchObject Interface

```typescript
export interface SearchObject<T> {
    page: number;
    limit: number;
    eq: Partial<T>;         // Equals
    gt: Partial<T>;         // Greater than
    lt: Partial<T>;         // Less than
    ge: Partial<T>;         // Greater or equal
    le: Partial<T>;         // Less or equal
    different: Partial<T>;  // Not equal
    lk: Partial<T>;         // LIKE
    nn: string[];            // Not null columns
    is_null: string[];       // Null columns
    sort_order: string[];    // e.g. ['name_ASC', 'id_DESC']
    csv: CsvArray<T>;        // IN clause (comma-separated values)
    start: Partial<T>;       // Starts with
    ends: Partial<T>;        // Ends with
    search_extra: Record<string, string | number | null | Date>
}
```

### Search Parameter Suffixes (map to SQL operators)

| Suffix | SQL |
|--------|-----|
| no suffix | `=` |
| `_eq` | `=` |
| `_gt` | `>` |
| `_lt` | `<` |
| `_ge` | `>=` |
| `_le` | `<=` |
| `_different` | `!=` |
| `_lk` | `LIKE` |
| `_nn` | `IS NOT NULL` |
| `_is_null` | `IS NULL` |
| `_csv` | `IN` |
| `_start` | `LIKE 'value%'` |
| `_ends` | `LIKE '%value'` |

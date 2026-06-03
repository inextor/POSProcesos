# Core Classes

## BaseComponent

**File:** `src/app/modules/shared/base/base.component.ts`

All page components extend `BaseComponent`, which provides common functionality:

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `subs` | `SubSink` | new SubSink() | Automatic subscription management |
| `is_loading` | `boolean` | false | Loading state flag |
| `current_page` | `number` | 0 | Current pagination page |
| `path` | `string` | '' | API path for the entity |
| `total_pages` | `number` | 0 | Total pages for pagination |
| `total_items` | `number` | 0 | Total items count |
| `pages` | `number[]` | [] | Array of page numbers |
| `page_size` | `number` | 50 | Items per page |

### Injected Services

All injected via `Injector` (manual injection):

| Service | Property | Description |
|---------|----------|-------------|
| `RestService` | `rest` | API communication |
| `ActivatedRoute` | `route` | Current route info |
| `Router` | `router` | Navigation |
| `Location` | `location` | Browser location |
| `Title` | `title_service` | Page title management |
| `ConfirmationService` | `confirmation` | Modal confirmations |

### Methods

| Method | Description |
|--------|-------------|
| `setPages(current_page, totalItems)` | Calculate pagination pages |
| `showError(error)` | Display error notification |
| `showSuccess(msg)` | Display success notification |
| `showWarning(msg)` | Display warning notification |
| `setTitle(newTitle)` | Set browser page title |
| `getQueryParamObservable()` | Get query parameter observable |
| `getParamsAndQueriesObservable()` | Get params + query params |
| `getSearch<T>(param_map, fields, extra_keys)` | Build SearchObject from query params |
| `getEmptySearch<T>()` | Get empty SearchObject |
| `search(item_search)` | Execute search with force reload |
| `searchNoForceReload(item_search)` | Execute search without force reload |
| `sort(header, search)` | Apply sort to search |
| `applySortOrderFromArray(header, sort_order)` | Apply sort from array |
| `onDateChange(date, obj, attr, hour, seconds)` | Handle date input changes |

## Utils

**File:** `src/app/modules/shared/Utils.ts`

Static utility class for date transformations, error handling, and general helpers.

### Date Methods

| Method | Description |
|--------|-------------|
| `getLocalDateFromMysqlString(str)` | Parse MySQL datetime string to local Date |
| `getEndOfMonth(date)` | Get end of month |
| `getDateFromUTCMysqlString(str)` | Parse UTC MySQL string to Date |
| `getDateFromLocalMysqlString(str)` | Parse string as local MySQL date |
| `getLocalMysqlStringFromDate(d)` | Format Date as local MySQL string |
| `getUTCMysqlStringFromDate(d)` | Format Date as UTC MySQL string |
| `getFullRelativeDateString(value)` | Relative date (e.g., "Ene 15, 02:30pm") |
| `dateCountDownDate(value)` | Countdown between dates |
| `getRelativeDateString(value)` | Shorter relative date |
| `getDateString(value, include_time?)` | Format with Spanish month names |
| `areSameDay(date1, date2)` | Check if same day |

### Other Methods

| Method | Description |
|--------|-------------|
| `getErrorString(error)` | Extract readable error string |
| `transformJson(response)` | JSON.parse with date reviver |
| `createDictionary(obj_list, index)` | Create lookup dictionary from array |
| `truncate(value, decimals?)` | Truncate number |
| `transformDatesToString(body)` | Recursively convert Date objects to MySQL strings |
| `cleanDuplicates(array)` | Remove duplicates |
| `distanceTo(point_a, point_b)` | Haversine distance in meters |

### Classes / Interfaces

- `ErrorMessage` - Structured error with count, message, type, color
- `Coordinates` - `{lat: number, lng: number}`
- `KeyboardShortcutEvent` - Keyboard event with shortcut info

## GetEmpty

**File:** `src/app/modules/shared/GetEmpty.ts`

Facade class that provides factory functions for creating empty model objects. Each property delegates to a factory function in `src/app/modules/shared/Empties/`.

### Factory Properties

| Property | Empty Model |
|----------|-------------|
| `item_info` | `ItemInfo` |
| `role` | `Role` |
| `role_item_price` | `Role_Item_Price` |
| `price` | `Price` |
| `order_item` | `Order_Item` |
| `orderItemInfo` | `OrderItemInfo` |
| `period` | `Period` |
| `order_info` | `OrderInfo` |
| `shipping_info` | `ShippingInfo` |
| `shipping` | `Shipping` |
| `process` | `Process` |
| `reservation` | `Reservation` |
| `reservation_item` | `Reservation_Item` |
| `reservation_item_info` | `ReservationItemInfo` |
| `reservation_info` | `ReservationInfo` |
| `user` | `User` |
| `address` | `Address` |
| `user_permission` | `User_Permission` |
| `user_extra_fields` | `User_Extra_Fields` |
| `preferences` | `Preferences` |
| `production_area` | `Production_Area` |
| `production` | `Production` |
| `production_area_item` | `Production_Area_Item` |
| `payroll` | `Payroll` |
| `payroll_value` | `Payroll_Value` |
| `payroll_info` | `PayrollInfo` |
| `store` | `Store` |
| `work_log_rules` | `Work_Log_Rules` |
| `item_online` | `Item_Online` |
| `item_store` | `Item_Store` |
| `item_provider` | `Item_Provider` |
| `item_transform` | `Item_Transform` |
| `category_store` | `Category_Store` |
| `category` | `Category` |
| `item` | `Item` |
| `price_type` | `Price_Type` |
| `printer` | `Printer` |
| `transformation` | `Transformation` |
| `transformation_input` | `Transformation_Input` |
| `transformation_output` | `Transformation_Output` |
| `transformation_info` | `TransformationInfo` |
| `storage_type` | `Storage_Type` |

## OrderBuilder

**File:** `src/app/modules/shared/OrderBuilder.ts`

Builder class for constructing `OrderInfo` objects. Handles:
- Adding/removing order items
- Calculating totals (subtotal, discount, tax)
- Managing currency rates
- Creating empty order structures
- Price calculation with different price types
